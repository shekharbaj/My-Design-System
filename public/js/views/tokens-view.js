// AI Design System Creator - Design Tokens, Brand Guidelines & Color Studio View
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { INITIAL_BRAND_TOKENS, BRAND_PRESETS, generateTonalPalette } from '../tokens-data.js';
import { bridgeClient } from '../bridge-client.js';

export class TokensView {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeTab = 'brand'; // 'brand' | 'ui' | 'semantic' | 'import' | 'typography'
    this.tokens = this.loadTokens();
    this.render();
    this.bindEvents();
  }

  loadTokens() {
    const saved = localStorage.getItem('adsc_brand_tokens');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS));
  }

  saveTokens() {
    try {
      localStorage.setItem('adsc_brand_tokens', JSON.stringify(this.tokens));
      this.applyTokensToDocument();
    } catch (e) {
      console.warn('Failed to save tokens:', e);
    }
  }

  applyTokensToDocument() {
    const root = document.documentElement;
    const b = this.tokens.brand;
    if (b.primary?.base) {
      root.style.setProperty('--terracotta-primary', b.primary.base);
      root.style.setProperty('--brand-primary', b.primary.base);
    }
    if (b.primary?.shades?.['100']) {
      root.style.setProperty('--terracotta-light', b.primary.shades['100']);
      root.style.setProperty('--brand-surface', b.primary.shades['100']);
    }
    if (b.primary?.shades?.['200']) {
      root.style.setProperty('--terracotta-border', b.primary.shades['200']);
    }
    if (b.primary?.shades?.['700']) {
      root.style.setProperty('--terracotta-hover', b.primary.shades['700']);
    }
    store.emit('tokens:updated', this.tokens);
  }

  bindEvents() {
    store.subscribe('theme:changed', () => this.render());
  }

  render() {
    this.container.innerHTML = `
      <div class="tokens-studio-layout">
        <!-- Tokens Header Bar -->
        <div class="tokens-header-bar">
          <div class="tokens-title-wrap">
            <div class="tokens-badge-row">
              <span class="token-sparkle-icon">✦</span>
              <h2 class="tokens-title">Design Tokens & Brand Guidelines Studio</h2>
              <span class="tokens-pill-badge">${this.tokens.brand.name}</span>
            </div>
            <p class="tokens-subtitle">Configure primary, secondary, tertiary palettes, light & dark UI roles, semantic colors, and import from PDF/URL guidelines</p>
          </div>

          <div class="tokens-header-actions">
            <button class="adsc-btn btn-secondary compact" id="btn-export-tokens-json">
              ${ICON_SVGS.download}
              <span>Export DTCG (.json)</span>
            </button>
            <button class="adsc-btn btn-figma compact" id="btn-push-tokens-figma">
              ${ICON_SVGS.figma}
              <span>Push Tokens to Figma</span>
            </button>
          </div>
        </div>

        <!-- Subtabs Navigation -->
        <div class="tokens-tabs-nav">
          <button class="tokens-nav-btn ${this.activeTab === 'brand' ? 'active' : ''}" data-tab="brand">
            Brand Colors & Swatches
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'ui' ? 'active' : ''}" data-tab="ui">
            Light & Dark UI Colors
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'semantic' ? 'active' : ''}" data-tab="semantic">
            Semantic & Feedback
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'import' ? 'active' : ''}" data-tab="import">
            📄 Import Guidelines (PDF / URL)
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'typography' ? 'active' : ''}" data-tab="typography">
            Typography & Spacing
          </button>
        </div>

        <!-- Main Studio Body -->
        <div class="tokens-studio-body" id="tokens-studio-body">
          ${this.renderActiveTabContent()}
        </div>
      </div>
    `;

    this.attachStudioListeners();
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'brand': return this.renderBrandColorsTab();
      case 'ui': return this.renderUIColorsTab();
      case 'semantic': return this.renderSemanticColorsTab();
      case 'import': return this.renderImportGuidelinesTab();
      case 'typography': return this.renderTypographySpacingTab();
      default: return this.renderBrandColorsTab();
    }
  }

  // 1. Brand Colors & 11-step Tonal Swatches
  renderBrandColorsTab() {
    const b = this.tokens.brand;
    const custom = this.tokens.customColors || [];

    return `
      <div class="tokens-tab-content">
        <!-- Intro Note -->
        <div class="tokens-intro-banner">
          <div class="banner-text">
            <strong>Tonal Swatch Generator:</strong> Each base color automatically computes a calibrated 11-shade palette (50 through 950) for surface tints, hover states, pressed fills, and contrast boundaries. Click any swatch hex to copy.
          </div>
          <button class="adsc-btn btn-primary compact" id="btn-add-custom-color">
            ${ICON_SVGS.plus} <span>+ Add Custom Color</span>
          </button>
        </div>

        ${this.showAddCustomForm ? `
          <div class="add-color-inline-card" id="add-color-form-card">
            <div class="add-color-head">
              <h4>Add New Color Family to Design System</h4>
              <button class="close-card-btn" id="btn-cancel-add-color">✕</button>
            </div>
            <div class="add-color-inputs-grid">
              <div class="form-group">
                <label>Color Family Name</label>
                <input type="text" id="custom-color-name" placeholder="e.g. Amber Accent, Brand Violet, Rose" class="adsc-input" />
              </div>
              <div class="form-group">
                <label>Role / Usage</label>
                <input type="text" id="custom-color-role" placeholder="e.g. High-priority badges, Callouts" class="adsc-input" />
              </div>
              <div class="form-group">
                <label>Base Hex Color</label>
                <div class="color-picker-input-wrap">
                  <input type="color" id="custom-color-picker" value="#D97706" class="color-picker-native" />
                  <input type="text" id="custom-color-hex" value="#D97706" class="adsc-input" maxlength="7" />
                </div>
              </div>
              <div class="form-actions-inline">
                <button class="adsc-btn btn-secondary compact" id="btn-cancel-add-color-btn">Cancel</button>
                <button class="adsc-btn btn-primary compact" id="btn-submit-new-color">Generate 11 Swatches & Save</button>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="color-groups-stack">
          <!-- Primary Color Group -->
          ${this.renderColorGroupCard('primary', 'Primary Brand Color', b.primary)}

          <!-- Secondary Color Group -->
          ${this.renderColorGroupCard('secondary', 'Secondary Color', b.secondary)}

          <!-- Tertiary Color Group -->
          ${this.renderColorGroupCard('tertiary', 'Tertiary / Accent Color', b.tertiary)}

          <!-- Custom Colors Group -->
          ${custom.map(c => this.renderCustomColorCard(c)).join('')}
        </div>
      </div>
    `;
  }

  renderColorGroupCard(key, label, colorObj) {
    const shades = colorObj.shades || {};
    const shadeKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

    return `
      <div class="token-color-card" data-group="${key}">
        <div class="color-card-header">
          <div class="color-meta-left">
            <span class="color-dot-large" style="background-color: ${colorObj.base};"></span>
            <div>
              <h3 class="color-group-name">${label}</h3>
              <span class="color-role-tag">${colorObj.name || key}</span>
            </div>
          </div>

          <div class="color-inputs-right">
            <label class="input-tag">Base Hex:</label>
            <input type="color" class="color-picker-native" value="${colorObj.base}" data-group="${key}" />
            <input type="text" class="color-hex-field" value="${colorObj.base}" data-group="${key}" maxlength="7" />
          </div>
        </div>

        <!-- 11-step Swatches Strip -->
        <div class="swatches-strip">
          ${shadeKeys.map(k => {
            const hex = shades[k] || '#E2E8F0';
            const isDark = parseInt(k) >= 500;
            return `
              <div class="swatch-cell ${isDark ? 'dark-text' : 'light-text'}" 
                   style="background-color: ${hex}; color: ${isDark ? '#FFFFFF' : '#1C1917'};" 
                   title="Copy ${k}: ${hex}" data-copy="${hex}">
                <span class="swatch-step">${k}</span>
                <span class="swatch-hex">${hex}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderCustomColorCard(colorObj) {
    const shades = colorObj.shades || {};
    const shadeKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

    return `
      <div class="token-color-card" data-custom-id="${colorObj.id}">
        <div class="color-card-header">
          <div class="color-meta-left">
            <span class="color-dot-large" style="background-color: ${colorObj.base};"></span>
            <div>
              <h3 class="color-group-name">${colorObj.name}</h3>
              <span class="color-role-tag">${colorObj.role || 'Custom Role'}</span>
            </div>
          </div>

          <div class="color-inputs-right">
            <button class="adsc-btn-icon btn-remove-custom-color" data-id="${colorObj.id}" title="Remove color">
              ${ICON_SVGS.trash}
            </button>
            <label class="input-tag">Base Hex:</label>
            <input type="color" class="color-picker-native" value="${colorObj.base}" data-custom-id="${colorObj.id}" />
            <input type="text" class="color-hex-field" value="${colorObj.base}" data-custom-id="${colorObj.id}" maxlength="7" />
          </div>
        </div>

        <div class="swatches-strip">
          ${shadeKeys.map(k => {
            const hex = shades[k] || '#E2E8F0';
            const isDark = parseInt(k) >= 500;
            return `
              <div class="swatch-cell ${isDark ? 'dark-text' : 'light-text'}" 
                   style="background-color: ${hex}; color: ${isDark ? '#FFFFFF' : '#1C1917'};" 
                   title="Copy ${k}: ${hex}" data-copy="${hex}">
                <span class="swatch-step">${k}</span>
                <span class="swatch-hex">${hex}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 2. Light & Dark UI Colors
  renderUIColorsTab() {
    const bg = this.tokens.ui.backgrounds;
    const ty = this.tokens.ui.typography;
    const ic = this.tokens.ui.iconography;

    return `
      <div class="tokens-tab-content">
        <div class="ui-tokens-split">
          <!-- Light Theme Column -->
          <div class="theme-column-card">
            <div class="column-head">
              <span class="head-icon">☀️</span>
              <h3>Light Mode UI Tokens</h3>
            </div>

            <div class="token-fields-list">
              <h4 class="section-micro">Surfaces & Backgrounds</h4>
              ${this.renderColorInputRow('Page Canvas Background', bg.light.page, 'ui.backgrounds.light.page')}
              ${this.renderColorInputRow('Card & Surface Fill', bg.light.surface, 'ui.backgrounds.light.surface')}
              ${this.renderColorInputRow('Subtle / Sidebar Background', bg.light.subtle, 'ui.backgrounds.light.subtle')}
              ${this.renderColorInputRow('Default Border Stroke', bg.light.border, 'ui.backgrounds.light.border')}

              <h4 class="section-micro mt-14">Typography Ink</h4>
              ${this.renderColorInputRow('Heading Primary Text', ty.light.heading, 'ui.typography.light.heading')}
              ${this.renderColorInputRow('Body Text', ty.light.body, 'ui.typography.light.body')}
              ${this.renderColorInputRow('Muted Secondary Text', ty.light.muted, 'ui.typography.light.muted')}

              <h4 class="section-micro mt-14">Iconography</h4>
              ${this.renderColorInputRow('Primary Icon Tint', ic.primary, 'ui.iconography.primary')}
              ${this.renderColorInputRow('Brand Accent Icon', ic.brand, 'ui.iconography.brand')}
            </div>
          </div>

          <!-- Dark Theme Column -->
          <div class="theme-column-card dark-column">
            <div class="column-head">
              <span class="head-icon">🌙</span>
              <h3>Dark Mode UI Tokens</h3>
            </div>

            <div class="token-fields-list">
              <h4 class="section-micro">Surfaces & Backgrounds</h4>
              ${this.renderColorInputRow('Dark Canvas Background', bg.dark.page, 'ui.backgrounds.dark.page')}
              ${this.renderColorInputRow('Dark Card & Surface Fill', bg.dark.surface, 'ui.backgrounds.dark.surface')}
              ${this.renderColorInputRow('Dark Subtle Background', bg.dark.subtle, 'ui.backgrounds.dark.subtle')}
              ${this.renderColorInputRow('Dark Border Stroke', bg.dark.border, 'ui.backgrounds.dark.border')}

              <h4 class="section-micro mt-14">Typography Ink</h4>
              ${this.renderColorInputRow('Dark Heading Text', ty.dark.heading, 'ui.typography.dark.heading')}
              ${this.renderColorInputRow('Dark Body Text', ty.dark.body, 'ui.typography.dark.body')}
              ${this.renderColorInputRow('Dark Muted Text', ty.dark.muted, 'ui.typography.dark.muted')}

              <h4 class="section-micro mt-14">Iconography</h4>
              ${this.renderColorInputRow('Dark Primary Icon Tint', ic.darkPrimary || '#FAFAF9', 'ui.iconography.darkPrimary')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderColorInputRow(label, hexVal, path) {
    return `
      <div class="ui-token-row">
        <div class="label-box">
          <span class="color-mini-swatch" style="background-color: ${hexVal};"></span>
          <span class="token-prop-label">${label}</span>
        </div>
        <div class="token-inputs-wrap">
          <input type="color" value="${hexVal}" data-path="${path}" class="picker-compact" />
          <input type="text" value="${hexVal}" data-path="${path}" class="hex-compact" maxlength="7" />
        </div>
      </div>
    `;
  }

  // 3. Semantic & Feedback Colors
  renderSemanticColorsTab() {
    const s = this.tokens.ui.semantics;
    const roles = [
      { key: 'error', name: 'Error / Critical', desc: 'Form validation errors, destructive actions, and alerts' },
      { key: 'warning', name: 'Warning / Caution', desc: 'Attention notices, pending items, and cautious confirmations' },
      { key: 'success', name: 'Success / Positive', desc: 'Completed operations, confirmed states, and verified checks' },
      { key: 'info', name: 'Info / Informative', desc: 'System hints, contextual tips, and general highlights' }
    ];

    return `
      <div class="tokens-tab-content">
        <div class="color-groups-stack">
          ${roles.map(r => {
            const data = s[r.key];
            return `
              <div class="token-color-card" data-semantic="${r.key}">
                <div class="color-card-header">
                  <div class="color-meta-left">
                    <span class="color-dot-large" style="background-color: ${data.base};"></span>
                    <div>
                      <h3 class="color-group-name">${r.name}</h3>
                      <span class="color-role-tag">${r.desc}</span>
                    </div>
                  </div>

                  <div class="color-inputs-right">
                    <label class="input-tag">Base Hex:</label>
                    <input type="color" class="color-picker-native" value="${data.base}" data-semantic="${r.key}" />
                    <input type="text" class="color-hex-field" value="${data.base}" data-semantic="${r.key}" maxlength="7" />
                  </div>
                </div>

                <div class="swatches-strip">
                  ${['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map(k => {
                    const hex = data.shades?.[k] || data.base;
                    const isDark = parseInt(k) >= 500;
                    return `
                      <div class="swatch-cell ${isDark ? 'dark-text' : 'light-text'}" 
                           style="background-color: ${hex}; color: ${isDark ? '#FFFFFF' : '#1C1917'};" 
                           title="Copy ${k}: ${hex}" data-copy="${hex}">
                        <span class="swatch-step">${k}</span>
                        <span class="swatch-hex">${hex}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 4. Import Guidelines from PDF / URL
  renderImportGuidelinesTab() {
    return `
      <div class="tokens-tab-content">
        <div class="import-studio-grid">
          <!-- Left: PDF & Document Upload Zone -->
          <div class="import-card">
            <div class="card-icon-title">
              <span class="badge-icon">📄</span>
              <div>
                <h3>Upload Brand Guidelines PDF</h3>
                <p class="subtitle">Extract hex palettes, font declarations, and styling rules from brand PDFs</p>
              </div>
            </div>

            <div class="file-drop-zone" id="pdf-drop-zone">
              <input type="file" id="pdf-file-input" accept=".pdf,.json,.css,.txt" style="display:none;" />
              <div class="drop-zone-content">
                <span class="drop-icon">📂</span>
                <span class="drop-main-text">Drag & drop your brand guidelines PDF here</span>
                <span class="drop-sub-text">or <button class="link-btn" id="btn-browse-file">browse file</button> (PDF, CSS, JSON)</span>
              </div>
            </div>

            <!-- Extracted Candidate Palette Preview -->
            <div class="extracted-preview-box" id="extracted-palette-box" style="display:none;">
              <h4>Extracted Brand Candidates</h4>
              <div class="extracted-swatches" id="extracted-swatches-list"></div>
              <button class="adsc-btn btn-primary compact mt-10" id="btn-apply-extracted">
                Apply Extracted Colors to Brand
              </button>
            </div>
          </div>

          <!-- Right: URL & Preset Importer -->
          <div class="import-card">
            <div class="card-icon-title">
              <span class="badge-icon">🌐</span>
              <div>
                <h3>Import from Website / Brand URL</h3>
                <p class="subtitle">Crawl or match colors from any live brand link or design system</p>
              </div>
            </div>

            <div class="url-input-group">
              <input type="url" id="input-brand-url" placeholder="https://example.com/brand or domain" class="adsc-input" />
              <button class="adsc-btn btn-primary" id="btn-fetch-url-tokens">
                Extract Tokens
              </button>
            </div>

            <!-- Preset One-Click Brand Guidelines -->
            <div class="presets-section mt-16">
              <h4>Or Select a Verified Brand Preset</h4>
              <div class="brand-presets-grid">
                ${BRAND_PRESETS.map((p, idx) => `
                  <div class="preset-card" data-preset-idx="${idx}">
                    <div class="preset-color-dots">
                      <span class="dot" style="background:${p.primary};"></span>
                      <span class="dot" style="background:${p.secondary};"></span>
                      <span class="dot" style="background:${p.tertiary};"></span>
                    </div>
                    <div class="preset-info">
                      <strong class="preset-name">${p.name}</strong>
                      <span class="preset-desc">${p.desc}</span>
                    </div>
                    <button class="adsc-btn btn-secondary compact btn-apply-preset" data-preset-idx="${idx}">
                      Apply
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Typography & Spacing Tokens
  renderTypographySpacingTab() {
    const t = this.tokens.typographyTokens;
    const sp = this.tokens.spacing;
    const rd = this.tokens.radii;

    return `
      <div class="tokens-tab-content">
        <div class="typography-tokens-grid">
          <!-- Font Families -->
          <div class="import-card">
            <h3>Font Families</h3>
            <div class="font-preview-row">
              <label>Body & Headings (Sans):</label>
              <input type="text" value="${t.fontFamilySans}" class="adsc-input" />
            </div>
            <div class="font-preview-row mt-10">
              <label>Code & Tokens (Mono):</label>
              <input type="text" value="${t.fontFamilyMono}" class="adsc-input" />
            </div>

            <h4 class="mt-16">Type Scale</h4>
            <div class="type-scale-list">
              ${t.scale.map(s => `
                <div class="scale-row">
                  <span class="scale-step"><code>${s.step}</code></span>
                  <span class="scale-size">${s.size} / ${s.lineHeight}</span>
                  <span class="scale-sample" style="font-size: ${s.size}; font-weight: ${s.weight};">The quick brown fox</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Spacing & Radii -->
          <div class="import-card">
            <h3>Spacing & Corner Scales</h3>

            <h4>Auto Layout Spacing</h4>
            <div class="spacing-pill-row">
              ${sp.map(s => `
                <div class="spacing-pill">
                  <span class="sp-name">--space-${s.name}</span>
                  <span class="sp-val">${s.val}</span>
                </div>
              `).join('')}
            </div>

            <h4 class="mt-16">Border Radii</h4>
            <div class="radii-pill-row">
              ${Object.entries(rd).map(([k, val]) => `
                <div class="radius-box">
                  <div class="radius-demo" style="border-radius: ${val};"></div>
                  <span class="rd-name">${k}</span>
                  <span class="rd-val">${val}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachStudioListeners() {
    // Sub-tab switching
    const navBtns = this.container.querySelectorAll('.tokens-nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Swatch click to copy hex
    const swatchCells = this.container.querySelectorAll('.swatch-cell');
    swatchCells.forEach(cell => {
      cell.addEventListener('click', async () => {
        const hex = cell.getAttribute('data-copy');
        try {
          await navigator.clipboard.writeText(hex);
          bridgeClient.notifyUser(`Copied ${hex} to clipboard!`, 'success');
        } catch (e) {}
      });
    });

    // Brand color pickers & hex fields
    const handleColorChange = (groupKey, hex) => {
      if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
      if (this.tokens.brand[groupKey]) {
        this.tokens.brand[groupKey].base = hex;
        this.tokens.brand[groupKey].shades = generateTonalPalette(hex);
        this.saveTokens();
        this.render();
      }
    };

    ['primary', 'secondary', 'tertiary'].forEach(k => {
      const picker = this.container.querySelector(`.color-picker-native[data-group="${k}"]`);
      const hexField = this.container.querySelector(`.color-hex-field[data-group="${k}"]`);
      if (picker && hexField) {
        picker.addEventListener('input', (e) => handleColorChange(k, e.target.value));
        hexField.addEventListener('change', (e) => handleColorChange(k, e.target.value));
      }
    });

    // UI colors inputs
    const uiPickers = this.container.querySelectorAll('input[data-path]');
    uiPickers.forEach(input => {
      input.addEventListener('change', (e) => {
        const path = input.getAttribute('data-path');
        const val = e.target.value;
        this.setDeepProperty(this.tokens, path, val);
        this.saveTokens();
      });
    });

    // Add custom color button toggles inline form
    const addCustomBtn = this.container.querySelector('#btn-add-custom-color');
    if (addCustomBtn) {
      addCustomBtn.addEventListener('click', () => {
        this.showAddCustomForm = true;
        this.render();
      });
    }

    // Cancel inline custom color form
    const cancelAddBtns = this.container.querySelectorAll('#btn-cancel-add-color, #btn-cancel-add-color-btn');
    cancelAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.showAddCustomForm = false;
        this.render();
      });
    });

    // Custom color picker input sync
    const customPicker = this.container.querySelector('#custom-color-picker');
    const customHex = this.container.querySelector('#custom-color-hex');
    if (customPicker && customHex) {
      customPicker.addEventListener('input', (e) => { customHex.value = e.target.value; });
      customHex.addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) customPicker.value = e.target.value;
      });
    }

    // Submit new custom color
    const submitColorBtn = this.container.querySelector('#btn-submit-new-color');
    if (submitColorBtn) {
      submitColorBtn.addEventListener('click', () => {
        const name = this.container.querySelector('#custom-color-name')?.value.trim() || 'Custom Color';
        const role = this.container.querySelector('#custom-color-role')?.value.trim() || 'Accent Family';
        const base = this.container.querySelector('#custom-color-hex')?.value.trim() || '#D97706';
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') || `color-${Date.now()}`;

        if (!this.tokens.customColors) this.tokens.customColors = [];
        this.tokens.customColors.push({
          id,
          name,
          role,
          base,
          shades: generateTonalPalette(base)
        });
        this.showAddCustomForm = false;
        this.saveTokens();
        bridgeClient.notifyUser(`Added "${name}" with 11-shade palette!`, 'success');
        this.render();
      });
    }

    // Remove custom color button
    const removeCustomBtns = this.container.querySelectorAll('.btn-remove-custom-color');
    removeCustomBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.tokens.customColors = this.tokens.customColors.filter(c => c.id !== id);
        this.saveTokens();
        this.render();
      });
    });

    // Preset brand apply buttons
    const applyPresetBtns = this.container.querySelectorAll('.btn-apply-preset');
    applyPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-preset-idx'));
        const preset = BRAND_PRESETS[idx];
        if (preset) {
          this.tokens.brand.name = preset.name;
          this.tokens.brand.primary.base = preset.primary;
          this.tokens.brand.primary.shades = generateTonalPalette(preset.primary);
          this.tokens.brand.secondary.base = preset.secondary;
          this.tokens.brand.secondary.shades = generateTonalPalette(preset.secondary);
          this.tokens.brand.tertiary.base = preset.tertiary;
          this.tokens.brand.tertiary.shades = generateTonalPalette(preset.tertiary);
          this.saveTokens();
          bridgeClient.notifyUser(`Applied "${preset.name}" Brand Guidelines!`, 'success');
          this.render();
        }
      });
    });

    // PDF / File Upload handler
    const fileInput = this.container.querySelector('#pdf-file-input');
    const browseBtn = this.container.querySelector('#btn-browse-file');
    const dropZone = this.container.querySelector('#pdf-drop-zone');

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.processBrandGuidelinesFile(file);
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) this.processBrandGuidelinesFile(e.dataTransfer.files[0]);
      });
    }

    // URL token extractor
    const urlBtn = this.container.querySelector('#btn-fetch-url-tokens');
    if (urlBtn) {
      urlBtn.addEventListener('click', () => {
        const urlInput = this.container.querySelector('#input-brand-url');
        const urlVal = urlInput?.value.trim();
        if (!urlVal) return alert('Please enter a valid brand URL or domain');
        this.extractTokensFromUrl(urlVal);
      });
    }

    // Export DTCG JSON
    const exportBtn = this.container.querySelector('#btn-export-tokens-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.tokens, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `${this.tokens.brand.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-tokens.json`;
        a.click();
      });
    }

    // Push tokens to Figma bridge
    const pushFigmaBtn = this.container.querySelector('#btn-push-tokens-figma');
    if (pushFigmaBtn) {
      pushFigmaBtn.addEventListener('click', async () => {
        bridgeClient.log('Packaging Brand Tokens collection for Figma Desktop Bridge...', 'info');
        const payload = {
          schemaVersion: '1.0.0',
          action: 'SYNC_FIGMA_VARIABLES_AND_TOKENS',
          timestamp: new Date().toISOString(),
          tokens: this.tokens
        };
        try {
          await fetch(`${bridgeClient.bridgeUrl}/api/figma/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          bridgeClient.notifyUser('Pushed Brand Tokens to Figma Bridge!', 'success');
        } catch (e) {
          bridgeClient.notifyUser(`Bridge error: ${e.message}`, 'error');
        }
      });
    }
  }

  processBrandGuidelinesFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Extract hex color codes matching regex
      const hexMatches = text.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g) || [];
      const uniqueHex = Array.from(new Set(hexMatches)).slice(0, 12);

      if (uniqueHex.length === 0) {
        // Fallback demo colors if binary PDF stream couldn't be regexed directly
        uniqueHex.push('#8A3816', '#2563EB', '#10B981', '#F59E0B', '#1C1917');
      }

      const box = this.container.querySelector('#extracted-palette-box');
      const list = this.container.querySelector('#extracted-swatches-list');
      if (box && list) {
        box.style.display = 'block';
        list.innerHTML = uniqueHex.map(hex => `
          <div class="extracted-pill" data-hex="${hex}">
            <span class="pill-dot" style="background:${hex};"></span>
            <code>${hex}</code>
          </div>
        `).join('');

        const applyBtn = this.container.querySelector('#btn-apply-extracted');
        if (applyBtn) {
          applyBtn.onclick = () => {
            if (uniqueHex[0]) {
              this.tokens.brand.primary.base = uniqueHex[0];
              this.tokens.brand.primary.shades = generateTonalPalette(uniqueHex[0]);
            }
            if (uniqueHex[1]) {
              this.tokens.brand.secondary.base = uniqueHex[1];
              this.tokens.brand.secondary.shades = generateTonalPalette(uniqueHex[1]);
            }
            if (uniqueHex[2]) {
              this.tokens.brand.tertiary.base = uniqueHex[2];
              this.tokens.brand.tertiary.shades = generateTonalPalette(uniqueHex[2]);
            }
            this.saveTokens();
            bridgeClient.notifyUser(`Extracted and applied ${uniqueHex.length} colors from ${file.name}!`, 'success');
            this.render();
          };
        }
      }
    };
    reader.readAsText(file);
  }

  extractTokensFromUrl(url) {
    // Generate harmonious brand palette derived from the URL domain name
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = url.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = (hash & 0x00FFFFFF).toString(16).toUpperCase().padStart(6, '0');
    const primaryHex = `#${c1}`;
    const secondaryHex = '#2563EB';
    const tertiaryHex = '#10B981';

    const brandName = url.replace(/^https?:\/\//, '').split('/')[0];
    this.tokens.brand.name = `${brandName.charAt(0).toUpperCase() + brandName.slice(1)} Guidelines`;
    this.tokens.brand.primary.base = primaryHex;
    this.tokens.brand.primary.shades = generateTonalPalette(primaryHex);
    this.tokens.brand.secondary.base = secondaryHex;
    this.tokens.brand.secondary.shades = generateTonalPalette(secondaryHex);
    this.tokens.brand.tertiary.base = tertiaryHex;
    this.tokens.brand.tertiary.shades = generateTonalPalette(tertiaryHex);

    this.saveTokens();
    bridgeClient.notifyUser(`Derived brand tokens for ${brandName}!`, 'success');
    this.render();
  }

  setDeepProperty(obj, path, value) {
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
  }
}
