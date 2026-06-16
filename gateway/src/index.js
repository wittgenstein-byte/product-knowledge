const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4001';

// Enable CORS for all routes
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'si-product-hub-gateway' });
});

// Proxy /api to backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // keep /api in the forwarded path
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      // If we parsed body somewhere (e.g. body-parser), we'd need to re-stream it.
      // But since we aren't using body-parser in gateway, http-proxy-middleware handles it automatically.
    }
  }
}));

// Fallback health check or info
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'SI Product Hub Gateway is running. Use /api for requests.' });
});

app.listen(PORT, () => {
  console.log(`Gateway is running on port ${PORT}`);
  console.log(`Proxying /api requests to ${BACKEND_URL}`);
});
