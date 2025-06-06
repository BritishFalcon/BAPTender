const express = require('express');
const next = require('next');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Get the backend URL from an environment variable, with a fallback for local dev
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

console.log(`[Custom Server] Starting in ${dev ? 'development' : 'production'} mode...`);
console.log(`[Custom Server] API requests will be proxied to: ${backendUrl}`);

app.prepare().then(() => {
  const server = express();

  // Configure the proxy middleware
  server.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      pathRewrite: { '^/api': '' }, // remove /api prefix
      ws: true, // proxy websockets/sse
      logLevel: 'debug', // enable detailed logging
      onProxyReq: (proxyReq, req, res) => {
        // This fixes issues with proxied POST requests and body-parser
        fixRequestBody(proxyReq, req);
        console.log(`[Proxy] Forwarding request: ${req.method} ${req.url} -> ${backendUrl}${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[Proxy] Error:', err);
      },
    })
  );

  // For all other requests, let Next.js handle them
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Custom server ready on http://localhost:${port}`);
  });
}).catch(err => {
    console.error('[Next.js Prep] Error during app preparation:', err.stack);
    process.exit(1);
});