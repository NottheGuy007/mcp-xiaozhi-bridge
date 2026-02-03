# Quick Start Guide for Xiaozhi Users 🚀

This guide will help you connect your MCP server to Xiaozhi in **under 5 minutes**.

## Step 1: Get Your Xiaozhi Token

1. Go to [Xiaozhi](https://xiaozhi.me)
2. Log in to your account
3. Navigate to **API Settings** or **Developer Settings**
4. Copy your WebSocket token

Your token URL will look like:
```
wss://api.xiaozhi.me/mcp/?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 2: Deploy the Bridge (2 minutes)

### Option A: Deploy to Vercel (Easiest)

1. **Fork this repository** on GitHub
2. Go to [Vercel](https://vercel.com)
3. Click **"New Project"**
4. Import your forked repository
5. Click **"Deploy"**
6. Copy your deployment URL (e.g., `https://my-bridge.vercel.app`)

### Option B: Deploy to Railway

1. Go to [Railway](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Select this repository
4. Railway will auto-deploy
5. Copy your deployment URL

## Step 3: Create a Bridge Connection

Open your terminal or API client and run:

```bash
curl -X POST https://your-bridge.vercel.app/connect \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServerUrl": "https://your-mcp-server.com/sse",
    "xiaozhiWssUrl": "wss://api.xiaozhi.me/mcp/?token=YOUR_XIAOZHI_TOKEN"
  }'
```

**Alternative:** Provide token separately:

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
    "isMcpConnected": true,
    "isXiaozhiConnected": true,
    "isFullyConnected": true
  }
}
```

**Save the `connectionId`!** You'll need it for monitoring and management.

## Step 4: Verify Connection

```bash
curl https://your-bridge.vercel.app/connection/bridge-1234567890-abc123
```

You should see:
```json
{
  "success": true,
  "connection": {
    "connectionId": "bridge-1234567890-abc123",
    "isMcpConnected": true,
    "isXiaozhiConnected": true,
    "isFullyConnected": true,
    "messageCount": 0
  }
}
```

## Step 5: Done! 🎉

Your bridge is now active! It will:
- ✅ Listen to events from your MCP server
- ✅ Forward them to Xiaozhi via WebSocket
- ✅ Auto-reconnect if connection drops
- ✅ Keep message history for debugging

## Monitoring Your Bridge

### Check all active connections
```bash
curl https://your-bridge.vercel.app/connections
```

### View message history
```bash
curl https://your-bridge.vercel.app/connection/bridge-1234567890-abc123/messages
```

### Health check
```bash
curl https://your-bridge.vercel.app/health
```

## Send Manual Messages (Optional)

```bash
curl -X POST https://your-bridge.vercel.app/send/bridge-1234567890-abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "query",
    "content": "Hello Xiaozhi!"
  }'
```

## Disconnect When Done

```bash
curl -X DELETE https://your-bridge.vercel.app/disconnect/bridge-1234567890-abc123
```

## Common Issues

### "Connection not found"
- Make sure you're using the correct `connectionId`
- Check if the bridge was disconnected
- Use `GET /connections` to see active bridges

### "Xiaozhi WebSocket is not connected"
- Verify your Xiaozhi token is valid
- Check the token hasn't expired
- Ensure the URL format is correct: `wss://api.xiaozhi.me/mcp/?token=...`

### "Failed to establish MCP connection"
- Verify your MCP server URL is accessible
- Check the MCP server is running
- Ensure the URL uses `https://` protocol

## Need Help?

- 📖 [Full Documentation](./README.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/yourusername/mcp-xiaozhi-bridge/issues)

---

**Happy bridging! 🌉**
