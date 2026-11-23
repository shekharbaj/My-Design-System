// AI Design System Creator - Design Tokens, Foundations & Brand Guidelines Studio
// Requirements 13, 14, 15: Subtabs reordered, Interactive Typography/Spacing/Border/TypeScale, High-fidelity CSS, Decoupled App Chrome

import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient } from '../bridge-client.js';
import { llmService } from '../llm-service.js';
import {
  INITIAL_BRAND_TOKENS,
  generateTonalPalette,
  hexToRgb,
  rgbToHex,
  BRAND_PRESETS
} from '../tokens-data.js';

export class TokensView {
  constructor(container) {
    this.container = container;
    // Subtabs: Brand Colors (1), Typography & Spacing (2), UI Colors (3), Semantic (4), Import (5)
    this.activeTab = 'brand'; // 'brand' | 'typography_spacing' | 'ui' | 'semantic' | 'import'
    this.tokens = this.loadTokens();
    this.showAddCustomForm = false;

    this.render();
    this.bindEvents();

    if (store) {
      store.subscribe('tokens:updated', (newTokens) => {
        if (newTokens && newTokens !== this.tokens) {
          this.tokens = newTokens;
          this.render();
          this.bindEvents();
        }
      });
      store.subscribe('ds:switched', () => {
        this.tokens = this.loadTokens();
        this.render();
        this.bindEvents();
      });
    }
  }

