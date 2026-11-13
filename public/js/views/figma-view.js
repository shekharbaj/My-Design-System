// AI Design System Creator - Figma Desktop Bridge Management View
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient } from '../bridge-client.js';

export class FigmaView {
  constructor(containerEl) {
    this.container = containerEl;
    this.isPushing = false;
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    store.subscribe('bridge:status', () => this.updateStatusOnly());
    store.subscribe('bridge:log', (entry) => this.appendLog(entry));
    store.subscribe('component:selected', () => this.render());
    store.subscribe('component:updated', () => this.updatePayloadPreview());
  }

  render() {
    const comp = store.getActiveComponent();
    if (!comp) return;

    const payload = bridgeClient.generateFigmaSyncPayload(comp);
    const isConn = store.bridgeStatus.connected;
    const clientCount = store.bridgeStatus.clientsCount || 0;

    this.container.innerHTML = `
      <div class="figma-view-layout">
        <!-- Figma Top Status Banner -->
        <div class="figma-banner-card">
          <div class="banner-left-info">
            <div class="bridge-status-row">
              <span class="bridge-indicator-dot ${isConn ? 'online' : 'offline'}"></span>
              <h2 class="bridge-title">Figma Desktop Local Bridge</h2>
              <span class="bridge-badge ${isConn ? 'badge-online' : 'badge-offline'}">
                ${isConn ? 'BRIDGE ACTIVE' : 'BRIDGE OFFLINE'}
              </span>
            </div>
            <p class="banner-desc">
              Synchronizes live component tokens, nested anatomy auto-layouts, and variant sets directly into your local Figma canvas via <code>ws://localhost:9250</code> &amp; <code>http://localhost:9250</code>.
            </p>
          </div>

          <div class="banner-right-actions">
            <button class="adsc-btn btn-figma-hero ${this.isPushing ? 'loading' : ''}" id="btn-push-active-figma">
              ${ICON_SVGS.figma}
              <span>${this.isPushing ? 'Syncing to Canvas...' : `Push "${comp.name}" to Figma`}</span>
            </button>
            <button class="adsc-btn btn-secondary" id="btn-push-all-figma">
              ${ICON_SVGS.layers}
              <span>Push All Library Components</span>
            </button>
          </div>
        </div>

        <!-- Middle 2-Column Split: Diagnostics & Payload Inspector -->
        <div class="figma-grid-split">
          <!-- Left Column: Metrics & Bridge Activity Log -->
          <div class="figma-col">
            <!-- Metrics Bar -->
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-label">Local Port</span>
                <span class="metric-val">9250</span>
                <span class="metric-sub">WebSocket + REST</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Connected Plugins</span>
                <span class="metric-val" id="metric-clients">${clientCount}</span>
                <span class="metric-sub">${clientCount > 0 ? 'Figma Desktop linked' : 'Awaiting Figma plugin'}</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Target Component</span>
                <span class="metric-val text-sm">${comp.name}</span>
                <span class="metric-sub">${comp.matrixConfig?.rowValues?.length * comp.matrixConfig?.colValues?.length || 20} variants</span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Last Push</span>
                <span class="metric-val text-sm" id="metric-last-sync">${store.bridgeStatus.lastSync || 'None yet'}</span>
                <span class="metric-sub" id="metric-last-comp">${store.bridgeStatus.lastPushedComponent || 'Ready'}</span>
              </div>
            </div>

            <!-- Bridge Live Log Stream -->
            <div class="bridge-log-panel">
              <div class="panel-header-row">
                <div class="title-with-icon">
                  <span class="terminal-dot"></span>
                  <h4>Bridge Real-time Activity Log</h4>
                </div>
                <button class="adsc-btn-text" id="btn-clear-log">Clear</button>
              </div>

              <div class="log-stream-terminal" id="bridge-log-terminal">
                ${bridgeClient.syncHistory.map(entry => `
                  <div class="log-line log-${entry.level}">
                    <span class="log-time">[${entry.timestamp}]</span>
                    <span class="log-text">${entry.text}</span>
                  </div>
                `).join('')}
                ${bridgeClient.syncHistory.length === 0 ? `
                  <div class="log-line log-info">
                    <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                    <span class="log-text">Bridge listener ready on localhost:9250. Click "Push to Figma" to dispatch component schema.</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Figma Companion Plugin Quickstart Card -->
            <div class="plugin-guide-card">
              <h4>Figma Companion Plugin Setup (Quick 3-step guide)</h4>
              <ol class="guide-steps-list">
                <li>
                  <strong>Open Figma Desktop:</strong> Click <em>Plugins &rarr; Development &rarr; Import plugin from manifest...</em>
                </li>
                <li>
                  <strong>Select Manifest:</strong> Choose <code>figma-plugin/manifest.json</code> from this project folder.
                </li>
                <li>
                  <strong>Run Plugin:</strong> Run <em>"AI Design System Bridge"</em> on any blank canvas page. It auto-connects to <code>localhost:9250</code> and renders component sets!
                </li>
              </ol>
            </div>
          </div>

          <!-- Right Column: Transmitted Schema Inspector -->
          <div class="figma-col">
            <div class="payload-inspector-panel">
              <div class="panel-header-row">
                <div class="title-with-icon">
                  ${ICON_SVGS.code}
                  <h4>Figma Sync Schema Payload Preview</h4>
                </div>
                <span class="badge-schema">action: CREATE_OR_UPDATE</span>
              </div>

              <pre class="payload-pre-block"><code class="payload-code-block" id="payload-content">${this.escapeHtml(JSON.stringify(payload, null, 2))}</code></pre>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachListeners(comp);
  }

