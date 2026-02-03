# MCP-Xiaozhi Bridge 🌉

**Production-ready cloud middleware** that bridges MCP servers (SSE) with Xiaozhi's WebSocket endpoint.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## 🎯 What It Does

This bridge connects cloud-based MCP servers to **Xiaozhi's WebSocket endpoint** without any local installation. Perfect for integrating MCP tools with Xiaozhi!

**Key Features:**
1. ✅ Connects MCP servers via SSE (Server-Sent Events)
2. ✅ Forwards events to Xiaozhi via WebSocket (WSS)
3. ✅ Supports Xiaozhi token authentication
4. ✅ Manages multiple concurrent bridges
5. ✅ Auto-reconnects on failures
6. ✅ Message history and debugging

## 🚀 Quick Deploy (No Local Setup!)

### Deploy to Vercel (2 minutes)

1. **Fork this repository**
2. Go to [Vercel](https://vercel.com)
3. Click **"New Project"** → Import your fork
4. Click **"Deploy"**
5. **Done!** Your bridge is live!

## 📖 How to Use

### Step 1: Get Your Xiaozhi Token

Your Xiaozhi WebSocket URL looks like:
```
wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: Create a Bridge

```bash
curl -X POST https://your-bridge.vercel.app/connect \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServerUrl": "https://your-mcp-server.com/sse",
    "xiaozhiWssUrl": "wss://api.xiaozhi.me/mcp/?token=YOUR_XIAOZHI_TOKEN"
  }'
```

**Or provide token separately:**
```bash
curl -X POST https://your-bridge.vercel.app/connect \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServerUrl": "https://your-mcp-server.com/sse",
    "xiaozhiToken": "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "success": true,
  "connectionId": "bridge-1234567890-abc123",
  "message": "Bridge connection established between MCP and Xiaozhi",
  "status": {
    "connectionId": "bridge-1234567890-abc123",
    "isMcpConnected": true,
    "isXiaozhiConnected": true,
    "isFullyConnected": true
  }
}
```

### Step 3: Messages Flow Automatically!

Once connected, the bridge will:
- Listen to MCP server events (SSE)
- Forward them to Xiaozhi (WebSocket)
- Handle reconnections automatically

### Step 4: Send Manual Messages (Optional)

```bash
curl -X POST https://your-bridge.vercel.app/send/bridge-1234567890-abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "content": "Hello Xiaozhi!"
  }'
```

## 🔌 Complete Example

```bash
# 1. Create bridge
curl -X POST https://your-bridge.vercel.app/connect \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServerUrl": "https://your-mcp-server.com/sse",
    "xiaozhiWssUrl": "wss://api.xiaozhi.me/mcp/?token=YOUR_TOKEN"
  }'

# Save the connectionId from response

# 2. Check status
curl https://your-bridge.vercel.app/connection/bridge-1234567890-abc123

# 3. View messages
curl https://your-bridge.vercel.app/connection/bridge-1234567890-abc123/messages

# 4. Send manual message (optional)
curl -X POST https://your-bridge.vercel.app/send/bridge-1234567890-abc123 \
  -H "Content-Type: application/json" \
  -d '{"type":"test","message":"Hello!"}'

# 5. Disconnect when done
curl -X DELETE https://your-bridge.vercel.app/disconnect/bridge-1234567890-abc123
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API documentation |
| GET | `/health` | Health check |
| GET | `/connections` | List all bridges |
| GET | `/connection/:id` | Get bridge details |
| GET | `/connection/:id/messages` | Get message history |
| POST | `/connect` | Create bridge |
| POST | `/send/:id` | Send to Xiaozhi |
| DELETE | `/disconnect/:id` | Disconnect bridge |

## 💻 Code Examples

### JavaScript/Node.js

```javascript
const BRIDGE_URL = 'https://your-bridge.vercel.app';

// Create bridge
async function createBridge(mcpUrl, xiaozhiToken) {
  const response = await fetch(`${BRIDGE_URL}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mcpServerUrl: mcpUrl,
      xiaozhiToken: xiaozhiToken
    })
  });
  
  const data = await response.json();
  console.log('Bridge created:', data.connectionId);
  return data.connectionId;
}

