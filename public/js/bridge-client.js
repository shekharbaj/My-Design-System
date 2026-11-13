// AI Design System Creator - Figma Desktop Bridge Client
import { store } from './store.js';

class FigmaBridgeClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.bridgeUrl = window.location.origin.includes('9250') 
      ? window.location.origin 
      : 'http://localhost:9250';
    this.wsUrl = this.bridgeUrl.replace(/^http/, 'ws');
    this.syncHistory = [];
    
    // Auto initialize connection
    this.init();
  }

  init() {
    this.connectWebSocket();
    this.startHealthPolling();
  }

  connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.log('Connected to Figma Bridge WebSocket at ' + this.wsUrl, 'success');
        store.setBridgeStatus({ connected: true, clientsCount: 1 });
        // Identify as Web App
        this.ws.send(JSON.stringify({ type: 'CLIENT_IDENTIFY', role: 'WEB_APP' }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.warn('Bridge client parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        store.setBridgeStatus({ connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.connected = false;
        store.setBridgeStatus({ connected: false });
        this.scheduleReconnect();
      };
    } catch (e) {
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 4000);
  }

  startHealthPolling() {
    // Also perform HTTP poll check every 5s for robust fallback
    setInterval(async () => {
      try {
        const res = await fetch(`${this.bridgeUrl}/api/status`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          store.setBridgeStatus({
            connected: true,
            clientsCount: data.figmaClientsCount || 1,
            pendingCount: data.pendingCount || 0,
            lastSync: data.lastSync || store.bridgeStatus.lastSync
          });
        }
      } catch (e) {
        // HTTP bridge not running or unreachable
        if (!this.connected) {
          store.setBridgeStatus({ connected: false });
        }
      }
    }, 5000);
  }

  handleIncomingMessage(msg) {
    switch (msg.type) {
      case 'FIGMA_CLIENT_CONNECTED':
        this.log(`Figma desktop plugin connected: ${msg.clientName || 'Instance'}`, 'info');
        store.setBridgeStatus({ connected: true, clientsCount: (store.bridgeStatus.clientsCount || 0) + 1 });
        break;

      case 'FIGMA_CLIENT_DISCONNECTED':
        this.log('Figma desktop plugin disconnected', 'warning');
        break;

      case 'FIGMA_ACK':
        this.log(`✓ Figma Canvas synced: ${msg.componentName} (${msg.variantCount || 0} variants created)`, 'success');
        store.setBridgeStatus({
          lastSync: new Date().toLocaleTimeString(),
          lastPushedComponent: msg.componentName
        });
        this.notifyUser(`Synced "${msg.componentName}" to Figma Canvas!`, 'success');
        break;

      case 'FIGMA_ERROR':
        this.log(`Figma sync error: ${msg.error}`, 'error');
        this.notifyUser(`Figma Error: ${msg.error}`, 'error');
        break;

      default:
        break;
    }
  }

  generateFigmaSyncPayload(component) {
    // Generate full Cartesian product of variants based on matrixConfig
    const matrix = component.matrixConfig || {
      rowProp: 'variant',
      rowValues: ['primary', 'secondary', 'outline'],
      colProp: 'state',
      colValues: ['Rest', 'Hover', 'Focus', 'Press'],
      thirdProp: 'size',
      thirdValue: 'md'
    };

    const variants = [];
    const rowProp = matrix.rowProp;
    const colProp = matrix.colProp;
    const sizeProp = matrix.thirdProp || 'size';
    const sizeVal = matrix.thirdValue || 'md';

    for (const rVal of matrix.rowValues) {
      for (const cVal of matrix.colValues) {
        // Resolve styles for this cell
        let cellStyle = { bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB', shadow: 'none' };
        if (component.styles?.variants?.[rVal]?.[cVal]) {
          cellStyle = component.styles.variants[rVal][cVal];
        } else if (component.styles?.variants?.[rVal]?.['Rest']) {
          cellStyle = component.styles.variants[rVal]['Rest'];
        }

        const sizeStyle = component.styles?.sizes?.[sizeVal] || {
          padding: component.styles?.padding || { top: 10, right: 18, bottom: 10, left: 18 },
          fontSize: 14,
          iconSize: 16,
          cornerRadius: component.styles?.cornerRadius || 8
        };

        variants.push({
          name: `${rowProp}=${rVal}, ${colProp}=${cVal}, ${sizeProp}=${sizeVal}`,
          properties: {
            [rowProp]: rVal,
            [colProp]: cVal,
            [sizeProp]: sizeVal,
            ...component.activeProps
          },
          styles: {
            ...cellStyle,
            padding: sizeStyle.padding || component.styles?.padding,
            gap: component.styles?.gap || 8,
            align: component.styles?.align || 'center',
            cornerRadius: sizeStyle.cornerRadius !== undefined ? sizeStyle.cornerRadius : (component.styles?.cornerRadius || 8),
            borderWidth: component.styles?.borderWidth || 1,
            fontSize: sizeStyle.fontSize || 14
          }
        });
      }
    }

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      action: 'CREATE_OR_UPDATE_COMPONENT_SET',
      component: {
        id: component.id,
        name: component.name,
        category: component.category,
        description: component.description,
        anatomy: component.anatomy,
        propsSchema: component.props,
        activeProps: component.activeProps,
        matrixConfig: component.matrixConfig,
        variantsList: variants
      }
    };
  }

  async pushComponent(component) {
    if (!component) {
      component = store.getActiveComponent();
    }
    const payload = this.generateFigmaSyncPayload(component);

    this.log(`Packaging "${component.name}" schema for Figma Bridge...`, 'info');

    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'PUSH_TO_FIGMA',
          payload
        }));
        sentViaWs = true;
      } catch (e) {
        console.warn('WebSocket send failed, falling back to HTTP', e);
      }
    }

    // Always also send to HTTP endpoint for persistence and polling Figma plugins
    try {
      const res = await fetch(`${this.bridgeUrl}/api/figma/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        this.log(`Payload sent to Figma Bridge (HTTP + WS). Awaiting Figma canvas sync...`, 'success');
        this.notifyUser(`Pushed "${component.name}" to Figma Bridge!`, 'success');
        store.setBridgeStatus({
          lastPushedComponent: component.name,
          pendingCount: 1
        });
        return { success: true, method: sentViaWs ? 'websocket' : 'http' };
      }
    } catch (e) {
      if (sentViaWs) {
        this.notifyUser(`Pushed "${component.name}" via WebSocket!`, 'success');
        return { success: true, method: 'websocket' };
      }
      this.log(`Bridge connection failed: ${e.message}. Is localhost:9250 running?`, 'error');
      this.notifyUser(`Bridge server unreachable on localhost:9250. Please run the server script!`, 'warning');
      return { success: false, error: e.message };
    }
  }

  log(text, level = 'info') {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      text,
      level
    };
    this.syncHistory.unshift(entry);
    if (this.syncHistory.length > 50) this.syncHistory.pop();
    store.emit('bridge:log', entry);
  }

  notifyUser(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `adsc-toast adsc-toast-${type}`;
    toast.innerHTML = `
      <div class="toast-dot"></div>
      <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
}

export const bridgeClient = new FigmaBridgeClient();
