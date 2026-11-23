// AI Design System Creator - Local Figma Bridge Server
// Pure native Node.js implementation with zero required external dependencies (uses native 'http', 'fs', 'path', 'url')

const http = require('http');
const https = require('https');
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

// Dedicated tracking for Figma Plugin vs Web App clients
const figmaWsClients = new Set();
const webAppWsClients = new Set();
const figmaSseClients = new Set();
const webAppSseClients = new Set();

function getFigmaClientsCount() {
  return figmaWsClients.size + figmaSseClients.size;
}

function broadcastBridgeStatus() {
  const figmaTotal = getFigmaClientsCount();
  const statusPayload = JSON.stringify({
    type: 'BRIDGE_STATUS',
    figmaConnected: figmaTotal > 0,
    figmaClientsCount: figmaTotal,
    pendingCount: pendingFigmaPayload ? 1 : 0
  });
  for (const clientRes of sseClients) {
    try { clientRes.write(`event: BRIDGE_STATUS\ndata: ${statusPayload}\n\n`); } catch(e) {}
  }
  for (const ws of connectedWsClients) {
    try { if (ws.readyState === 1) ws.send(statusPayload); } catch(e) {}
  }
}

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

    const clientParam = parsedUrl.query?.client || '';
    const isFigma = clientParam.includes('figma') || (req.headers['user-agent'] && req.headers['user-agent'].includes('Figma'));
    if (isFigma) {
      figmaSseClients.add(res);
      console.log(`[Bridge SSE] Figma client connected (Active Figma SSE: ${figmaSseClients.size})`);
      broadcastBridgeStatus();
    } else {
      webAppSseClients.add(res);
      console.log(`[Bridge SSE] Web app client connected (Active Web App SSE: ${webAppSseClients.size})`);
    }

    // If there is an outstanding pending payload and this is a Figma client, deliver immediately
    if (pendingFigmaPayload && isFigma) {
      res.write(`event: PUSH_TO_FIGMA\ndata: ${JSON.stringify({ type: 'PUSH_TO_FIGMA', payload: pendingFigmaPayload })}\n\n`);
    }

    req.on('close', () => {
      sseClients.delete(res);
      if (isFigma) {
        figmaSseClients.delete(res);
        console.log(`[Bridge SSE] Figma client disconnected (Active Figma SSE: ${figmaSseClients.size})`);
        broadcastBridgeStatus();
      } else {
        webAppSseClients.delete(res);
      }
    });
    return;
  }

  // 2. Health check & status
  if (pathname === '/api/status' && req.method === 'GET') {
    const activePort = server.address() ? server.address().port : PORT;
    const figmaCount = getFigmaClientsCount();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store'
    });
    res.end(JSON.stringify({
      status: 'ok',
      port: activePort,
      bridge: 'active',
      figmaConnected: figmaCount > 0,
      figmaClientsCount: figmaCount,
      webAppClientsCount: webAppSseClients.size + webAppWsClients.size,
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

  // --- Hybrid LLM Proxy Helpers & Endpoints ---
  function executeHttpRequest(targetUrl, options, postData) {
    return new Promise((resolve, reject) => {
      const parsed = url.parse(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const reqOpts = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.path,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = client.request(reqOpts, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });

      req.on('error', reject);
      req.setTimeout(options.timeout || 30000, () => {
        req.destroy();
        reject(new Error('Request timed out after 30 seconds'));
      });

      if (postData) {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
      req.end();
    });
  }

  async function callLLMProvider({ provider, model, apiKey, baseUrl, prompt, systemPrompt, temperature = 0.2 }) {
    const prov = (provider || 'gemini').toLowerCase();

    if (prov === 'local') {
      return {
        success: true,
        provider: 'local',
        model: 'rule-based-engine',
        text: `[Local Hybrid Engine response for: ${prompt.slice(0, 100)}]`
      };
    }

    // 1. Google Gemini
    if (prov === 'gemini') {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error('Gemini API key is required. Please enter your API key in AI settings.');
      const targetModel = model || 'gemini-2.0-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(key)}`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: Number(temperature) || 0.2 }
      };
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const res = await executeHttpRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, body);

      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errMsg = `Gemini API error (HTTP ${res.statusCode})`;
        try {
          const errJson = JSON.parse(res.data);
          if (errJson.error?.message) errMsg = errJson.error.message;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = JSON.parse(res.data);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { success: true, provider: 'gemini', model: targetModel, text };
    }

    // 2. OpenAI
    if (prov === 'openai') {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OpenAI API key is required. Please enter your API key in AI settings.');
      const targetModel = model || 'gpt-4o-mini';
      const rootUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1';
      const endpoint = `${rootUrl}/chat/completions`;

      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const body = {
        model: targetModel,
        messages,
        temperature: Number(temperature) || 0.2
      };

      const res = await executeHttpRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }
      }, body);

      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errMsg = `OpenAI API error (HTTP ${res.statusCode})`;
        try {
          const errJson = JSON.parse(res.data);
          if (errJson.error?.message) errMsg = errJson.error.message;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = JSON.parse(res.data);
      const text = data.choices?.[0]?.message?.content || '';
      return { success: true, provider: 'openai', model: targetModel, text };
    }

    // 3. Anthropic Claude
    if (prov === 'anthropic') {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('Anthropic API key is required. Please enter your API key in AI settings.');
      const targetModel = model || 'claude-3-5-sonnet-20241022';
      const endpoint = 'https://api.anthropic.com/v1/messages';

      const body = {
        model: targetModel,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      };
      if (systemPrompt) body.system = systemPrompt;

      const res = await executeHttpRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        }
      }, body);

      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errMsg = `Anthropic API error (HTTP ${res.statusCode})`;
        try {
          const errJson = JSON.parse(res.data);
          if (errJson.error?.message) errMsg = errJson.error.message;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = JSON.parse(res.data);
      const text = data.content?.[0]?.text || '';
      return { success: true, provider: 'anthropic', model: targetModel, text };
    }

    // 4. Groq
    if (prov === 'groq') {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) throw new Error('Groq API key is required. Please enter your API key in AI settings.');
      const targetModel = model || 'llama-3.3-70b-versatile';
      const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const body = {
        model: targetModel,
        messages,
        temperature: Number(temperature) || 0.2
      };

      const res = await executeHttpRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        }
      }, body);

      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errMsg = `Groq API error (HTTP ${res.statusCode})`;
        try {
          const errJson = JSON.parse(res.data);
          if (errJson.error?.message) errMsg = errJson.error.message;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = JSON.parse(res.data);
      const text = data.choices?.[0]?.message?.content || '';
      return { success: true, provider: 'groq', model: targetModel, text };
    }

    // 5. Ollama (Local)
    if (prov === 'ollama') {
      const targetModel = model || 'llama3.2';
      const rootUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : 'http://localhost:11434';
      const endpoint = `${rootUrl}/api/chat`;

      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const body = {
        model: targetModel,
        messages,
        stream: false
      };

      const res = await executeHttpRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, body);

      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`Ollama returned HTTP ${res.statusCode}. Is Ollama running on ${rootUrl}?`);
      }

      const data = JSON.parse(res.data);
      const text = data.message?.content || '';
      return { success: true, provider: 'ollama', model: targetModel, text };
    }

    throw new Error(`Unsupported LLM provider: "${prov}"`);
  }

  // 8. LLM Status Check
  if (pathname === '/api/llm/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      mode: 'hybrid',
      envKeysAvailable: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        groq: Boolean(process.env.GROQ_API_KEY)
      }
    }));
    return;
  }

  // 9. LLM Test Connection Endpoint
  if (pathname === '/api/llm/test' && req.method === 'POST') {
    const startTime = Date.now();
    try {
      const payload = await readRequestBody(req);
      const { provider = 'gemini', model, apiKey, baseUrl } = payload;

      if (provider === 'local') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          provider: 'local',
          model: 'rule-based-engine',
          latencyMs: 1,
          message: '✓ Local deterministic engine ready (Offline Hybrid mode)'
        }));
        return;
      }

      const result = await callLLMProvider({
        provider,
        model,
        apiKey,
        baseUrl,
        prompt: 'Say exactly: "Design System AI connected!" in 5 words or less.',
        temperature: 0.1
      });

      const latencyMs = Date.now() - startTime;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        provider,
        model: result.model,
        latencyMs,
        message: `✓ Connected to ${result.model} (${latencyMs}ms)`,
        sample: result.text.trim()
      }));
    } catch (e) {
      const latencyMs = Date.now() - startTime;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        latencyMs,
        error: e.message || 'Connection test failed. Please verify your API key.'
      }));
    }
    return;
  }

  // 10. LLM Generate Endpoint
  if (pathname === '/api/llm/generate' && req.method === 'POST') {
    try {
      const payload = await readRequestBody(req);
      const { provider, model, apiKey, baseUrl, prompt, systemPrompt, temperature } = payload;
      
      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Prompt is required' }));
        return;
      }

      const result = await callLLMProvider({
        provider,
        model,
        apiKey,
        baseUrl,
        prompt,
        systemPrompt,
        temperature
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 11. Static file serving from public/
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
        if (data.type === 'CLIENT_IDENTIFY') {
          if (data.role === 'FIGMA_PLUGIN') {
            ws._isFigma = true;
            figmaWsClients.add(ws);
            webAppWsClients.delete(ws);
            console.log(`[Bridge WS] Figma Desktop Plugin identified! (Active Figma WS: ${figmaWsClients.size})`);
            broadcastBridgeStatus();
          } else {
            ws._isFigma = false;
            webAppWsClients.add(ws);
            figmaWsClients.delete(ws);
          }
        } else if (data.type === 'PUSH_TO_FIGMA' || data.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS') {
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
      if (ws._isFigma) {
        figmaWsClients.delete(ws);
        console.log(`[Bridge WS] Figma Desktop Plugin disconnected (Remaining Figma WS: ${figmaWsClients.size})`);
        broadcastBridgeStatus();
      } else {
        webAppWsClients.delete(ws);
      }
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
