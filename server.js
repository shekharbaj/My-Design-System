// AI Design System Creator - Local Figma Bridge Server
// Pure native Node.js implementation with zero required external dependencies (uses native 'http', 'fs', 'path', 'url')

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 9250;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'components.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

// Bridge state
let pendingFigmaPayload = null;
let lastSyncTimestamp = null;
let lastPushedComponentName = null;
const connectedWsClients = new Set();
const sseClients = new Set();

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

// Helper to set permissive CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, Pragma');
  res.setHeader('Access-Control-Max-Age', '86400');
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

// Broadcast to all bridge consumers (SSE + WebSocket)
function broadcastToFigma(payload, eventType = 'PUSH_TO_FIGMA') {
  const compName = payload.component?.name || payload.tokens?.brand?.name || (payload.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS' ? 'Design Tokens' : 'Component');
  console.log(`[Bridge Broadcast] ➔ Delivering "${compName}" to ${sseClients.size} SSE client(s) & ${connectedWsClients.size} WS client(s)`);

  // 1. SSE broadcast
  const sseMsg = `event: ${eventType}\ndata: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const clientRes of sseClients) {
    try {
      clientRes.write(sseMsg);
    } catch (e) {
      sseClients.delete(clientRes);
    }
  }

  // 2. WebSocket broadcast
  if (wss) {
    const wsMsg = JSON.stringify({ type: eventType, payload });
    for (const ws of connectedWsClients) {
      if (ws.readyState === 1) {
        try { ws.send(wsMsg); } catch (e) {}
      }
    }
  }
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

  // 1. Server-Sent Events (SSE) Endpoint for real-time Figma Bridge push
  if (pathname === '/api/figma/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`: connected\n\n`);
    sseClients.add(res);
    console.log(`[Bridge SSE] Figma client connected (Active SSE listeners: ${sseClients.size})`);

    // If there is an outstanding pending payload, deliver immediately
    if (pendingFigmaPayload) {
      res.write(`event: PUSH_TO_FIGMA\ndata: ${JSON.stringify({ type: 'PUSH_TO_FIGMA', payload: pendingFigmaPayload })}\n\n`);
    }

    req.on('close', () => {
      sseClients.delete(res);
      console.log(`[Bridge SSE] Figma client disconnected (Active SSE listeners: ${sseClients.size})`);
    });
    return;
  }

  // 2. Health check & status
  if (pathname === '/api/status' && req.method === 'GET') {
    const activePort = server.address() ? server.address().port : PORT;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store'
    });
    res.end(JSON.stringify({
      status: 'ok',
      port: activePort,
      bridge: 'active',
      figmaClientsCount: sseClients.size + connectedWsClients.size,
      sseListeners: sseClients.size,
      wsListeners: connectedWsClients.size,
      pendingCount: pendingFigmaPayload ? 1 : 0,
      lastSync: lastSyncTimestamp,
      lastPushedComponent: lastPushedComponentName
    }));
    return;
  }

  // 3. Component library GET
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

  // 4. Component library POST / SAVE
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

  // 5. Push to Figma endpoint
  if (pathname === '/api/figma/push' && req.method === 'POST') {
    try {
      const payload = await readRequestBody(req);
      pendingFigmaPayload = payload;
      lastPushedComponentName = (payload.components && payload.components.length)
        ? `Project Scope (${payload.components.length} components)`
        : (payload.batchCount ? `Project Scope (${payload.batchCount} components)` : (payload.component?.name || payload.tokens?.brand?.name || (payload.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS' ? 'Design Tokens' : 'Component')));
      console.log(`[Bridge] Received Push to Figma: "${lastPushedComponentName}"`);

      // Broadcast immediately via SSE and WebSocket
      broadcastToFigma(payload, payload.type || 'PUSH_TO_FIGMA');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Pushed "${lastPushedComponentName}" to Figma bridge queue`,
        componentName: lastPushedComponentName,
        listenersNotified: sseClients.size + connectedWsClients.size
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 6. Figma Plugin Pending Poll
  if (pathname === '/api/figma/pending' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const responsePayload = pendingFigmaPayload;
    if (parsedUrl.query.clear === 'true' || parsedUrl.query.clear === '1') {
      pendingFigmaPayload = null; // Clear queue on consumption
    }
    res.end(JSON.stringify({
      hasPending: !!responsePayload,
      payload: responsePayload
    }));
    return;
  }

  // 7. Figma Plugin ACK
  if (pathname === '/api/figma/ack' && req.method === 'POST') {
    try {
      const ackData = await readRequestBody(req);
      lastSyncTimestamp = new Date().toLocaleTimeString();
      pendingFigmaPayload = null; // Clear pending once acknowledged
      console.log(`[Bridge] ✓ Figma Canvas ACK: "${ackData.componentName}" (${ackData.variantCount || 0} variants) synced!`);
      
      // Notify SSE and WS clients of ACK
      const ackMsg = `event: FIGMA_ACK\ndata: ${JSON.stringify({ type: 'FIGMA_ACK', ...ackData })}\n\n`;
      for (const clientRes of sseClients) {
        try { clientRes.write(ackMsg); } catch (e) {}
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, timestamp: lastSyncTimestamp }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 8. Static file serving from public/
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

// Optional WebSocket setup using 'ws' module if installed
let wss = null;
try {
  const WebSocket = require('ws');
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    connectedWsClients.add(ws);
    console.log('[Bridge WS] Client connected (Total WS: ' + connectedWsClients.size + ')');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PUSH_TO_FIGMA' || data.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS') {
          pendingFigmaPayload = data.payload;
          lastPushedComponentName = data.payload.component?.name || 'Component';
          console.log(`[Bridge WS] Received PUSH_TO_FIGMA for ${lastPushedComponentName}`);
          broadcastToFigma(data.payload, data.type);
        } else if (data.type === 'FIGMA_ACK') {
          lastSyncTimestamp = new Date().toLocaleTimeString();
          pendingFigmaPayload = null;
          console.log(`[Bridge WS] ✓ Figma ACK: ${data.componentName} synced!`);
        }
      } catch (e) {
        console.warn('WS message error:', e);
      }
    });

    ws.on('close', () => {
      connectedWsClients.delete(ws);
      console.log('[Bridge WS] Client disconnected');
    });
  });
} catch (e) {
  // 'ws' package not installed, SSE and HTTP long-polling are fully active!
  console.log('[Bridge] Running native zero-dependency HTTP & Server-Sent Events mode');
}

