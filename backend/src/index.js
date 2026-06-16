const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productsRouter = require('./routes/products');
const pricingRouter = require('./routes/pricing');
const bomRouter = require('./routes/bom');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());

// Custom middleware to support both text/plain and application/json requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('text/plain')) {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        req.body = data ? JSON.parse(data) : {};
        next();
      } catch (err) {
        res.status(400).json({ error: 'Invalid JSON body in text/plain payload' });
      }
    });
  } else {
    express.json()(req, res, next);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'si-product-hub-backend' });
});

// Dispatcher middleware: rewrite req.url from /api (or /) to /action
app.use((req, res, next) => {
  const { action } = req.body || {};
  if (req.method === 'POST' && action) {
    req.url = `/${action}`;
  }
  next();
});

// Route handlers
app.use('/api', productsRouter);
app.use('/api', pricingRouter);
app.use('/api', bomRouter);

// Root path fallback routing support (if configured without /api)
app.use('/', productsRouter);
app.use('/', pricingRouter);
app.use('/', bomRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred in backend:', err.stack || err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend service is running on port ${PORT}`);
});
