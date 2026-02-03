import express from 'express';
import cors from 'cors';
import EventSource from 'eventsource';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Store active MCP connections
const activeConnections = new Map();

/**
 * MCPToXiaozhiBridge - Converts SSE from MCP servers to WebSocket for Xiaozhi
 */
class MCPToXiaozhiBridge {
  constructor(mcpServerUrl, xiaozhiWssUrl, connectionId, options = {}) {
    this.mcpServerUrl = mcpServerUrl;
    this.xiaozhiWssUrl = xiaozhiWssUrl;
    this.connectionId = connectionId;
    this.eventSource = null;
    this.xiaozhiWs = null;
    this.isMcpConnected = false;
    this.isXiaozhiConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.headers = options.headers || {};
    this.messageQueue = [];
    this.createdAt = new Date().toISOString();
  }

  /**
   * Connect to both MCP server (SSE) and Xiaozhi (WebSocket)
   */
  async connect() {
    try {
      console.log(`[${this.connectionId}] 🔄 Starting bridge connection...`);
      
      // Connect to Xiaozhi WebSocket first
      await this.connectToXiaozhi();
      
      // Then connect to MCP SSE
      await this.connectToMCP();
      
      console.log(`[${this.connectionId}] ✅ Bridge fully connected!`);
      
    } catch (error) {
      console.error(`[${this.connectionId}] ❌ Failed to establish bridge:`, error);
      this.disconnect();
      throw error;
    }
  }