  updateStatusOnly() {
    const isConn = store.bridgeStatus.connected;
    const clientCount = store.bridgeStatus.clientsCount || 0;

    const indDot = this.container.querySelector('.bridge-indicator-dot');
    if (indDot) {
      indDot.className = `bridge-indicator-dot ${isConn ? 'online' : 'offline'}`;
    }

    const badge = this.container.querySelector('.bridge-badge');
    if (badge) {
      badge.className = `bridge-badge ${isConn ? 'badge-online' : 'badge-offline'}`;
      badge.textContent = isConn ? 'BRIDGE ACTIVE' : 'BRIDGE OFFLINE';
    }

    const metricClients = this.container.querySelector('#metric-clients');
    if (metricClients) metricClients.textContent = clientCount;

    const metricLast = this.container.querySelector('#metric-last-sync');
    if (metricLast && store.bridgeStatus.lastSync) metricLast.textContent = store.bridgeStatus.lastSync;

    const metricComp = this.container.querySelector('#metric-last-comp');
    if (metricComp && store.bridgeStatus.lastPushedComponent) metricComp.textContent = store.bridgeStatus.lastPushedComponent;
  }

  updatePayloadPreview() {
    const comp = store.getActiveComponent();
    const codeEl = this.container.querySelector('#payload-content');
    if (codeEl && comp) {
      const payload = bridgeClient.generateFigmaSyncPayload(comp);
      codeEl.innerHTML = this.escapeHtml(JSON.stringify(payload, null, 2));
    }
  }

  appendLog(entry) {
    const terminal = this.container.querySelector('#bridge-log-terminal');
    if (!terminal) return;

    const line = document.createElement('div');
    line.className = `log-line log-${entry.level}`;
    line.innerHTML = `
      <span class="log-time">[${entry.timestamp}]</span>
      <span class="log-text">${entry.text}</span>
    `;
    terminal.prepend(line);
  }

  attachListeners(comp) {
    // Push active component button
    const pushBtn = this.container.querySelector('#btn-push-active-figma');
    if (pushBtn) {
      pushBtn.addEventListener('click', async () => {
        this.isPushing = true;
        pushBtn.classList.add('loading');
        pushBtn.querySelector('span').textContent = 'Syncing to Canvas...';

        try {
          await bridgeClient.pushComponent(comp);
        } finally {
          setTimeout(() => {
            this.isPushing = false;
            pushBtn.classList.remove('loading');
            pushBtn.querySelector('span').textContent = `Push "${comp.name}" to Figma`;
          }, 700);
        }
      });
    }

    // Push all components button
    const pushAllBtn = this.container.querySelector('#btn-push-all-figma');
    if (pushAllBtn) {
      pushAllBtn.addEventListener('click', async () => {
        const all = store.components;
        bridgeClient.log(`Pushing all ${all.length} components to Figma...`, 'info');
        for (const c of all) {
          await bridgeClient.pushComponent(c);
        }
      });
    }

    // Clear log button
    const clearBtn = this.container.querySelector('#btn-clear-log');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        bridgeClient.syncHistory = [];
        const terminal = this.container.querySelector('#bridge-log-terminal');
        if (terminal) terminal.innerHTML = '<div class="log-line log-info"><span class="log-text">Log cleared.</span></div>';
      });
    }
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
