// AI Design System Creator - AI & LLM Model Configuration Modal
import { store, DEFAULT_LLM_PROVIDERS } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { llmService } from '../llm-service.js';

export class LLMModal {
  constructor() {
    this.modalEl = null;
    this.currentProviderId = store.getLLMConfig().provider || 'gemini';
    this.isTesting = false;
  }

  open(options = {}) {
    this.close();
    const isFirstTime = Boolean(options.isFirstTime);
    const config = store.getLLMConfig();
    this.currentProviderId = config.provider || 'gemini';

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'adsc-modal-backdrop';
    this.modalEl.innerHTML = `
      <div class="adsc-modal-card llm-config-card">
        <!-- Header -->
        <div class="adsc-modal-header">
          <div class="modal-title-wrap">
            <div class="modal-badge-row">
              <h3>⚡ AI Model &amp; Credentials</h3>
              <span class="hybrid-badge">Hybrid Architecture</span>
            </div>
            <p class="modal-subtitle">Configure your LLM provider for on-demand component synthesis &amp; documentation</p>
          </div>
          <button class="adsc-btn-icon modal-close-btn" id="btn-close-llm-modal" aria-label="Close">${ICON_SVGS.x || '✕'}</button>
        </div>

        <!-- First-time Welcome Banner -->
        ${isFirstTime ? `
          <div class="llm-first-time-banner">
            <div class="banner-sparkle">✨</div>
            <div class="banner-body">
              <strong>Welcome to your AI-Powered Design System!</strong>
              <p>Connect your preferred LLM to unlock instant prompt-to-component synthesis, brand guidelines extraction, and automated copywriting. You can change your model anytime from the top bar.</p>
            </div>
          </div>
        ` : ''}

        <!-- Architecture Overview Banner -->
        <div class="llm-architecture-strip">
          <div class="arch-item">
            <span class="arch-dot local"></span>
            <span><strong>100% Local:</strong> Previews, token math, contract editor &amp; Figma bridge</span>
          </div>
          <div class="arch-item">
            <span class="arch-dot cloud"></span>
            <span><strong>On-Demand LLM:</strong> Natural language generation, brand extraction &amp; docs</span>
          </div>
        </div>

        <!-- Body -->
        <div class="llm-modal-body">
          <!-- Provider Picker Cards -->
          <div class="form-group">
            <label class="section-label">Select LLM Provider</label>
            <div class="llm-provider-grid" id="llm-provider-grid">
              ${DEFAULT_LLM_PROVIDERS.map(p => `
                <div class="llm-provider-card ${p.id === this.currentProviderId ? 'selected' : ''}" data-provider-id="${p.id}">
                  <div class="provider-header">
                    <span class="provider-icon">${p.icon}</span>
                    <span class="provider-name">${p.name}</span>
                    ${p.badge ? `<span class="provider-rec-badge">${p.badge}</span>` : ''}
                  </div>
                  <div class="provider-desc">${p.description}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Dynamic Provider Configuration Fields -->
          <div id="llm-provider-fields-container" class="llm-fields-container">
            ${this.renderProviderFields(this.currentProviderId, config)}
          </div>

          <!-- Test Connection Status Area -->
          <div id="llm-test-result-area" class="llm-test-result-area" style="display: none;"></div>
        </div>

        <!-- Footer -->
        <div class="adsc-modal-footer">
          <div class="footer-left-actions">
            <button type="button" class="adsc-btn btn-secondary" id="btn-test-llm-connection">
              <span class="test-btn-spinner" style="display: none;">⏳</span>
              <span class="test-btn-text">⚡ Test Connection</span>
            </button>
            <button type="button" class="adsc-btn btn-ghost text-muted" id="btn-reset-llm-keys" title="Clear stored API keys from browser">
              Clear Keys
            </button>
          </div>

          <div class="footer-right-actions">
            <button type="button" class="adsc-btn btn-secondary" id="btn-use-local-engine" title="Use 100% offline rule-based generator">
              Use Local Engine (Offline)
            </button>
            <button type="button" class="adsc-btn btn-primary" id="btn-save-llm-config">
              ${ICON_SVGS.check || '✓'} <span>Save &amp; Activate</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    this.attachEvents(isFirstTime);
  }

