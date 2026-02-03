# Deployment Guide

This guide covers deploying the MCP-Xiaozhi Bridge to various cloud platforms. **No local installation required!**

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended for Beginners)

**Pros:** Free tier, automatic HTTPS, easy setup  
**Time:** ~2 minutes

1. **Fork this repository** to your GitHub account

2. **Go to [Vercel](https://vercel.com)** and sign up/login with GitHub

3. **Click "Add New Project"**

4. **Import your forked repository**
   - Vercel will auto-detect the project settings
   - No configuration needed!

5. **Click "Deploy"**

6. **Done!** Your bridge is live at `https://your-project.vercel.app`

**Testing your deployment:**
```bash
curl https://your-project.vercel.app/health
```

---

### Option 2: Railway

**Pros:** Free tier, database support, auto-scaling  
**Time:** ~3 minutes

1. **Fork this repository**

2. **Go to [Railway](https://railway.app)** and sign up

3. **Click "New Project"** → "Deploy from GitHub repo"

4. **Select your forked repository**

5. **Railway auto-deploys!**
   - It detects `package.json` automatically
   - Sets up the environment

6. **Get your URL** from the Railway dashboard

**Custom domain (optional):**
- Go to Settings → Domains
- Add your custom domain

---

### Option 3: Render

**Pros:** Free tier, persistent storage, easy SSL  
**Time:** ~3 minutes

1. **Fork this repository**

2. **Go to [Render](https://render.com)** and sign up

3. **Click "New" → "Web Service"**

4. **Connect your GitHub repository**

5. **Configure the service:**
   - Name: `mcp-xiaozhi-bridge`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

6. **Click "Create Web Service"**

7. **Your bridge is deployed!**

---

### Option 4: Heroku

**Pros:** Well-established, good documentation  
**Time:** ~5 minutes

1. **Fork this repository**

2. **Go to [Heroku](https://heroku.com)** and sign up

3. **Create a new app**

4. **Connect to GitHub:**
   - Go to Deploy tab
   - Select GitHub as deployment method
   - Connect your repository

5. **Enable automatic deploys** (optional)

6. **Click "Deploy Branch"**

7. **Your bridge is live** at `https://your-app.herokuapp.com`

---

### Option 5: Google Cloud Run

**Pros:** Serverless, auto-scaling, pay-per-use  
**Time:** ~5 minutes

1. **Fork this repository**

2. **Create a Dockerfile** (add this to your repo):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Install Google Cloud CLI** (or use Cloud Shell)

4. **Deploy:**
   ```bash
   gcloud run deploy mcp-xiaozhi-bridge \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

5. **Your service is deployed!**

---

### Option 6: AWS (Elastic Beanstalk)

**Pros:** AWS ecosystem integration  
**Time:** ~10 minutes

1. **Install AWS CLI and EB CLI**

2. **Initialize Elastic Beanstalk:**
   ```bash
   eb init -p node.js mcp-xiaozhi-bridge
   ```

3. **Create environment and deploy:**
   ```bash
   eb create mcp-bridge-env
   eb deploy
   ```

4. **Open your app:**
   ```bash
   eb open
   ```

---

### Option 7: DigitalOcean App Platform

**Pros:** Simple pricing, good performance  
**Time:** ~5 minutes

1. **Fork this repository**

2. **Go to [DigitalOcean](https://www.digitalocean.com)**

3. **Click "Create" → "Apps"**

4. **Connect your GitHub repository**

5. **Configure:**
   - Type: Web Service
   - Run Command: `npm start`
   - HTTP Port: 3000

6. **Click "Create Resources"**

7. **Your app is deployed!**

---

## 🔧 Environment Variables

Most platforms don't require environment variables for basic deployment. If needed:

**Vercel:**
- Go to Settings → Environment Variables
- Add `PORT=3000` (optional)

**Railway:**
- Go to Variables tab
- Add variables

**Render:**
- Go to Environment tab
- Add environment variables

---

## 🌐 Custom Domain

All platforms support custom domains:

1. **Purchase a domain** (Namecheap, GoDaddy, etc.)

2. **Add domain to your platform:**
   - Vercel: Settings → Domains
   - Railway: Settings → Domains
   - Render: Settings → Custom Domains

3. **Update DNS records** at your domain registrar

4. **Wait for propagation** (5-60 minutes)

---

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics available
- Check deployment logs in dashboard

### Railway Logs
- Click on your service
- View logs in real-time

### Render Logs
- Go to Logs tab
- Stream logs live

---

## 🔄 Auto-Deploy on Git Push

Most platforms support auto-deployment:

**Vercel:** Enabled by default  
**Railway:** Enabled by default  
**Render:** Enable in Settings → Auto-Deploy  
**Heroku:** Enable in Deploy tab

---

## 🧪 Testing Your Deployment

After deployment, test your bridge:

```bash
# Health check
curl https://your-deployment-url.com/health

# Create a connection
curl -X POST https://your-deployment-url.com/connect \
  -H "Content-Type: application/json" \
  -d '{
    "mcpServerUrl": "https://your-mcp-server.com/sse",
    "xiaozhiEndpoint": "https://xiaozhi-endpoint.com/api"
  }'

# List connections
curl https://your-deployment-url.com/connections
```

---

## ⚡ Performance Tips

1. **Use a CDN** for better global performance
2. **Enable caching** where applicable
3. **Monitor response times**
4. **Scale up** if needed (most platforms auto-scale)

---

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (must be 18+)
- Verify package.json is valid
- Check deployment logs

### Connection Errors
- Verify MCP server URL is accessible
- Check CORS settings
- Ensure HTTPS is used

### Deployment Takes Too Long
- Some platforms have free tier limits
- Consider upgrading to paid tier
- Check platform status page

---

## 💰 Cost Estimates

| Platform | Free Tier | Paid Starting |
|----------|-----------|---------------|
| Vercel | Yes (generous) | $20/mo |
| Railway | $5 credit | $5/mo |
| Render | 750 hours/mo | $7/mo |
| Heroku | Limited | $7/mo |
| Google Cloud Run | Yes (limited) | Pay-per-use |
| DigitalOcean | No | $5/mo |

---

## 🎯 Recommended for Different Use Cases

- **Personal projects:** Vercel or Railway
- **Production apps:** Render or Google Cloud Run
- **Enterprise:** AWS or Google Cloud
- **Simple & fast:** Vercel
- **Need databases:** Railway or Render

---

## 📞 Need Help?

- Check platform-specific documentation
- Open an issue on GitHub
- Join our community discussions

Happy deploying! 🚀