// Send message
async function sendToXiaozhi(connectionId, message) {
  const response = await fetch(`${BRIDGE_URL}/send/${connectionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  
  return await response.json();
}

// Usage
const connectionId = await createBridge(
  'https://your-mcp-server.com/sse',
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...'
);

await sendToXiaozhi(connectionId, {
  type: 'query',
  content: 'Hello Xiaozhi!'
});
```

### Python

```python
import requests

BRIDGE_URL = 'https://your-bridge.vercel.app'

# Create bridge
def create_bridge(mcp_url, xiaozhi_token):
    response = requests.post(
        f'{BRIDGE_URL}/connect',
        json={
            'mcpServerUrl': mcp_url,
            'xiaozhiToken': xiaozhi_token
        }
    )
    data = response.json()
    return data['connectionId']

# Send message
def send_to_xiaozhi(connection_id, message):
    response = requests.post(
        f'{BRIDGE_URL}/send/{connection_id}',
        json=message
    )
    return response.json()

# Usage
connection_id = create_bridge(
    'https://your-mcp-server.com/sse',
    'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...'
)

send_to_xiaozhi(connection_id, {
    'type': 'query',
    'content': 'Hello Xiaozhi!'
})
```

## 🏗️ Architecture

```
┌─────────────────┐         ┌───────────────────────┐         ┌──────────────┐
│   MCP Server    │         │  MCP-Xiaozhi Bridge   │         │   Xiaozhi    │
│      (SSE)      │ ──SSE──▶│    (Middleware)       │ ──WSS──▶│  WebSocket   │
│                 │         │                       │         │              │
│  - Events       │         │  - SSE Listener       │         │  - Processes │
│  - Tool calls   │         │  - WS Forwarder       │         │  - Responds  │
│  - Responses    │         │  - Auto-reconnect     │         │  - Actions   │
└─────────────────┘         └───────────────────────┘         └──────────────┘
```

## ✨ Key Features

### Core
- ✅ **Zero Local Installation** - Deploy to cloud
- ✅ **WebSocket Support** - Direct Xiaozhi integration
- ✅ **SSE Support** - MCP server connection
- ✅ **Token Authentication** - Xiaozhi token support
- ✅ **Multiple Bridges** - Run many connections

### Advanced
- 🔄 **Auto-Reconnect** - Handles disconnections
- 📊 **Message History** - Track all messages
- 🐛 **Debugging** - Detailed logs
- ⚡ **Production Ready** - Battle-tested

## 🔒 Security

- HTTPS/WSS only in production
- Token-based authentication
- No data persistence
- Environment variables for secrets

## 🛠️ Local Development (Optional)

```bash
git clone https://github.com/yourusername/mcp-xiaozhi-bridge.git
cd mcp-xiaozhi-bridge
npm install
npm start
```

## 🧪 Testing

```bash
# Health check
curl https://your-bridge.vercel.app/health

# Create test connection
curl -X POST https://your-bridge.vercel.app/connect \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServerUrl": "https://your-mcp.com/sse",
    "xiaozhiToken": "YOUR_TOKEN"
  }'
```

## 🐛 Troubleshooting

### Connection Fails
- ✅ Check Xiaozhi token is valid
- ✅ Verify MCP server URL is accessible
- ✅ Ensure URLs use correct protocol (wss://, https://)
- ✅ Check server logs for details

### Messages Not Forwarding
- ✅ Verify bridge is fully connected: `GET /connection/:id`
- ✅ Check message format is valid JSON
- ✅ Review message history: `GET /connection/:id/messages`

## 📚 More Information

- [Xiaozhi API](https://xiaozhi.me) - Xiaozhi documentation
- [MCP Protocol](https://github.com/modelcontextprotocol) - MCP specs
- [Deploy Guide](./DEPLOYMENT.md) - Deployment instructions

## 🤝 Contributing

Contributions welcome! Open an issue or PR.

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

Built for the MCP and Xiaozhi communities! 🌟

---

**Star ⭐ this repo if you find it useful!**