// Start HTTP server with resilient port auto-negotiation (fallback if port 9250 is busy)
let currentPort = parseInt(process.env.PORT, 10) || 9250;
const MAX_PORT_ATTEMPTS = 15;
let portAttempts = 0;

function startServer(portToTry) {
  const onError = (err) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && portAttempts < MAX_PORT_ATTEMPTS) {
      portAttempts++;
      const nextPort = portToTry + 1;
      console.warn(`[Port Check] Port ${portToTry} is unavailable (${err.code}). Trying next port ${nextPort}...`);
      server.removeListener('error', onError);
      setTimeout(() => {
        startServer(nextPort);
      }, 100);
    } else {
      console.error(`[Fatal Error] Unable to bind server on port ${portToTry}:`, err.message);
      process.exit(1);
    }
  };

  server.once('error', onError);

  // Bind to dual-stack IPv4/IPv6 so both 127.0.0.1 and localhost connect seamlessly
  server.listen(portToTry, () => {
    server.removeListener('error', onError);
    const activePort = server.address().port;
    console.log(`
============================================================
  AI Design System Creator & Figma Desktop Bridge
============================================================
  🚀 Local Web App:     http://localhost:${activePort}
  🔌 Figma Bridge:      http://localhost:${activePort}/api/figma/push
  ⚡ Live SSE Stream:   http://localhost:${activePort}/api/figma/events
  📦 Status Endpoint:   http://localhost:${activePort}/api/status
============================================================
`);

    // Write active-port.json so Figma plugin, scripts, and tools know the active port
    try {
      fs.writeFileSync(
        path.join(__dirname, 'active-port.json'),
        JSON.stringify({ port: activePort, url: `http://localhost:${activePort}`, updated: new Date().toISOString() }, null, 2),
        'utf8'
      );
    } catch (e) {}

    // Automatically open browser once confirmed listening (zero race condition)
    if (!process.env.NO_OPEN) {
      try {
        const { exec } = require('child_process');
        const openCmd = process.platform === 'win32'
          ? `start http://localhost:${activePort}`
          : process.platform === 'darwin'
            ? `open http://localhost:${activePort}`
            : `xdg-open http://localhost:${activePort}`;
        exec(openCmd, (err) => {
          if (err) console.warn('[Notice] Could not auto-launch browser:', err.message);
        });
      } catch (e) {}
    }
  });
}

startServer(currentPort);
