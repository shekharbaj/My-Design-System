// AI Design System Creator - Design Tokens, Foundations & Brand Guidelines Studio
// Requirements 13, 14, 15: Subtabs reordered, Interactive Typography/Spacing/Border/TypeScale, High-fidelity CSS, Decoupled App Chrome

import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient } from '../bridge-client.js';
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
  }

  loadTokens() {
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
    try {
      localStorage.setItem('adsc_brand_tokens_v2', JSON.stringify(this.tokens));
    } catch (e) {}
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
                    Antigravity Design Engine
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

  // 5. Import Guidelines Tab (PDF / URL / Presets)
  renderImportGuidelinesTab() {
    return `
      <div class="tokens-tab-content">
        <div class="import-guidelines-grid">
          <!-- Drop Zone PDF -->
          <div class="token-color-card">
            <h3 class="card-headline">📄 Import Brand Guidelines PDF</h3>
            <p class="card-subhead">Upload your brand manual PDF or document to automatically extract colors, font specifications, and styling tokens.</p>

            <div class="pdf-drop-zone" id="pdf-drop-zone">
              <span class="drop-icon">📁</span>
              <p>Drag & Drop your <strong>BrandGuidelines.pdf</strong> here</p>
              <span class="subtext">or click below to browse from your computer</span>
              <input type="file" id="pdf-file-input" accept=".pdf,.json,.txt" style="display:none;" />
              <button class="adsc-btn btn-secondary compact mt-10" id="btn-browse-file">Browse File</button>
            </div>
          </div>

          <!-- URL Extractor & Presets -->
          <div class="token-color-card">
            <h3 class="card-headline">🌐 Extract Tokens from Brand Website</h3>
            <p class="card-subhead">Enter a company website domain to extract its primary brand palette and tokens.</p>

            <div class="url-input-group">
              <input type="url" id="input-brand-url" placeholder="https://stripe.com or domain" class="adsc-input" />
              <button class="adsc-btn btn-primary compact" id="btn-fetch-url-tokens">
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