  /**
   * Connect to Xiaozhi WebSocket endpoint
   */
  async connectToXiaozhi() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[${this.connectionId}] 🔌 Connecting to Xiaozhi: ${this.xiaozhiWssUrl}`);
        
        this.xiaozhiWs = new WebSocket(this.xiaozhiWssUrl);

        this.xiaozhiWs.on('open', () => {
          console.log(`[${this.connectionId}] ✅ Connected to Xiaozhi WebSocket`);
          this.isXiaozhiConnected = true;
          resolve();
        });

        this.xiaozhiWs.on('message', (data) => {
          try {
            const message = data.toString();
            console.log(`[${this.connectionId}] 📨 Received from Xiaozhi:`, message);
            
            // Store in message queue
            this.messageQueue.push({
              timestamp: new Date().toISOString(),
              direction: 'xiaozhi_to_bridge',
              data: message
            });

            // Keep only last 100 messages
            if (this.messageQueue.length > 100) {
              this.messageQueue.shift();
            }
          } catch (error) {
            console.error(`[${this.connectionId}] Error processing Xiaozhi message:`, error);
          }
        });

        this.xiaozhiWs.on('error', (error) => {
          console.error(`[${this.connectionId}] ❌ Xiaozhi WebSocket error:`, error);
          if (!this.isXiaozhiConnected) {
            reject(new Error('Failed to connect to Xiaozhi WebSocket'));
          }
        });

        this.xiaozhiWs.on('close', (code, reason) => {
          console.log(`[${this.connectionId}] 🔌 Xiaozhi WebSocket closed. Code: ${code}, Reason: ${reason}`);
          this.isXiaozhiConnected = false;
          this.handleReconnect();
        });

        this.xiaozhiWs.on('ping', () => {
          this.xiaozhiWs.pong();
        });

      } catch (error) {
        console.error(`[${this.connectionId}] Failed to create Xiaozhi WebSocket:`, error);
        reject(error);
      }
    });
  }

  /**
   * Connect to MCP server via SSE
   */
  async connectToMCP() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[${this.connectionId}] 📡 Connecting to MCP server: ${this.mcpServerUrl}`);
        
        const eventSourceInitDict = {};
        if (Object.keys(this.headers).length > 0) {
          eventSourceInitDict.headers = this.headers;
        }

        this.eventSource = new EventSource(this.mcpServerUrl, eventSourceInitDict);

        this.eventSource.onopen = () => {
          console.log(`[${this.connectionId}] ✅ Connected to MCP server`);
          this.isMcpConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.eventSource.onmessage = async (event) => {
          await this.handleMCPMessage(event);
        };

        this.eventSource.onerror = (error) => {
          console.error(`[${this.connectionId}] ❌ MCP connection error:`, error);
          
          if (!this.isMcpConnected) {
            reject(new Error('Failed to establish MCP connection'));
          } else {
            this.handleReconnect();
          }
        };

        // Listen for specific MCP event types
        const eventTypes = [
          'tool_call',
          'tool_response',
          'tool_result',
          'message',
          'notification',
          'request',
          'response',
          'error',
          'ping',
          'pong'
        ];

        eventTypes.forEach(eventType => {
          this.eventSource.addEventListener(eventType, async (event) => {
            await this.handleMCPMessage(event, eventType);
          });
        });

      } catch (error) {
        console.error(`[${this.connectionId}] Failed to connect to MCP:`, error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming MCP messages and forward to Xiaozhi
   */
  async handleMCPMessage(event, eventType = 'message') {
    try {
      let data;
      
      // Parse the event data
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        // If not JSON, treat as plain text
        data = { 
          type: eventType,
          content: event.data,
          timestamp: new Date().toISOString()
        };
      }

      console.log(`[${this.connectionId}] 📦 Received from MCP (${eventType}):`, JSON.stringify(data, null, 2));

      // Add metadata
      const enrichedData = {
        ...data,
        eventType,
        connectionId: this.connectionId,
        receivedAt: new Date().toISOString(),
        source: 'mcp'
      };

      // Forward to Xiaozhi WebSocket
      await this.forwardToXiaozhi(enrichedData);
      
      // Store in message queue
      this.messageQueue.push({
        timestamp: new Date().toISOString(),
        direction: 'mcp_to_xiaozhi',
        data: enrichedData
      });

      // Keep only last 100 messages
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift();
      }

    } catch (error) {
      console.error(`[${this.connectionId}] ❌ Error handling MCP message:`, error);
      
      this.messageQueue.push({
        timestamp: new Date().toISOString(),
        direction: 'error',
        error: error.message,
        data: event.data
      });
    }
  }

  /**
   * Forward data to Xiaozhi WebSocket
   */
  async forwardToXiaozhi(data) {
    try {
      if (!this.isXiaozhiConnected || !this.xiaozhiWs || this.xiaozhiWs.readyState !== WebSocket.OPEN) {
        throw new Error('Xiaozhi WebSocket is not connected');
      }

      const message = JSON.stringify(data);
      console.log(`[${this.connectionId}] 🚀 Forwarding to Xiaozhi:`, message);
      
      this.xiaozhiWs.send(message);
      console.log(`[${this.connectionId}] ✅ Message sent to Xiaozhi`);

    } catch (error) {
      console.error(`[${this.connectionId}] ❌ Error forwarding to Xiaozhi:`, error.message);
      throw error;
    }
  }

  /**
   * Send manual message to Xiaozhi
   */
  async sendToXiaozhi(data) {
    return this.forwardToXiaozhi({
      ...data,
      sentVia: 'manual',
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle reconnection logic
   */
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[${this.connectionId}] ⚠️ Max reconnect attempts reached. Giving up.`);
      this.disconnect();
      return;
    }

    this.reconnectAttempts++;
    console.log(`[${this.connectionId}] 🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

    setTimeout(() => {
      this.connect().catch(err => {
        console.error(`[${this.connectionId}] Reconnect failed:`, err);
      });
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from both MCP and Xiaozhi
   */
  disconnect() {
    console.log(`[${this.connectionId}] 🔌 Disconnecting bridge...`);
    
    if (this.eventSource) {
      this.eventSource.close();
      this.isMcpConnected = false;
      this.eventSource = null;
    }

    if (this.xiaozhiWs) {
      if (this.xiaozhiWs.readyState === WebSocket.OPEN) {
        this.xiaozhiWs.close();
      }
      this.isXiaozhiConnected = false;
      this.xiaozhiWs = null;
    }

    console.log(`[${this.connectionId}] ✅ Bridge disconnected`);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connectionId: this.connectionId,
      mcpServerUrl: this.mcpServerUrl,
      xiaozhiWssUrl: this.xiaozhiWssUrl,
      isMcpConnected: this.isMcpConnected,
      isXiaozhiConnected: this.isXiaozhiConnected,
      isFullyConnected: this.isMcpConnected && this.isXiaozhiConnected,
      reconnectAttempts: this.reconnectAttempts,
      messageCount: this.messageQueue.length,
      createdAt: this.createdAt,
      uptime: Math.floor((Date.now() - new Date(this.createdAt).getTime()) / 1000)
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(limit = 50) {
    return this.messageQueue.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearMessageHistory() {
    this.messageQueue = [];
  }
}

// ==================== API ROUTES ====================

/**
 * Root endpoint - API documentation
 */
app.get('/', (req, res) => {
  res.json({
    name: 'MCP-Xiaozhi Bridge',
    version: '2.0.0',
    description: 'Cloud middleware to bridge MCP servers (SSE) with Xiaozhi (WebSocket)',
    endpoints: {
      'GET /': 'API documentation',
      'GET /health': 'Health check',
      'GET /connections': 'List all active connections',
      'GET /connection/:id': 'Get specific connection details',
      'GET /connection/:id/messages': 'Get message history for a connection',
      'POST /connect': 'Create new bridge connection',
      'POST /send/:id': 'Send message to Xiaozhi through bridge',
      'DELETE /disconnect/:id': 'Disconnect bridge',
      'DELETE /connections': 'Disconnect all bridges'
    },
    example: {
      xiaozhi: 'wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN',
      connect: {
        mcpServerUrl: 'https://your-mcp-server.com/sse',
        xiaozhiWssUrl: 'wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN'
      }
    },
    activeConnections: activeConnections.size
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  const connections = Array.from(activeConnections.values());
  const fullyConnected = connections.filter(b => b.isMcpConnected && b.isXiaozhiConnected).length;

  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    connections: {
      total: activeConnections.size,
      fullyConnected,
      partiallyConnected: activeConnections.size - fullyConnected
    },
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

/**
 * List all connections
 */
app.get('/connections', (req, res) => {
  const connections = Array.from(activeConnections.values()).map(bridge => 
    bridge.getStatus()
  );
  
  res.json({ 
    count: connections.length,
    connections 
  });
});

/**
 * Get specific connection details
 */
app.get('/connection/:connectionId', (req, res) => {
  const { connectionId } = req.params;
  const bridge = activeConnections.get(connectionId);

  if (!bridge) {
    return res.status(404).json({ 
      error: 'Connection not found',
      connectionId 
    });
  }

  res.json({
    success: true,
    connection: bridge.getStatus()
  });
});

/**
 * Get message history for a connection
 */
app.get('/connection/:connectionId/messages', (req, res) => {
  const { connectionId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  const bridge = activeConnections.get(connectionId);

  if (!bridge) {
    return res.status(404).json({ 
      error: 'Connection not found',
      connectionId 
    });
  }

  res.json({
    success: true,
    connectionId,
    messageCount: bridge.messageQueue.length,
    messages: bridge.getMessageHistory(limit)
  });
});

/**
 * Clear message history for a connection
 */
app.delete('/connection/:connectionId/messages', (req, res) => {
  const { connectionId } = req.params;
  const bridge = activeConnections.get(connectionId);

  if (!bridge) {
    return res.status(404).json({ 
      error: 'Connection not found',
      connectionId 
    });
  }

  bridge.clearMessageHistory();

  res.json({
    success: true,
    message: 'Message history cleared',
    connectionId
  });
});

/**
 * Create new bridge connection
 * POST /connect
 * Body: {
 *   "mcpServerUrl": "https://your-mcp-server.com/sse",
 *   "xiaozhiWssUrl": "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN",
 *   "headers": { "Authorization": "Bearer token" } // optional for MCP
 * }
 */
app.post('/connect', async (req, res) => {
  try {
    const { mcpServerUrl, xiaozhiWssUrl, xiaozhiToken, headers, options } = req.body;

    // Build Xiaozhi URL if token is provided separately
    let finalXiaozhiUrl = xiaozhiWssUrl;
    if (!finalXiaozhiUrl && xiaozhiToken) {
      finalXiaozhiUrl = `wss://api.xiaozhi.me/mcp/?token=${xiaozhiToken}`;
    }

    // Validation
    if (!mcpServerUrl || !finalXiaozhiUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['mcpServerUrl', 'xiaozhiWssUrl OR xiaozhiToken'],
        received: Object.keys(req.body),
        example: {
          mcpServerUrl: 'https://your-mcp-server.com/sse',
          xiaozhiWssUrl: 'wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN'
        }
      });
    }

    // Validate URLs
    try {
      new URL(mcpServerUrl);
      new URL(finalXiaozhiUrl);
      
      // Check if Xiaozhi URL is WebSocket
      if (!finalXiaozhiUrl.startsWith('ws://') && !finalXiaozhiUrl.startsWith('wss://')) {
        throw new Error('Xiaozhi URL must be a WebSocket URL (wss:// or ws://)');
      }
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        details: error.message 
      });
    }

    // Generate unique connection ID
    const connectionId = `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create bridge instance
    const bridge = new MCPToXiaozhiBridge(
      mcpServerUrl, 
      finalXiaozhiUrl, 
      connectionId,
      { headers, ...options }
    );

    // Connect to both MCP and Xiaozhi
    await bridge.connect();
    
    // Store connection
    activeConnections.set(connectionId, bridge);

    console.log(`[${connectionId}] ✅ Bridge created successfully`);

    res.json({
      success: true,
      connectionId,
      message: 'Bridge connection established between MCP and Xiaozhi',
      status: bridge.getStatus(),
      instructions: {
        send: `POST /send/${connectionId}`,
        status: `GET /connection/${connectionId}`,
        messages: `GET /connection/${connectionId}/messages`,
        disconnect: `DELETE /disconnect/${connectionId}`
      }
    });

  } catch (error) {
    console.error('❌ Error creating bridge:', error);
    res.status(500).json({ 
      error: 'Failed to create bridge connection',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Send message to Xiaozhi through bridge
 * POST /send/:connectionId
 * Body: { your message data }
 */
app.post('/send/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const data = req.body;

    const bridge = activeConnections.get(connectionId);
    
    if (!bridge) {
      return res.status(404).json({ 
        error: 'Connection not found',
        connectionId,
        hint: 'Use GET /connections to see active connections'
      });
    }

    if (!bridge.isXiaozhiConnected) {
      return res.status(503).json({ 
        error: 'Xiaozhi WebSocket is not connected',
        connectionId,
        status: bridge.getStatus()
      });
    }

    // Send to Xiaozhi
    await bridge.sendToXiaozhi(data);

    res.json({
      success: true,
      connectionId,
      message: 'Message sent to Xiaozhi',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message
    });
  }
});

/**
 * Disconnect bridge
 * DELETE /disconnect/:connectionId
 */
app.delete('/disconnect/:connectionId', (req, res) => {
  const { connectionId } = req.params;

  const bridge = activeConnections.get(connectionId);
  
  if (!bridge) {
    return res.status(404).json({ 
      error: 'Connection not found',
      connectionId
    });
  }

  // Disconnect and remove
  bridge.disconnect();
  activeConnections.delete(connectionId);

  console.log(`[${connectionId}] 🔌 Bridge disconnected and removed`);

  res.json({
    success: true,
    message: 'Bridge connection disconnected',
    connectionId,
    remainingConnections: activeConnections.size
  });
});

/**
 * Bulk disconnect - disconnect all bridges
 * DELETE /connections
 */
app.delete('/connections', (req, res) => {
  const count = activeConnections.size;
  
  activeConnections.forEach(bridge => {
    bridge.disconnect();
  });
  
  activeConnections.clear();

  res.json({
    success: true,
    message: 'All bridge connections disconnected',
    disconnectedCount: count
  });
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    hint: 'Use GET / to see available endpoints'
  });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVER STARTUP ====================

const server = app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log('🌉 MCP-Xiaozhi Bridge Server Started!');
  console.log('========================================');
  console.log(`📡 Server running on port: ${PORT}`);
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Documentation: http://localhost:${PORT}/`);
  console.log('========================================');
  console.log('🔌 WebSocket support: ENABLED');
  console.log('📡 SSE support: ENABLED');
  console.log('========================================\n');
});

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
  });

  console.log(`Disconnecting ${activeConnections.size} active bridge(s)...`);
  activeConnections.forEach((bridge, id) => {
    console.log(`Disconnecting ${id}...`);
    bridge.disconnect();
  });
  activeConnections.clear();

  console.log('✅ All connections closed. Exiting...');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