  renderProviderFields(providerId, currentConfig = {}) {
    const prov = DEFAULT_LLM_PROVIDERS.find(p => p.id === providerId) || DEFAULT_LLM_PROVIDERS[0];
    const isLocal = prov.id === 'local';
    const isOllama = prov.id === 'ollama';
    const savedKey = (currentConfig.provider === providerId ? currentConfig.apiKey : '') || '';
    const selectedModel = (currentConfig.provider === providerId ? currentConfig.model : prov.defaultModel) || prov.defaultModel;
    const customBaseUrl = currentConfig.baseUrl || prov.defaultBaseUrl || '';

    if (isLocal) {
      return `
        <div class="local-engine-banner">
          <div class="local-icon">💻</div>
          <div class="local-text">
            <strong>Local Algorithmic Generator Active</strong>
            <p>The app will use built-in deterministic algorithms to synthesize components and parse tokens. No external API keys or internet connection required.</p>
          </div>
        </div>
      `;
    }

    return `
      <!-- Model Dropdown -->
      <div class="form-group">
        <div class="label-row">
          <label for="llm-model-select">Select Model</label>
          <span class="label-hint">Provider: <strong>${prov.name}</strong></span>
        </div>
        <select id="llm-model-select" class="adsc-select">
          ${prov.models.map(m => `
            <option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name}</option>
          `).join('')}
          <option value="custom" ${!prov.models.some(m => m.id === selectedModel) && selectedModel ? 'selected' : ''}>Custom Model Identifier...</option>
        </select>
        <div id="custom-model-input-wrap" style="display: ${!prov.models.some(m => m.id === selectedModel) && selectedModel ? 'block' : 'none'}; margin-top: 8px;">
          <input type="text" id="llm-custom-model-input" class="adsc-input" placeholder="Enter model name (e.g. gpt-4o-2024-11-20)" value="${selectedModel}" />
        </div>
      </div>

      <!-- API Key Field -->
      ${prov.requiresKey ? `
        <div class="form-group">
          <div class="label-row">
            <label for="llm-api-key-input">API Key <span class="required-star">*</span></label>
            ${prov.keyHelpUrl ? `<a href="${prov.keyHelpUrl}" target="_blank" rel="noopener noreferrer" class="key-help-link">Get API Key ↗</a>` : ''}
          </div>
          <div class="input-with-action">
            <input 
              type="password" 
              id="llm-api-key-input" 
              class="adsc-input" 
              placeholder="${prov.keyPlaceholder || 'Enter your API key...'}" 
              value="${this.escapeHtml(savedKey)}" 
              autocomplete="off"
            />
            <button type="button" class="input-action-btn" id="btn-toggle-key-visibility" title="Show / Hide Key">
              👁
            </button>
          </div>
          <p class="field-help-text">Your API key is stored securely in your browser's local storage and used only for design system tasks.</p>
        </div>
      ` : ''}

      <!-- Custom Base URL (Collapsible for Ollama or Proxies) -->
      <div class="form-group">
        <details class="advanced-settings-details" ${isOllama || (customBaseUrl && customBaseUrl !== prov.defaultBaseUrl) ? 'open' : ''}>
          <summary class="advanced-settings-summary">
            <span>⚙ Custom Endpoint / Base URL ${isOllama ? '(Required for Ollama)' : '(Optional Proxy / Azure / LocalAI)'}</span>
          </summary>
          <div class="advanced-fields-box">
            <input 
              type="text" 
              id="llm-base-url-input" 
              class="adsc-input" 
              placeholder="${prov.defaultBaseUrl || 'https://...'}" 
              value="${this.escapeHtml(customBaseUrl)}" 
            />
            <p class="field-help-text">Default: <code>${prov.defaultBaseUrl || 'Standard provider endpoint'}</code></p>
          </div>
        </details>
      </div>
    `;
  }

  attachEvents(isFirstTime) {
    if (!this.modalEl) return;

    // Close buttons
    const closeBtn = this.modalEl.querySelector('#btn-close-llm-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.handleDismiss(isFirstTime));

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.handleDismiss(isFirstTime);
    });

    // Provider Card Selection
    const cards = this.modalEl.querySelectorAll('.llm-provider-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const pId = card.getAttribute('data-provider-id');
        this.currentProviderId = pId;
        cards.forEach(c => c.classList.toggle('selected', c.getAttribute('data-provider-id') === pId));
        this.updateFieldsContainer();
      });
    });

    // Model select change (show custom input if needed)
    this.bindModelSelectEvents();

    // Toggle key visibility
    this.bindKeyVisibilityEvents();

    // Test Connection
    const testBtn = this.modalEl.querySelector('#btn-test-llm-connection');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.runConnectionTest());
    }

    // Save & Activate
    const saveBtn = this.modalEl.querySelector('#btn-save-llm-config');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveConfiguration(true));
    }

    // Use Local Engine
    const localBtn = this.modalEl.querySelector('#btn-use-local-engine');
    if (localBtn) {
      localBtn.addEventListener('click', () => {
        this.currentProviderId = 'local';
        this.saveConfiguration(true, {
          provider: 'local',
          model: 'rule-based-engine',
          apiKey: '',
          baseUrl: ''
        });
      });
    }

    // Reset Keys
    const resetBtn = this.modalEl.querySelector('#btn-reset-llm-keys');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Clear saved API credentials and reset to default?')) {
          store.setLLMConfig({
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            apiKey: '',
            baseUrl: ''
          });
          this.currentProviderId = 'gemini';
          this.updateFieldsContainer();
          this.showStatus('Credentials cleared from storage.', 'info');
        }
      });
    }
  }

  updateFieldsContainer() {
    const container = this.modalEl.querySelector('#llm-provider-fields-container');
    if (!container) return;
    const config = store.getLLMConfig();
    container.innerHTML = this.renderProviderFields(this.currentProviderId, config);
    this.bindModelSelectEvents();
    this.bindKeyVisibilityEvents();
    this.clearStatus();
  }

  bindModelSelectEvents() {
    const modelSelect = this.modalEl.querySelector('#llm-model-select');
    const customWrap = this.modalEl.querySelector('#custom-model-input-wrap');
    if (modelSelect && customWrap) {
      modelSelect.addEventListener('change', () => {
        customWrap.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
      });
    }
  }

  bindKeyVisibilityEvents() {
    const toggleBtn = this.modalEl.querySelector('#btn-toggle-key-visibility');
    const keyInput = this.modalEl.querySelector('#llm-api-key-input');
    if (toggleBtn && keyInput) {
      toggleBtn.addEventListener('click', () => {
        const isPass = keyInput.type === 'password';
        keyInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁';
      });
    }
  }

  collectFormValues() {
    const modelSelect = this.modalEl.querySelector('#llm-model-select');
    const customInput = this.modalEl.querySelector('#llm-custom-model-input');
    let model = modelSelect ? modelSelect.value : 'rule-based-engine';
    if (model === 'custom' && customInput && customInput.value.trim()) {
      model = customInput.value.trim();
    }

    const keyInput = this.modalEl.querySelector('#llm-api-key-input');
    const apiKey = keyInput ? keyInput.value.trim() : '';

    const urlInput = this.modalEl.querySelector('#llm-base-url-input');
    const baseUrl = urlInput ? urlInput.value.trim() : '';

    return {
      provider: this.currentProviderId,
      model,
      apiKey,
      baseUrl
    };
  }

  async runConnectionTest() {
    const values = this.collectFormValues();
    const testBtn = this.modalEl.querySelector('#btn-test-llm-connection');
    const spinner = this.modalEl.querySelector('.test-btn-spinner');
    const btnText = this.modalEl.querySelector('.test-btn-text');

    if (testBtn) testBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Testing...';
    this.showStatus('Connecting to model endpoint...', 'pending');

    try {
      const res = await llmService.testConnection(values);
      if (res.success) {
        this.showStatus(`✓ ${res.message || 'Connection successful!'} (${res.latencyMs || 0}ms)`, 'success');
      } else {
        this.showStatus(`✗ Connection failed: ${res.error || 'Check API key or endpoint'}`, 'error');
      }
    } catch (err) {
      this.showStatus(`✗ Error: ${err.message}`, 'error');
    } finally {
      if (testBtn) testBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (btnText) btnText.textContent = '⚡ Test Connection';
    }
  }

  saveConfiguration(showToast = true, explicitValues = null) {
    const values = explicitValues || this.collectFormValues();
    store.setLLMConfig(values);
    store.setLLMOnboardingCompleted(true);

    if (showToast) {
      const provInfo = store.getLLMProviderInfo(values.provider);
      this.notifyUser(`✓ AI Model activated: ${provInfo.name} (${values.model})`, 'success');
    }

    this.close();
  }

  handleDismiss(isFirstTime) {
    if (isFirstTime) {
      store.setLLMOnboardingCompleted(true);
    }
    this.close();
  }

  showStatus(msg, type = 'info') {
    const area = this.modalEl.querySelector('#llm-test-result-area');
    if (!area) return;
    area.style.display = 'flex';
    area.className = `llm-test-result-area ${type}`;
    area.innerHTML = `
      <div class="result-badge">${type === 'success' ? '✓' : (type === 'error' ? '✗' : 'ℹ')}</div>
      <div class="result-msg">${this.escapeHtml(msg)}</div>
    `;
  }

  clearStatus() {
    const area = this.modalEl.querySelector('#llm-test-result-area');
    if (!area) return;
    area.style.display = 'none';
    area.innerHTML = '';
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
    }, 4000);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
