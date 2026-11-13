// AI Design System Creator - Local Figma Bridge Server
// Node.js implementation with zero required external dependencies (uses native 'http', 'fs', 'path')

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 9250;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'components.json');

// Bridge state
let pendingFigmaPayload = null;
let lastSyncTimestamp = null;
let lastPushedComponentName = null;
const connectedClients = new Set(); // Sockets or SSE clients

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Read body helper
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Routes
  // 1. Health check & status
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      port: PORT,
      bridge: 'active',
      figmaClientsCount: connectedClients.size,
      pendingCount: pendingFigmaPayload ? 1 : 0,
      lastSync: lastSyncTimestamp,
      lastPushedComponent: lastPushedComponentName
    }));
    return;
  }

  // 2. Component library GET
  if (pathname === '/api/components' && req.method === 'GET') {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(raw);
        return;
      }
    } catch (e) {
      console.warn('Error reading components data file:', e);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }

  // 3. Component library POST / SAVE
  if (pathname === '/api/components' && req.method === 'POST') {
    try {
      const data = await readRequestBody(req);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Components saved successfully' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 4. Push to Figma endpoint
  if (pathname === '/api/figma/push' && req.method === 'POST') {
    try {
      const payload = await readRequestBody(req);
      pendingFigmaPayload = payload;
      lastPushedComponentName = payload.component?.name || payload.tokens?.brand?.name || (payload.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS' ? 'Design Tokens' : 'Component');
      console.log(`[Bridge] Received Push to Figma: "${lastPushedComponentName}"`);

      // Broadcast to any connected WebSocket or SSE clients
      broadcastFigmaPush(payload);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Pushed "${lastPushedComponentName}" to Figma bridge queue`,
        componentName: lastPushedComponentName
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 5. Figma Plugin Pending Poll
  if (pathname === '/api/figma/pending' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const responsePayload = pendingFigmaPayload;
    pendingFigmaPayload = null; // Clear queue on consumption
    res.end(JSON.stringify({
      hasPending: !!responsePayload,
      payload: responsePayload
    }));
    return;
  }

  // 6. Figma Plugin ACK
  if (pathname === '/api/figma/ack' && req.method === 'POST') {
    try {
      const ackData = await readRequestBody(req);
      lastSyncTimestamp = new Date().toLocaleTimeString();
      console.log(`[Bridge] ✓ Figma Canvas ACK: "${ackData.componentName}" (${ackData.variantCount} variants) synced!`);
      broadcastFigmaAck(ackData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 7. Static file serving from public/
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Security check to avoid directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexHtml = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexHtml).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Optional WebSocket setup using standard 'ws' module if available
let wss = null;
try {
  const WebSocket = require('ws');
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log('[Bridge WS] Client connected (Total: ' + connectedClients.size + ')');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PUSH_TO_FIGMA') {
          pendingFigmaPayload = data.payload;
          lastPushedComponentName = data.payload.component?.name || 'Component';
          console.log(`[Bridge WS] Broadcast PUSH_TO_FIGMA for ${lastPushedComponentName}`);
          // Broadcast to all other clients (e.g. Figma plugin)
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'PUSH_TO_FIGMA',
                payload: data.payload
              }));
            }
          });
        } else if (data.type === 'FIGMA_ACK') {
          lastSyncTimestamp = new Date().toLocaleTimeString();
          console.log(`[Bridge WS] ✓ Figma ACK: ${data.componentName} synced!`);
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      } catch (e) {
        console.warn('WS message error:', e);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log('[Bridge WS] Client disconnected');
    });
  });
} catch (e) {
  // 'ws' package not installed, HTTP fallback and polling is active
  console.log('[Bridge] Running HTTP/REST bridge mode (WebSocket optional)');
}

function broadcastFigmaPush(payload) {
  if (wss) {
    const msg = JSON.stringify({ type: 'PUSH_TO_FIGMA', payload });
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(msg);
    });
  }
}

function broadcastFigmaAck(ackData) {
  if (wss) {
    const msg = JSON.stringify({ type: 'FIGMA_ACK', ...ackData });
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(msg);
    });
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
============================================================
  AI Design System Creator & Figma Desktop Bridge
============================================================
  🚀 Local Web App:     http://localhost:${PORT}
  🔌 Figma Bridge:      http://localhost:${PORT}/api/figma/push
  ⚡ WebSocket:         ws://localhost:${PORT}
============================================================
`);
});