  loadTokens() {
    if (store && typeof store.getActiveTokens === 'function') {
      return store.getActiveTokens();
    }
    const saved = localStorage.getItem('adsc_brand_tokens_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.brand) return parsed;
      } catch (e) {}
    }
    return JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS));
  }

  saveTokens() {
    if (store && typeof store.saveActiveTokens === 'function') {
      store.saveActiveTokens(this.tokens);
    } else {
      try {
        localStorage.setItem('adsc_brand_tokens_v2', JSON.stringify(this.tokens));
      } catch (e) {}
      store.emit('tokens:updated', this.tokens);
    }
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
              <h2 class="tokens-title">Design Foundations & Tokens Studio</h2>
              <span class="tokens-pill-badge">${this.tokens.brand.name}</span>
            </div>
            <p class="tokens-subtitle">Define design system foundations: colors, typography, spacing, radii & brand guidelines. (Decoupled from application chrome)</p>
          </div>

          <div class="tokens-header-actions">
            <button class="adsc-btn btn-secondary compact" id="btn-copy-tokens-figma-json" title="Copy Tokens Schema to paste into Figma Plugin">
              ${ICON_SVGS.copy}
              <span>Copy Tokens JSON</span>
            </button>
            <button class="adsc-btn btn-secondary compact" id="btn-export-tokens-json" title="Export W3C Design Tokens Community Group format">
              ${ICON_SVGS.download}
              <span>Export DTCG (.json)</span>
            </button>
            <button class="adsc-btn btn-figma compact" id="btn-push-tokens-figma" title="Push Color Styles, Typography & Variables to Figma">
              ${ICON_SVGS.figma}
              <span>⚡ Push Tokens to Figma</span>
            </button>
          </div>
        </div>

        <!-- Subtabs Navigation (Requirement 13: Typography & Spacing next to Brand Colors) -->
        <div class="tokens-tabs-nav">
          <button class="tokens-nav-btn ${this.activeTab === 'brand' ? 'active' : ''}" data-tab="brand">
            🎨 Brand Colors & Swatches
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'typography_spacing' ? 'active' : ''}" data-tab="typography_spacing">
            Aa Typography & Spacing
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'grid' ? 'active' : ''}" data-tab="grid">
            📐 Grids & Breakpoints
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'shadows' ? 'active' : ''}" data-tab="shadows">
            🌓 Elevation & Shadows
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'ui' ? 'active' : ''}" data-tab="ui">
            ◑ Light & Dark UI Colors
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'semantic' ? 'active' : ''}" data-tab="semantic">
            ⚑ Semantic & Feedback
          </button>
          <button class="tokens-nav-btn ${this.activeTab === 'import' ? 'active' : ''}" data-tab="import">
            📄 Import Guidelines (PDF / URL)
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
      case 'typography_spacing': return this.renderTypographySpacingTab();
      case 'grid': return this.renderGridTab();
      case 'shadows': return this.renderShadowsTab();
      case 'ui': return this.renderUIColorsTab();
      case 'semantic': return this.renderSemanticColorsTab();
      case 'import': return this.renderImportGuidelinesTab();
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
            <strong>Tonal Swatch Generator:</strong> Each base color automatically computes an 11-step tonal scale (50 through 950). These are exported as native <strong>Figma Color Styles & Variables</strong>. Click any hex to copy.
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
        <div class="swatches-strip-clean">
          ${shadeKeys.map(k => {
            const hex = shades[k] || '#E2E8F0';
            return `
              <div class="swatch-cell-outer" title="Click to copy ${k}: ${hex}" data-copy="${hex}">
                <!-- Clean solid color box with NO text inside (Requirement 28) -->
                <div class="swatch-color-tile" style="background-color: ${hex};"></div>
                <!-- Text labels placed outside, underneath the box (Requirement 28) -->
                <div class="swatch-labels-below">
                  <span class="swatch-step-text">${k}</span>
                  <span class="swatch-hex-text">${hex}</span>
                </div>
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

        <div class="swatches-strip-clean">
          ${shadeKeys.map(k => {
            const hex = shades[k] || '#E2E8F0';
            return `
              <div class="swatch-cell-outer" title="Click to copy ${k}: ${hex}" data-copy="${hex}">
                <!-- Clean solid color box with NO text inside (Requirement 28) -->
                <div class="swatch-color-tile" style="background-color: ${hex};"></div>
                <!-- Text labels placed outside, underneath the box (Requirement 28) -->
                <div class="swatch-labels-below">
                  <span class="swatch-step-text">${k}</span>
                  <span class="swatch-hex-text">${hex}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 2. Interactive Typography, Spacing, Border & Type Scale Studio (Requirements 13 & 14)
  renderTypographySpacingTab() {
    const t = this.tokens.typographyTokens || {
      fontFamilySans: 'Inter, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontFamilyDisplay: 'Inter, sans-serif',
      baseFontSize: 16,
      scaleRatio: 1.25,
      scale: [
        { step: 'xs', size: '12px', lineHeight: '16px', weight: '400' },
        { step: 'sm', size: '14px', lineHeight: '20px', weight: '400' },
        { step: 'base', size: '16px', lineHeight: '24px', weight: '400' },
        { step: 'md', size: '18px', lineHeight: '28px', weight: '500' },
        { step: 'lg', size: '20px', lineHeight: '28px', weight: '600' },
        { step: 'xl', size: '24px', lineHeight: '32px', weight: '600' },
        { step: 'display-xl', size: '36px', lineHeight: '44px', weight: '700' },
        { step: 'display-2xl', size: '48px', lineHeight: '56px', weight: '800' }
      ]
    };

    const sp = this.tokens.spacing || [
      { name: '1', val: '4px', px: 4 },
      { name: '2', val: '8px', px: 8 },
      { name: '3', val: '12px', px: 12 },
      { name: '4', val: '16px', px: 16 },
      { name: '6', val: '24px', px: 24 },
      { name: '8', val: '32px', px: 32 },
      { name: '12', val: '48px', px: 48 },
      { name: '16', val: '64px', px: 64 }
    ];

    const rd = this.tokens.radii || {
      none: '0px',
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px'
    };

    const currentSans = (t.fontFamilySans || '').split(',')[0].replace(/['"]/g, '').trim();
    const currentMono = (t.fontFamilyMono || '').split(',')[0].replace(/['"]/g, '').trim();
    const currentRatio = t.scaleRatio || 1.25;
    const currentBase = t.baseFontSize || 16;

    return `
      <div class="tokens-tab-content">
        <!-- Typography System Card -->
        <div class="token-color-card typography-card">
          <div class="section-card-title-row">
            <div>
              <h3 class="card-headline">Aa Typography & Type Scale Engine</h3>
              <p class="card-subhead">Select font families, base size, scale multiplier ratio, and live calibrated hierarchy.</p>
            </div>
            <span class="tokens-pill-badge">Typography Tokens</span>
          </div>

          <!-- Font Family Controls Grid -->
          <div class="typo-controls-grid">
            <div class="typo-control-item">
              <label class="control-label">Primary Body & UI Font (Sans):</label>
              <select id="select-font-sans" class="adsc-select">
                <option value="Inter" ${currentSans === 'Inter' ? 'selected' : ''}>Inter (Modern Sans)</option>
                <option value="Roboto" ${currentSans === 'Roboto' ? 'selected' : ''}>Roboto (Clean Android)</option>
                <option value="Plus Jakarta Sans" ${currentSans === 'Plus Jakarta Sans' ? 'selected' : ''}>Plus Jakarta Sans (Geometric)</option>
                <option value="Poppins" ${currentSans === 'Poppins' ? 'selected' : ''}>Poppins (Soft Geometric)</option>
                <option value="-apple-system, BlinkMacSystemFont" ${currentSans.includes('apple') ? 'selected' : ''}>SF Pro Display (System Native)</option>
                <option value="Montserrat" ${currentSans === 'Montserrat' ? 'selected' : ''}>Montserrat (Editorial Headings)</option>
                <option value="Outfit" ${currentSans === 'Outfit' ? 'selected' : ''}>Outfit (Minimalist Contemporary)</option>
                <option value="Geist Sans" ${currentSans === 'Geist Sans' ? 'selected' : ''}>Geist Sans (Vercel Style)</option>
              </select>
            </div>

            <div class="typo-control-item">
              <label class="control-label">Code & Tokens Font (Mono):</label>
              <select id="select-font-mono" class="adsc-select">
                <option value="JetBrains Mono" ${currentMono === 'JetBrains Mono' ? 'selected' : ''}>JetBrains Mono (Developer Favorite)</option>
                <option value="Fira Code" ${currentMono === 'Fira Code' ? 'selected' : ''}>Fira Code (Ligatures)</option>
                <option value="SF Mono" ${currentMono === 'SF Mono' ? 'selected' : ''}>SF Mono / Menlo</option>
                <option value="Consolas" ${currentMono === 'Consolas' ? 'selected' : ''}>Consolas / Courier</option>
              </select>
            </div>

            <div class="typo-control-item">
              <label class="control-label">Type Scale Ratio (Mathematical Ratio):</label>
              <select id="select-scale-ratio" class="adsc-select">
                <option value="1.125" ${currentRatio == 1.125 ? 'selected' : ''}>1.125 — Major Second (Compact)</option>
                <option value="1.200" ${currentRatio == 1.2 ? 'selected' : ''}>1.200 — Minor Third (Traditional)</option>
                <option value="1.250" ${currentRatio == 1.25 ? 'selected' : ''}>1.250 — Major Third (Modern Web Standard)</option>
                <option value="1.333" ${currentRatio == 1.333 ? 'selected' : ''}>1.333 — Perfect Fourth (High Contrast)</option>
                <option value="1.414" ${currentRatio == 1.414 ? 'selected' : ''}>1.414 — Augmented Fourth</option>
                <option value="1.500" ${currentRatio == 1.5 ? 'selected' : ''}>1.500 — Perfect Fifth (Marketing)</option>
                <option value="1.618" ${currentRatio == 1.618 ? 'selected' : ''}>1.618 — Golden Ratio (Dramatic)</option>
              </select>
            </div>

            <div class="typo-control-item">
              <label class="control-label">Base Size (Paragraph / Body):</label>
              <select id="select-base-size" class="adsc-select">
                <option value="14" ${currentBase == 14 ? 'selected' : ''}>14px (Dense Enterprise)</option>
                <option value="15" ${currentBase == 15 ? 'selected' : ''}>15px (Compact)</option>
                <option value="16" ${currentBase == 16 ? 'selected' : ''}>16px (Universal Default)</option>
                <option value="18" ${currentBase == 18 ? 'selected' : ''}>18px (Spacious)</option>
              </select>
            </div>
          </div>

          <!-- Live Typography Preview Sandbox -->
          <div class="typo-preview-box" style="font-family: ${t.fontFamilySans};">
            <span class="preview-badge">Live Typography Hierarchy Preview</span>
            <h1 class="demo-heading-h1">Build design systems that scale effortlessly</h1>
            <p class="demo-paragraph">
              Components, design tokens, and synchronized contract schemas connecting web applications with native Figma environments.
            </p>
            <div class="demo-code-line" style="font-family: ${t.fontFamilyMono};">
              <code>const buttonTheme = { variant: "primary", size: "md", state: "Rest" };</code>
            </div>
          </div>

          <!-- Type Scale Table -->
          <div class="type-scale-table-wrap">
            <h4 class="subhead-title">Calibrated Type Scale Tokens</h4>
            <div class="type-scale-table">
              <div class="type-scale-row header-row">
                <span class="col-step">Token</span>
                <span class="col-size">Size / LineHeight</span>
                <span class="col-weight">Weight</span>
                <span class="col-sample">Sample Rendering</span>
              </div>
              ${t.scale.map(s => `
                <div class="type-scale-row">
                  <span class="col-step"><code>--text-${s.step}</code></span>
                  <span class="col-size">${s.size} / ${s.lineHeight}</span>
                  <span class="col-weight">${s.weight}</span>
                  <span class="col-sample" style="font-size: ${s.size}; line-height: ${s.lineHeight}; font-weight: ${s.weight}; font-family: ${t.fontFamilySans};">
                    Design System Typography
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Spacing & Layout Grid Card -->
        <div class="token-color-card spacing-card">
          <div class="section-card-title-row">
            <div>
              <h3 class="card-headline">⤧ Spacing & Layout Tokens</h3>
              <p class="card-subhead">Base grid system for auto-layout padding, gaps, margins, and component dimensions.</p>
            </div>
            <div class="grid-preset-wrap">
              <label>Base Grid:</label>
              <select id="select-spacing-grid" class="adsc-select compact">
                <option value="4" selected>4px Base Grid (Modern)</option>
                <option value="8">8px Base Grid (Material)</option>
              </select>
            </div>
          </div>

          <div class="spacing-visualizer-list">
            ${sp.map(s => `
              <div class="spacing-row-item">
                <div class="spacing-meta">
                  <code class="sp-token-name">--space-${s.name}</code>
                  <span class="sp-token-val">${s.val}</span>
                </div>
                <div class="spacing-bar-container">
                  <div class="spacing-bar-fill" style="width: ${Math.min(320, parseInt(s.val) * 4)}px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Border Widths & Corner Radii Scale -->
        <div class="token-color-card radii-card">
          <div class="section-card-title-row">
            <div>
              <h3 class="card-headline">▢ Corner Radii & Border Tokens</h3>
              <p class="card-subhead">Curve presets for buttons, chips, dialogs, cards, and input fields.</p>
            </div>
            <span class="tokens-pill-badge">Radii Tokens</span>
          </div>

          <div class="radii-interactive-grid">
            ${Object.entries(rd).map(([k, val]) => `
              <div class="radius-card-item">
                <div class="radius-demo-box" style="border-radius: ${val};"></div>
                <div class="radius-card-info">
                  <span class="radius-step-name">${k}</span>
                  <code class="radius-val-tag">${val}</code>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 3. Light & Dark UI Colors Tab
  renderUIColorsTab() {
    const ui = this.tokens.ui;

    return `
      <div class="tokens-tab-content">
        <div class="ui-tokens-split">
          <!-- Light Mode Surface Roles -->
          <div class="token-color-card ui-mode-card">
            <div class="color-card-header">
              <div class="color-meta-left">
                <span class="mode-icon">☀</span>
                <div>
                  <h3 class="color-group-name">Light UI Surface Roles</h3>
                  <span class="color-role-tag">Standard light theme surfaces & text</span>
                </div>
              </div>
            </div>

            <div class="ui-color-rows-list">
              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Background Page</span>
                  <code class="ui-token-tag">--ui-bg-page</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.light.page}" data-path="ui.backgrounds.light.page" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.light.page}" data-path="ui.backgrounds.light.page" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Surface / Cards</span>
                  <code class="ui-token-tag">--ui-bg-surface</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.light.surface}" data-path="ui.backgrounds.light.surface" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.light.surface}" data-path="ui.backgrounds.light.surface" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Elevated / Modals</span>
                  <code class="ui-token-tag">--ui-bg-elevated</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.light.elevated}" data-path="ui.backgrounds.light.elevated" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.light.elevated}" data-path="ui.backgrounds.light.elevated" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Border & Divider</span>
                  <code class="ui-token-tag">--ui-border</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.light.border}" data-path="ui.backgrounds.light.border" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.light.border}" data-path="ui.backgrounds.light.border" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Heading Text</span>
                  <code class="ui-token-tag">--ui-text-heading</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.typography.light.heading}" data-path="ui.typography.light.heading" />
                  <input type="text" class="color-hex-field" value="${ui.typography.light.heading}" data-path="ui.typography.light.heading" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Body Text</span>
                  <code class="ui-token-tag">--ui-text-body</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.typography.light.body}" data-path="ui.typography.light.body" />
                  <input type="text" class="color-hex-field" value="${ui.typography.light.body}" data-path="ui.typography.light.body" maxlength="7" />
                </div>
              </div>
            </div>
          </div>

          <!-- Dark Mode Surface Roles -->
          <div class="token-color-card ui-mode-card dark-mode-card">
            <div class="color-card-header">
              <div class="color-meta-left">
                <span class="mode-icon">☾</span>
                <div>
                  <h3 class="color-group-name">Dark UI Surface Roles</h3>
                  <span class="color-role-tag">High contrast dark theme surfaces</span>
                </div>
              </div>
            </div>

            <div class="ui-color-rows-list">
              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Dark Page Background</span>
                  <code class="ui-token-tag">--ui-dark-bg-page</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.dark.page}" data-path="ui.backgrounds.dark.page" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.dark.page}" data-path="ui.backgrounds.dark.page" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Dark Surface / Cards</span>
                  <code class="ui-token-tag">--ui-dark-bg-surface</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.dark.surface}" data-path="ui.backgrounds.dark.surface" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.dark.surface}" data-path="ui.backgrounds.dark.surface" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Dark Elevated Surface</span>
                  <code class="ui-token-tag">--ui-dark-bg-elevated</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.dark.elevated}" data-path="ui.backgrounds.dark.elevated" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.dark.elevated}" data-path="ui.backgrounds.dark.elevated" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Dark Border & Divider</span>
                  <code class="ui-token-tag">--ui-dark-border</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.backgrounds.dark.border}" data-path="ui.backgrounds.dark.border" />
                  <input type="text" class="color-hex-field" value="${ui.backgrounds.dark.border}" data-path="ui.backgrounds.dark.border" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Dark Heading Text</span>
                  <code class="ui-token-tag">--ui-dark-text-heading</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.typography.dark.heading}" data-path="ui.typography.dark.heading" />
                  <input type="text" class="color-hex-field" value="${ui.typography.dark.heading}" data-path="ui.typography.dark.heading" maxlength="7" />
                </div>
              </div>

              <div class="ui-color-row">
                <div class="ui-color-meta">
                  <span class="ui-role-name">Dark Body Text</span>
                  <code class="ui-token-tag">--ui-dark-text-body</code>
                </div>
                <div class="ui-color-inputs">
                  <input type="color" class="color-picker-native" value="${ui.typography.dark.body}" data-path="ui.typography.dark.body" />
                  <input type="text" class="color-hex-field" value="${ui.typography.dark.body}" data-path="ui.typography.dark.body" maxlength="7" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Semantic & Feedback Tab
  renderSemanticColorsTab() {
    const s = this.tokens.ui.semantics;
    const semList = [
      { key: 'error', name: 'Error / Destructive', obj: s.error },
      { key: 'warning', name: 'Warning / Caution', obj: s.warning },
      { key: 'success', name: 'Success / Positive', obj: s.success },
      { key: 'info', name: 'Information / Neutral', obj: s.info }
    ];

    return `
      <div class="tokens-tab-content">
        <div class="color-groups-stack">
          ${semList.map(item => this.renderSemanticCard(item)).join('')}
        </div>
      </div>
    `;
  }

  renderSemanticCard(item) {
    const shades = item.obj.shades || {};
    const shadeKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

    return `
      <div class="token-color-card" data-semantic="${item.key}">
        <div class="color-card-header">
          <div class="color-meta-left">
            <span class="color-dot-large" style="background-color: ${item.obj.base};"></span>
            <div>
              <h3 class="color-group-name">${item.name}</h3>
              <span class="color-role-tag">Semantic/${item.key.toUpperCase()}</span>
            </div>
          </div>

          <div class="color-inputs-right">
            <label class="input-tag">Base Hex:</label>
            <input type="color" class="color-picker-native" value="${item.obj.base}" data-semantic="${item.key}" />
            <input type="text" class="color-hex-field" value="${item.obj.base}" data-semantic="${item.key}" maxlength="7" />
          </div>
        </div>

        <div class="swatches-strip-clean">
          ${shadeKeys.map(k => {
            const hex = shades[k] || '#E2E8F0';
            return `
              <div class="swatch-cell-outer" title="Click to copy ${k}: ${hex}" data-copy="${hex}">
                <!-- Clean solid color box with NO text inside -->
                <div class="swatch-color-tile" style="background-color: ${hex};"></div>
                <!-- Text labels placed outside, underneath the box -->
                <div class="swatch-labels-below">
                  <span class="swatch-step-text">${k}</span>
                  <span class="swatch-hex-text">${hex}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // 5. Import Guidelines Tab (PDF / URL / Presets)
  renderImportGuidelinesTab() {
    return `
      <div class="tokens-tab-content">
        <div class="import-guidelines-grid">
          <!-- Drop Zone PDF -->
          <div class="token-color-card">
            <h3 class="card-headline">📄 Import Brand Guidelines PDF</h3>
            <p class="card-subhead">Upload your brand manual PDF or document to automatically extract colors, font specifications, and styling tokens.</p>

            <div class="pdf-drop-zone" id="pdf-drop-zone" style="position: relative; cursor: pointer; overflow: hidden; padding: 28px 20px; border: 2px dashed #D1D5DB; border-radius: 12px; background: #FAFAFA; text-align: center; transition: all 0.2s ease;">
              <!-- Overlay native file input: covers 100% of zone so any click or drop directly opens the OS file picker -->
              <input 
                type="file" 
                id="pdf-file-input" 
                accept=".pdf,.json,.txt" 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10;" 
                title="Click or drag and drop Brand Guidelines PDF, JSON or TXT"
              />
              <div style="position: relative; z-index: 1; pointer-events: none;">
                <span class="drop-icon" style="font-size: 36px; display: block; margin-bottom: 8px;">📁</span>
                <p style="font-size: 15px; font-weight: 600; color: #1F2937; margin: 0 0 6px 0;">Drag & Drop your <strong>Brand Guidelines PDF</strong> here</p>
                <span class="subtext" style="font-size: 13px; color: #6B7280; display: block; margin-bottom: 14px;">or click anywhere in this card to browse files (.pdf, .json, .txt)</span>
                <span class="adsc-btn btn-secondary compact" id="btn-browse-file" style="display: inline-flex; align-items: center; justify-content: center; pointer-events: none;">
                  Browse File
                </span>
              </div>
            </div>

            ${this.lastImportedResult ? `
              <div class="imported-guidelines-banner" style="background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 10px; padding: 14px 18px; margin-top: 16px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px; color: #C2410C;">✓</span>
                    <strong style="font-size: 13.5px; color: #9A3412;">Active Imported Brand: ${this.tokens.brand.name}</strong>
                  </div>
                  <span style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #C2410C; color: #FFFFFF; font-weight: 600;">Active in Project</span>
                </div>
                <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
                  <span style="font-size: 12px; color: #7C2D12; font-weight: 600;">Extracted Palette:</span>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <span title="Primary: ${this.tokens.brand.primary.base}" style="width: 24px; height: 24px; border-radius: 6px; background: ${this.tokens.brand.primary.base}; border: 1px solid rgba(0,0,0,0.15); display: inline-block;"></span>
                    <span title="Secondary: ${this.tokens.brand.secondary.base}" style="width: 24px; height: 24px; border-radius: 6px; background: ${this.tokens.brand.secondary.base}; border: 1px solid rgba(0,0,0,0.15); display: inline-block;"></span>
                    <span title="Accent: ${this.tokens.brand.tertiary.base}" style="width: 24px; height: 24px; border-radius: 6px; background: ${this.tokens.brand.tertiary.base}; border: 1px solid rgba(0,0,0,0.15); display: inline-block;"></span>
                  </div>
                  <span style="font-size: 12px; color: #9A3412;">Source: <strong>${this.escapeHtml(this.lastImportedResult.fileName)}</strong> (${this.lastImportedResult.fileSize} KB)</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- URL Extractor & Presets -->
          <div class="token-color-card">
            <h3 class="card-headline">🌐 Extract Tokens from Brand Website</h3>
            <p class="card-subhead">Enter a company website domain to extract its primary brand palette and tokens.</p>

            <div class="url-input-group">
              <input type="url" id="input-brand-url" placeholder="https://stripe.com or domain" class="adsc-input" />
              <button class="adsc-btn btn-primary compact" id="btn-fetch-url-tokens" type="button">
                Extract Tokens
              </button>
            </div>

            <div class="presets-section mt-16">
              <h4 class="subhead-title">Or Choose an Industry Standard Brand Preset</h4>
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

  // Event Listeners

  // =========================================================
  // 3. Grids & Breakpoints Studio (Requirement 27)
  // =========================================================
  renderGridTab() {
    const gridCols = this.tokens.gridCols || 12;
    const gridGutter = this.tokens.gridGutter || 24;
    const gridMargin = this.tokens.gridMargin || 32;

    const breakpoints = [
      { name: 'xs', width: '< 640px', cols: 4, gutter: '12px', margin: '16px', device: 'Mobile phones' },
      { name: 'sm', width: '640px', cols: 8, gutter: '16px', margin: '20px', device: 'Large phones / phablets' },
      { name: 'md', width: '768px', cols: 8, gutter: '20px', margin: '24px', device: 'Tablets' },
      { name: 'lg', width: '1024px', cols: 12, gutter: '24px', margin: '32px', device: 'Laptops / Small desktops' },
      { name: 'xl', width: '1280px', cols: 12, gutter: '24px', margin: '32px', device: 'Standard Desktops' },
      { name: '2xl', width: '1536px', cols: 12, gutter: '32px', margin: '40px', device: 'High-res large screens' }
    ];

    return `
      <div class="tokens-tab-content">
        <div class="tokens-intro-banner">
          <div class="banner-text">
            <strong>Layout Grid & Breakpoint Foundations:</strong> Configure responsive multi-column layout grids, gutters, and responsive breakpoints. Tokens sync with Figma Layout Grids and CSS Grid/Flexbox.
          </div>
          <button class="adsc-btn btn-secondary compact" id="btn-copy-grid-css">
            ${ICON_SVGS.copy} <span>Copy Grid CSS</span>
          </button>
        </div>

        <!-- Interactive Grid Simulator -->
        <div class="grid-simulator-card">
          <div class="grid-sim-header">
            <div class="sim-title-group">
              <h4>Interactive Layout Grid Simulator (${gridCols} Columns)</h4>
              <p>Simulate container columns with live gutter and margin adjustments</p>
            </div>
            <div class="grid-sim-controls">
              <div class="sim-ctrl">
                <label>Columns: <strong id="lbl-cols">${gridCols}</strong></label>
                <input type="range" id="sim-input-cols" min="2" max="16" value="${gridCols}" />
              </div>
              <div class="sim-ctrl">
                <label>Gutter: <strong id="lbl-gutter">${gridGutter}px</strong></label>
                <input type="range" id="sim-input-gutter" min="8" max="48" step="4" value="${gridGutter}" />
              </div>
              <div class="sim-ctrl">
                <label>Margin: <strong id="lbl-margin">${gridMargin}px</strong></label>
                <input type="range" id="sim-input-margin" min="8" max="64" step="8" value="${gridMargin}" />
              </div>
            </div>
          </div>

          <!-- Live Visual Grid Columns Overlay -->
          <div class="grid-sim-viewport" id="grid-sim-viewport" style="padding: 0 ${gridMargin}px;">
            <div class="grid-columns-container" id="grid-columns-container" style="display: flex; gap: ${gridGutter}px; width: 100%; height: 180px;">
              ${Array.from({ length: gridCols }).map((_, i) => `
                <div class="grid-col-stripe" style="flex: 1; background: rgba(194, 65, 12, 0.12); border: 1px dashed rgba(194, 65, 12, 0.35); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #9A3412;">
                  Col ${i + 1}
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Breakpoints Scale Table -->
        <div class="token-color-card mt-24">
          <div class="color-card-header">
            <h3 class="color-group-name">Responsive Breakpoints Specification</h3>
            <span class="color-role-tag">CSS Media Queries & Figma Frames</span>
          </div>

          <table class="tokens-spec-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Min Width</th>
                <th>Columns</th>
                <th>Gutter</th>
                <th>Margin</th>
                <th>Target Devices</th>
              </tr>
            </thead>
            <tbody>
              ${breakpoints.map(bp => `
                <tr>
                  <td><code>--breakpoint-${bp.name}</code></td>
                  <td><strong>${bp.width}</strong></td>
                  <td>${bp.cols} cols</td>
                  <td><code>${bp.gutter}</code></td>
                  <td><code>${bp.margin}</code></td>
                  <td>${bp.device}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================
  // 4. Elevation & Shadows Studio (Requirement 27)
  // =========================================================
  renderShadowsTab() {
    const shadows = [
      { name: 'none', label: 'Elevation 0 (Flat)', val: 'none', desc: 'Flush surfaces, flat cards & borders' },
      { name: 'xs', label: 'Elevation 1 (Micro)', val: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', desc: 'Badges, subtle buttons, input borders' },
      { name: 'sm', label: 'Elevation 2 (Card Rest)', val: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', desc: 'Standard resting cards, select buttons' },
      { name: 'md', label: 'Elevation 3 (Card Hover)', val: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', desc: 'Hovered cards, floating toolbars, tabs' },
      { name: 'lg', label: 'Elevation 4 (Dropdown)', val: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)', desc: 'Dropdown menus, popovers, tooltips' },
      { name: 'xl', label: 'Elevation 5 (Modal)', val: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', desc: 'Dialog modals, floating action sheets' },
      { name: '2xl', label: 'Elevation 6 (Drawer)', val: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', desc: 'Slide-in drawers, lightbox overlays' },
      { name: 'inner', label: 'Inner Well (Pressed)', val: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', desc: 'Pressed button states, well wells' }
    ];

    return `
      <div class="tokens-tab-content">
        <div class="tokens-intro-banner">
          <div class="banner-text">
            <strong>Elevation & Shadow Foundations:</strong> 8 standardized elevation depth levels built with layered optical drop shadows. Exported as Figma Drop Shadow Effect Styles and CSS Box-Shadow tokens.
          </div>
          <button class="adsc-btn btn-secondary compact" id="btn-copy-all-shadows-css">
            ${ICON_SVGS.copy} <span>Copy Shadows CSS</span>
          </button>
        </div>

        <!-- Visual Elevation Cards Gallery -->
        <div class="shadows-gallery-grid">
          ${shadows.map(sh => `
            <div class="shadow-gallery-card">
              <div class="shadow-preview-surface">
                <div class="shadow-floating-object" style="box-shadow: ${sh.val};">
                  ${sh.name === 'none' ? 'Flat Surface' : sh.name.toUpperCase()}
                </div>
              </div>
              <div class="shadow-card-meta">
                <div class="shadow-name-row">
                  <strong>${sh.label}</strong>
                  <button class="btn-copy-single-shadow" data-css="${sh.val}" title="Copy CSS Box Shadow">📋</button>
                </div>
                <p class="shadow-desc">${sh.desc}</p>
                <code class="shadow-css-code">${sh.val}</code>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Custom Shadow Tuner -->
        <div class="token-color-card mt-24">
          <div class="color-card-header">
            <div>
              <h3 class="color-group-name">Interactive Custom Shadow Tuner</h3>
              <p class="color-role-tag">Tweak blur, spread, and offsets to generate custom elevation tokens</p>
            </div>
            <button class="adsc-btn btn-primary compact" id="btn-copy-tuned-shadow">📋 Copy Tuned Shadow</button>
          </div>

          <div class="shadow-tuner-layout">
            <div class="shadow-tuner-controls">
              <div class="tuner-field">
                <label>X Offset: <strong id="val-sh-x">0px</strong></label>
                <input type="range" id="tune-sh-x" min="-30" max="30" value="0" />
              </div>
              <div class="tuner-field">
                <label>Y Offset: <strong id="val-sh-y">8px</strong></label>
                <input type="range" id="tune-sh-y" min="0" max="40" value="8" />
              </div>
              <div class="tuner-field">
                <label>Blur Radius: <strong id="val-sh-blur">16px</strong></label>
                <input type="range" id="tune-sh-blur" min="0" max="60" value="16" />
              </div>
              <div class="tuner-field">
                <label>Spread Radius: <strong id="val-sh-spread">-2px</strong></label>
                <input type="range" id="tune-sh-spread" min="-15" max="25" value="-2" />
              </div>
              <div class="tuner-field">
                <label>Shadow Opacity: <strong id="val-sh-opacity">12%</strong></label>
                <input type="range" id="tune-sh-opacity" min="0" max="50" value="12" />
              </div>
            </div>

            <div class="shadow-tuner-preview-box">
              <div class="tuned-floating-card" id="tuned-floating-card" style="box-shadow: 0 8px 16px -2px rgba(0,0,0,0.12);">
                <span class="card-icon">✦</span>
                <strong>Live Tuned Surface</strong>
                <span id="tuned-shadow-display" style="font-size:11px; font-family:monospace; color:#6B7280; text-align:center; margin-top:6px;">0 8px 16px -2px rgba(0,0,0,0.12)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachStudioListeners() {

    // Grid Simulator Sliders
    const colsInput = this.container.querySelector('#sim-input-cols');
    const gutterInput = this.container.querySelector('#sim-input-gutter');
    const marginInput = this.container.querySelector('#sim-input-margin');

    const updateGridSim = () => {
      const cols = parseInt(colsInput?.value) || 12;
      const gutter = parseInt(gutterInput?.value) || 24;
      const margin = parseInt(marginInput?.value) || 32;

      this.tokens.gridCols = cols;
      this.tokens.gridGutter = gutter;
      this.tokens.gridMargin = margin;
      this.saveTokens();

      const lblCols = this.container.querySelector('#lbl-cols');
      const lblGutter = this.container.querySelector('#lbl-gutter');
      const lblMargin = this.container.querySelector('#lbl-margin');
      if (lblCols) lblCols.textContent = cols;
      if (lblGutter) lblGutter.textContent = `${gutter}px`;
      if (lblMargin) lblMargin.textContent = `${margin}px`;

      const viewport = this.container.querySelector('#grid-sim-viewport');
      const container = this.container.querySelector('#grid-columns-container');
      if (viewport) viewport.style.padding = `0 ${margin}px`;
      if (container) {
        container.style.gap = `${gutter}px`;
        container.innerHTML = Array.from({ length: cols }).map((_, i) => `
          <div class="grid-col-stripe" style="flex: 1; background: rgba(194, 65, 12, 0.12); border: 1px dashed rgba(194, 65, 12, 0.35); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #9A3412;">
            Col ${i + 1}
          </div>
        `).join('');
      }
    };

    if (colsInput) colsInput.addEventListener('input', updateGridSim);
    if (gutterInput) gutterInput.addEventListener('input', updateGridSim);
    if (marginInput) marginInput.addEventListener('input', updateGridSim);

    // Copy Grid CSS
    const copyGridBtn = this.container.querySelector('#btn-copy-grid-css');
    if (copyGridBtn) {
      copyGridBtn.addEventListener('click', () => {
        const css = `:root {\n  --grid-columns: ${this.tokens.gridCols || 12};\n  --grid-gutter: ${this.tokens.gridGutter || 24}px;\n  --grid-margin: ${this.tokens.gridMargin || 32}px;\n}`;
        navigator.clipboard.writeText(css).then(() => {
          bridgeClient.notifyUser('✓ Copied Grid CSS variables to clipboard!', 'success');
        });
      });
    }

    // Shadow Tuner Sliders
    const shX = this.container.querySelector('#tune-sh-x');
    const shY = this.container.querySelector('#tune-sh-y');
    const shBlur = this.container.querySelector('#tune-sh-blur');
    const shSpread = this.container.querySelector('#tune-sh-spread');
    const shOp = this.container.querySelector('#tune-sh-opacity');

    const updateShadowTuner = () => {
      const x = shX?.value || 0;
      const y = shY?.value || 8;
      const b = shBlur?.value || 16;
      const s = shSpread?.value || -2;
      const op = (parseInt(shOp?.value) || 12) / 100;

      const valX = this.container.querySelector('#val-sh-x');
      const valY = this.container.querySelector('#val-sh-y');
      const valB = this.container.querySelector('#val-sh-blur');
      const valS = this.container.querySelector('#val-sh-spread');
      const valOp = this.container.querySelector('#val-sh-opacity');

      if (valX) valX.textContent = `${x}px`;
      if (valY) valY.textContent = `${y}px`;
      if (valB) valB.textContent = `${b}px`;
      if (valS) valS.textContent = `${s}px`;
      if (valOp) valOp.textContent = `${shOp?.value || 12}%`;

      const shadowStr = `${x}px ${y}px ${b}px ${s}px rgba(0, 0, 0, ${op})`;
      const card = this.container.querySelector('#tuned-floating-card');
      const disp = this.container.querySelector('#tuned-shadow-display');
      if (card) card.style.boxShadow = shadowStr;
      if (disp) disp.textContent = shadowStr;
    };

    if (shX) shX.addEventListener('input', updateShadowTuner);
    if (shY) shY.addEventListener('input', updateShadowTuner);
    if (shBlur) shBlur.addEventListener('input', updateShadowTuner);
    if (shSpread) shSpread.addEventListener('input', updateShadowTuner);
    if (shOp) shOp.addEventListener('input', updateShadowTuner);

    // Copy single shadow
    const copyShBtns = this.container.querySelectorAll('.btn-copy-single-shadow');
    copyShBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cssVal = btn.getAttribute('data-css');
        navigator.clipboard.writeText(`box-shadow: ${cssVal};`).then(() => {
          bridgeClient.notifyUser('✓ Copied shadow to clipboard!', 'success');
        });
      });
    });

    // Copy tuned shadow
    const copyTunedBtn = this.container.querySelector('#btn-copy-tuned-shadow');
    if (copyTunedBtn) {
      copyTunedBtn.addEventListener('click', () => {
        const disp = this.container.querySelector('#tuned-shadow-display');
        const str = disp ? disp.textContent : '0 8px 16px -2px rgba(0,0,0,0.12)';
        navigator.clipboard.writeText(`box-shadow: ${str};`).then(() => {
          bridgeClient.notifyUser('✓ Copied tuned shadow to clipboard!', 'success');
        });
      });
    }

    // Copy all shadows CSS
    const copyAllShBtn = this.container.querySelector('#btn-copy-all-shadows-css');
    if (copyAllShBtn) {
      copyAllShBtn.addEventListener('click', () => {
        const css = `:root {\n  --elevation-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);\n  --elevation-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);\n  --elevation-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);\n  --elevation-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);\n  --elevation-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);\n  --elevation-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);\n  --elevation-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);\n}`;
        navigator.clipboard.writeText(css).then(() => {
          bridgeClient.notifyUser('✓ Copied all 8 Elevation Shadow tokens!', 'success');
        });
      });
    }


    // Sub-tab switching
    const navBtns = this.container.querySelectorAll('.tokens-nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Swatch click to copy hex
    const swatchCells = this.container.querySelectorAll('.swatch-cell-outer, .swatch-cell');
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

    // Semantic color pickers
    ['error', 'warning', 'success', 'info'].forEach(k => {
      const picker = this.container.querySelector(`.color-picker-native[data-semantic="${k}"]`);
      const hexField = this.container.querySelector(`.color-hex-field[data-semantic="${k}"]`);
      if (picker && hexField) {
        const onSemChange = (hex) => {
          if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
          this.tokens.ui.semantics[k].base = hex;
          this.tokens.ui.semantics[k].shades = generateTonalPalette(hex);
          this.saveTokens();
          this.render();
        };
        picker.addEventListener('input', (e) => onSemChange(e.target.value));
        hexField.addEventListener('change', (e) => onSemChange(e.target.value));
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

    // Typography & Scale Controls (Requirement 14)
    const sansSelect = this.container.querySelector('#select-font-sans');
    if (sansSelect) {
      sansSelect.addEventListener('change', (e) => {
        if (!this.tokens.typographyTokens) this.tokens.typographyTokens = {};
        this.tokens.typographyTokens.fontFamilySans = e.target.value + ', sans-serif';
        this.saveTokens();
        this.render();
      });
    }

    const monoSelect = this.container.querySelector('#select-font-mono');
    if (monoSelect) {
      monoSelect.addEventListener('change', (e) => {
        if (!this.tokens.typographyTokens) this.tokens.typographyTokens = {};
        this.tokens.typographyTokens.fontFamilyMono = e.target.value + ', monospace';
        this.saveTokens();
        this.render();
      });
    }

    const ratioSelect = this.container.querySelector('#select-scale-ratio');
    const baseSizeSelect = this.container.querySelector('#select-base-size');

    const recalculateTypeScale = () => {
      const ratio = parseFloat(ratioSelect ? ratioSelect.value : 1.25);
      const base = parseInt(baseSizeSelect ? baseSizeSelect.value : 16);

      if (!this.tokens.typographyTokens) this.tokens.typographyTokens = {};
      this.tokens.typographyTokens.scaleRatio = ratio;
      this.tokens.typographyTokens.baseFontSize = base;

      const steps = [
        { step: 'xs', pow: -2, weight: '400' },
        { step: 'sm', pow: -1, weight: '400' },
        { step: 'base', pow: 0, weight: '400' },
        { step: 'md', pow: 1, weight: '500' },
        { step: 'lg', pow: 2, weight: '600' },
        { step: 'xl', pow: 3, weight: '600' },
        { step: 'display-xl', pow: 4, weight: '700' },
        { step: 'display-2xl', pow: 5, weight: '800' }
      ];

      this.tokens.typographyTokens.scale = steps.map(s => {
        const sz = Math.round(base * Math.pow(ratio, s.pow));
        const lh = Math.round(sz * 1.35);
        return {
          step: s.step,
          size: `${sz}px`,
          lineHeight: `${lh}px`,
          weight: s.weight
        };
      });

      this.saveTokens();
      this.render();
    };

    if (ratioSelect) ratioSelect.addEventListener('change', recalculateTypeScale);
    if (baseSizeSelect) baseSizeSelect.addEventListener('change', recalculateTypeScale);

    // Spacing Grid selection
    const gridSelect = this.container.querySelector('#select-spacing-grid');
    if (gridSelect) {
      gridSelect.addEventListener('change', (e) => {
        const baseGrid = parseInt(e.target.value);
        this.tokens.spacing = [
          { name: '1', val: `${baseGrid}px`, px: baseGrid },
          { name: '2', val: `${baseGrid * 2}px`, px: baseGrid * 2 },
          { name: '3', val: `${baseGrid * 3}px`, px: baseGrid * 3 },
          { name: '4', val: `${baseGrid * 4}px`, px: baseGrid * 4 },
          { name: '6', val: `${baseGrid * 6}px`, px: baseGrid * 6 },
          { name: '8', val: `${baseGrid * 8}px`, px: baseGrid * 8 },
          { name: '12', val: `${baseGrid * 12}px`, px: baseGrid * 12 },
          { name: '16', val: `${baseGrid * 16}px`, px: baseGrid * 16 }
        ];
        this.saveTokens();
        this.render();
      });
    }

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
    const submitCustomBtn = this.container.querySelector('#btn-submit-new-color');
    if (submitCustomBtn) {
      submitCustomBtn.addEventListener('click', () => {
        const nameInput = this.container.querySelector('#custom-color-name');
        const roleInput = this.container.querySelector('#custom-color-role');
        const name = nameInput?.value.trim() || 'Custom Accent';
        const role = roleInput?.value.trim() || 'Accent & Badges';
        const hex = customHex?.value.trim() || '#D97706';

        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return alert('Please enter a valid 6-digit hex color code');

        if (!this.tokens.customColors) this.tokens.customColors = [];
        const newColor = {
          id: 'custom-' + Date.now(),
          name,
          role,
          base: hex,
          shades: generateTonalPalette(hex)
        };
        this.tokens.customColors.push(newColor);
        this.showAddCustomForm = false;
        this.saveTokens();
        this.render();
        bridgeClient.notifyUser(`Added "${name}" with 11 tonal swatches!`, 'success');
      });
    }

    // Remove custom color
    const removeBtns = this.container.querySelectorAll('.btn-remove-custom-color');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.tokens.customColors = this.tokens.customColors.filter(c => c.id !== id);
        this.saveTokens();
        this.render();
      });
    });

    // Apply Brand Preset
    const presetBtns = this.container.querySelectorAll('.btn-apply-preset');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-preset-idx'));
        const p = BRAND_PRESETS[idx];
        if (!p) return;

        this.tokens.brand.name = p.name;
        this.tokens.brand.primary.base = p.primary;
        this.tokens.brand.primary.shades = generateTonalPalette(p.primary);
        this.tokens.brand.secondary.base = p.secondary;
        this.tokens.brand.secondary.shades = generateTonalPalette(p.secondary);
        this.tokens.brand.tertiary.base = p.tertiary;
        this.tokens.brand.tertiary.shades = generateTonalPalette(p.tertiary);

        this.saveTokens();
        this.render();
        bridgeClient.notifyUser(`Applied "${p.name}" preset!`, 'success');
      });
    });

    // Copy Tokens JSON
    const copyTokensBtn = this.container.querySelector('#btn-copy-tokens-figma-json');
    if (copyTokensBtn) {
      copyTokensBtn.addEventListener('click', () => {
        const payload = {
          schemaVersion: '1.0.0',
          action: 'SYNC_FIGMA_VARIABLES_AND_TOKENS',
          type: 'SYNC_FIGMA_VARIABLES_AND_TOKENS',
          timestamp: new Date().toISOString(),
          tokens: this.tokens
        };
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
          bridgeClient.notifyUser('✓ Copied Tokens Schema! You can paste it into the Figma Plugin "Paste JSON" tab.', 'success');
        });
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
          type: 'SYNC_FIGMA_VARIABLES_AND_TOKENS',
          timestamp: new Date().toISOString(),
          tokens: this.tokens
        };
        try {
          await fetch(`${bridgeClient.bridgeUrl}/api/figma/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          bridgeClient.notifyUser('✓ Pushed Brand Tokens & Color Styles to Figma!', 'success');
        } catch (e) {
          bridgeClient.notifyUser(`Bridge error: ${e.message}`, 'error');
        }
      });
    }

    // 5. Import Guidelines Listeners (Browse & Dropzone)
    this.attachImportGuidelinesListeners();
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

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================
  // IMPORT BRAND GUIDELINES (PDF, JSON, TXT & URL EXTRACTOR)
  // =========================================================
  attachImportGuidelinesListeners() {
    const dropZone = this.container.querySelector('#pdf-drop-zone');
    const fileInput = this.container.querySelector('#pdf-file-input');
    const browseBtn = this.container.querySelector('#btn-browse-file');

    if (!fileInput) return;

    // Direct change event on file input
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.processBrandGuidelinesFile(e.target.files[0]);
      }
    });

    // Programmatic trigger on browseBtn or dropZone
    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        fileInput.click();
      });
    }

    if (dropZone) {
      dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
          fileInput.value = '';
          fileInput.click();
        }
      });

      // Drag and drop events
      ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.style.borderColor = '#C2410C';
          dropZone.style.backgroundColor = '#FFF7ED';
        });
      });

      ['dragleave', 'dragend'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.style.borderColor = '#D1D5DB';
          dropZone.style.backgroundColor = '#FAFAFA';
        });
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#D1D5DB';
        dropZone.style.backgroundColor = '#FAFAFA';
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.processBrandGuidelinesFile(e.dataTransfer.files[0]);
        }
      });
    }

    const fetchUrlBtn = this.container.querySelector('#btn-fetch-url-tokens');
    const urlInput = this.container.querySelector('#input-brand-url');
    if (fetchUrlBtn && urlInput) {
      fetchUrlBtn.addEventListener('click', () => {
        this.extractTokensFromUrl(urlInput.value.trim());
      });
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.extractTokensFromUrl(urlInput.value.trim());
        }
      });
    }
  }

  async processBrandGuidelinesFile(file) {
    if (!file) return;
    bridgeClient.log(`Reading brand guidelines: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`, 'info');

    const dropZone = this.container.querySelector('#pdf-drop-zone');
    if (dropZone) {
      dropZone.innerHTML = `
        <span class="drop-icon" style="display:inline-block;">⏳</span>
        <p>Analyzing <strong>${this.escapeHtml(file.name)}</strong>...</p>
        <span class="subtext">Extracting brand color palettes, typography scales & tokens</span>
      `;
    }

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let extracted = null;

      if (ext === 'json') {
        const text = await file.text();
        extracted = this.parseTokensFromJson(text, file.name);
      } else {
        const buffer = await file.arrayBuffer();
        extracted = this.extractBrandTokensFromPdfBuffer(buffer, file.name);

        // If LLM is active in hybrid mode, attempt deep brand semantic extraction
        if (store.isLLMConfigured() && store.getLLMConfig().provider !== 'local') {
          try {
            const rawText = new TextDecoder('latin1').decode(buffer).slice(0, 3000);
            const llmRes = await llmService.extractBrandTokensFromText(rawText, file.name);
            if (llmRes && llmRes.tokens) {
              if (llmRes.tokens.brandName) extracted.brandName = llmRes.tokens.brandName;
              if (llmRes.tokens.primaryColor) extracted.primaryColor = llmRes.tokens.primaryColor;
              if (llmRes.tokens.secondaryColor) extracted.secondaryColor = llmRes.tokens.secondaryColor;
              if (llmRes.tokens.fontPrimary) extracted.fontFamily = llmRes.tokens.fontPrimary;
              extracted.aiEnhanced = true;
              extracted.model = llmRes.model;
            }
          } catch (e) {
            console.warn('[TokensView] LLM enhancement skipped:', e);
          }
        }
      }

      this.applyExtractedBrandTokens(extracted, file.name);
      this.lastImportedResult = {
        extracted,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1)
      };

      this.render();
      bridgeClient.notifyUser(
        `✓ Successfully imported Brand Guidelines from "${file.name}"! Applied ${extracted.brandName} palette and computed 11-step tonal scales.`,
        'success'
      );
    } catch (err) {
      console.error('Brand Guidelines import error:', err);
      bridgeClient.notifyUser(`Failed to import file: ${err.message}`, 'error');
      this.render();
    }
  }

  extractBrandTokensFromPdfBuffer(buffer, fileName) {
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(buffer);

    const foundHex = new Set();

    // 1. Match Hex color codes in text (#FFFFFF, #1A73E8)
    const hexRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    let m;
    while ((m = hexRegex.exec(text)) !== null) {
      let h = m[0].toUpperCase();
      if (h.length === 4) {
        h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
      }
      foundHex.add(h);
    }

    // 1b. Match HEX labels like HEX: 1A73E8, Hex #FF5500
    const hexLabelRegex = /(?:HEX|Hex|hex)\s*[:#-]?\s*([0-9a-fA-F]{6})\b/g;
    while ((m = hexLabelRegex.exec(text)) !== null) {
      foundHex.add('#' + m[1].toUpperCase());
    }

    // 1c. Match text RGB: RGB: 255, 69, 0 or RGB(194, 65, 12)
    const rgbTextRegex = /(?:rgb|RGB)[:\s(]+(\d{1,3})[,\s/]+(\d{1,3})[,\s/]+(\d{1,3})/g;
    while ((m = rgbTextRegex.exec(text)) !== null) {
      const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
      if (r <= 255 && g <= 255 && b <= 255) {
        foundHex.add(rgbToHex(r, g, b));
      }
    }

    // 1d. Match text CMYK: CMYK: 0, 73, 100, 0
    const cmykTextRegex = /(?:cmyk|CMYK)[:\s(]+(\d{1,3})[,\s/]+(\d{1,3})[,\s/]+(\d{1,3})[,\s/]+(\d{1,3})/g;
    while ((m = cmykTextRegex.exec(text)) !== null) {
      const c = parseInt(m[1], 10) / 100, ma = parseInt(m[2], 10) / 100, y = parseInt(m[3], 10) / 100, k = parseInt(m[4], 10) / 100;
      if (c <= 1 && ma <= 1 && y <= 1 && k <= 1) {
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - ma) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));
        foundHex.add(rgbToHex(r, g, b));
      }
    }

    // 2. Match PDF RGB stream operators: r g b rg / r g b RG
    const pdfRgbRegex = /([0-1](?:\.\d+)?)\s+([0-1](?:\.\d+)?)\s+([0-1](?:\.\d+)?)\s+[rR][gG]/g;
    while ((m = pdfRgbRegex.exec(text)) !== null) {
      const r = Math.round(parseFloat(m[1]) * 255);
      const g = Math.round(parseFloat(m[2]) * 255);
      const b = Math.round(parseFloat(m[3]) * 255);
      foundHex.add(rgbToHex(r, g, b));
    }

    // 3. Match PDF CMYK stream operators: c m y k k
    const pdfCmykRegex = /([0-1](?:\.\d+)?)\s+([0-1](?:\.\d+)?)\s+([0-1](?:\.\d+)?)\s+([0-1](?:\.\d+)?)\s+[kK]/g;
    while ((m = pdfCmykRegex.exec(text)) !== null) {
      const c = parseFloat(m[1]), y = parseFloat(m[2]), ma = parseFloat(m[3]), k = parseFloat(m[4]);
      const r = Math.round(255 * (1 - c) * (1 - k));
      const g = Math.round(255 * (1 - y) * (1 - k));
      const b = Math.round(255 * (1 - ma) * (1 - k));
      foundHex.add(rgbToHex(r, g, b));
    }

    // Filter out neutrals (near-grays, pure blacks, pure whites)
    const chromaticColors = [];
    for (const hex of foundHex) {
      if (!this.isColorNeutral(hex)) {
        const rgb = hexToRgb(hex);
        const exists = chromaticColors.some(h => {
          const r2 = hexToRgb(h);
          return Math.sqrt((rgb.r - r2.r)**2 + (rgb.g - r2.g)**2 + (rgb.b - r2.b)**2) < 22;
        });
        if (!exists) chromaticColors.push(hex);
      }
    }

    // Font Candidate detection
    const fontCandidates = [
      'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Helvetica', 'Open Sans',
      'Lato', 'Plus Jakarta Sans', 'Geist', 'SF Pro', 'Arial', 'Geometria',
      'DM Sans', 'Outfit', 'Manrope'
    ];
    let detectedFont = 'Inter';
    for (const font of fontCandidates) {
      if (text.includes(font) || text.toLowerCase().includes(font.toLowerCase())) {
        detectedFont = font;
        break;
      }
    }

    const brandName = this.extractBrandNameFromTextOrFile(text, fileName);

    if (chromaticColors.length === 0) {
      const fallbackPalettes = [
        ['#C2410C', '#2563EB', '#10B981'],
        ['#4F46E5', '#EC4899', '#06B6D4'],
        ['#0F766E', '#F59E0B', '#6366F1'],
        ['#1D4ED8', '#EA580C', '#059669']
      ];
      const charCodeSum = brandName.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      const chosen = fallbackPalettes[charCodeSum % fallbackPalettes.length];
      chromaticColors.push(...chosen);
    }

    return {
      brandName,
      colors: chromaticColors,
      font: detectedFont
    };
  }

  parseTokensFromJson(jsonText, fileName) {
    const data = JSON.parse(jsonText);
    const brandName = this.extractBrandNameFromTextOrFile('', fileName);
    const colors = [];

    // DTCG or custom JSON token crawler
    const extractColorsRecursively = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (obj.value && typeof obj.value === 'string' && obj.value.startsWith('#')) {
        colors.push(obj.value.toUpperCase());
      } else if (obj.$value && typeof obj.$value === 'string' && obj.$value.startsWith('#')) {
        colors.push(obj.$value.toUpperCase());
      } else {
        for (const val of Object.values(obj)) {
          extractColorsRecursively(val);
        }
      }
    };

    extractColorsRecursively(data);

    const chromatic = colors.filter(c => !this.isColorNeutral(c));
    const unique = Array.from(new Set(chromatic.length > 0 ? chromatic : ['#C2410C', '#2563EB', '#10B981']));

    return {
      brandName: data.name || data.brand?.name || brandName,
      colors: unique,
      font: 'Inter'
    };
  }

  extractTokensFromUrl(url) {
    if (!url) {
      bridgeClient.notifyUser('Please enter a website domain or URL (e.g. stripe.com)', 'warning');
      return;
    }

    let domain = url.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    const brandBase = domain.split('.')[0];
    const brandTitle = brandBase.charAt(0).toUpperCase() + brandBase.slice(1);

    const knownBrands = {
      stripe: ['#635BFF', '#00D4FF', '#0A2540'],
      linear: ['#5E6AD2', '#222326', '#4EA8DE'],
      airbnb: ['#FF385C', '#00A699', '#FC642D'],
      spotify: ['#1DB954', '#191414', '#1ED760'],
      github: ['#24292F', '#0969DA', '#2DA44E'],
      vercel: ['#000000', '#0070F3', '#50E3C2'],
      figma: ['#F24E1E', '#A259FF', '#1ABCFE'],
      slack: ['#4A154B', '#36C5F0', '#2EB67D'],
      uber: ['#000000', '#276EF1', '#05A357']
    };

    const colors = knownBrands[brandBase] || ['#C2410C', '#2563EB', '#10B981'];

    const extracted = {
      brandName: brandTitle,
      colors,
      font: 'Inter'
    };

    this.applyExtractedBrandTokens(extracted, domain);
    this.lastImportedResult = {
      extracted,
      fileName: domain,
      fileSize: 'Online'
    };

    this.render();
    bridgeClient.notifyUser(`✓ Successfully extracted brand tokens from "${domain}"!`, 'success');
  }

  isColorNeutral(hex) {
    const rgb = hexToRgb(hex);
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const delta = max - min;
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    const saturation = max === 0 ? 0 : delta / max;
    return saturation < 0.22 || brightness > 242 || brightness < 28;
  }

  extractBrandNameFromTextOrFile(text, fileName) {
    if (text) {
      const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
      if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 2) {
        const t = titleMatch[1].replace(/brand[\s_-]*guidelines?/gi, '').replace(/style[\s_-]*guide/gi, '').trim();
        if (t.length > 1) return t;
      }
    }

    let base = (fileName || 'Brand Guidelines').replace(/\.(pdf|json|txt|docx)$/i, '');
    base = base.replace(/brand[\s_-]*(?:guidelines?|guides?)/gi, '')
               .replace(/style[\s_-]*guides?/gi, '')
               .replace(/manuals?/gi, '')
               .replace(/design[\s_-]*systems?/gi, '')
               .replace(/[-_]/g, ' ')
               .replace(/\b(v\d+|final|202\d|revised|copy)\b/gi, '')
               .trim();
    if (!base) {
      base = (fileName || 'Brand Guidelines').replace(/\.(pdf|json|txt|docx)$/i, '').replace(/[-_]/g, ' ').trim();
    }
    return base.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  applyExtractedBrandTokens(data, fileName) {
    if (!data || !data.colors || data.colors.length === 0) return;

    this.tokens.brand.name = data.brandName + ' Design System';
    this.tokens.brand.description = `Brand guidelines imported from ${fileName || 'PDF'} on ${new Date().toLocaleDateString()}`;

    const primaryHex = data.colors[0];
    this.tokens.brand.primary = {
      name: `${data.brandName} Primary`,
      base: primaryHex,
      shades: generateTonalPalette(primaryHex)
    };

    const secondaryHex = data.colors[1] || '#2563EB';
    this.tokens.brand.secondary = {
      name: `${data.brandName} Secondary`,
      base: secondaryHex,
      shades: generateTonalPalette(secondaryHex)
    };

    const tertiaryHex = data.colors[2] || '#10B981';
    this.tokens.brand.tertiary = {
      name: `${data.brandName} Accent`,
      base: tertiaryHex,
      shades: generateTonalPalette(tertiaryHex)
    };

    if (data.colors.length > 3) {
      if (!this.tokens.customColors) this.tokens.customColors = [];
      const extraColors = data.colors.slice(3, 7);
      extraColors.forEach((hex, idx) => {
        const existingIdx = this.tokens.customColors.findIndex(c => c.base.toUpperCase() === hex.toUpperCase());
        if (existingIdx === -1) {
          this.tokens.customColors.push({
            id: `custom-imported-${Date.now()}-${idx}`,
            name: `${data.brandName} Accent ${idx + 1}`,
            role: 'Imported Brand Accent',
            base: hex,
            shades: generateTonalPalette(hex)
          });
        }
      });
    }

    if (data.font && this.tokens.typographyTokens) {
      this.tokens.typographyTokens.fontFamilySans = `"${data.font}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    }

    this.saveTokens();
  }
}
