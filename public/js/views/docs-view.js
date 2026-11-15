// AI Design System Creator - Industry Standard Documentation Site
// Requirement 25: Complete 4-section documentation with Foundations, Playground, Guidelines/a11y, Patterns/Governance
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class DocsView {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeSection = 'foundations'; // 'foundations' | 'playground' | 'guidelines' | 'patterns'
    this.playgroundComponentId = 'button';
    this.playgroundState = 'Rest'; // 'Rest' | 'Hover' | 'Focus' | 'Disabled'
    this.playgroundSize = 'md'; // 'sm' | 'md' | 'lg'
    this.playgroundVariant = 'primary'; // 'primary' | 'secondary' | 'outline' | 'danger'
    this.playgroundLabel = 'Save changes';
    this.playgroundIcon = true;
    this.playgroundTheme = 'light'; // 'light' | 'dark'
    this.activeCodeTab = 'react'; // 'react' | 'html' | 'vue' | 'css'
    this.searchQuery = '';

    this.render();
    this.bindEvents();
  }

  bindEvents() {
    store.subscribe('theme:changed', () => this.render());
  }

  render() {
    this.container.innerHTML = `
      <div class="docs-site-container">
        <!-- Docs Left Sidebar Navigation -->
        <aside class="docs-sidebar">
          <div class="docs-sidebar-brand">
            <span class="docs-brand-badge">DS DOCS v2.5</span>
            <h3>Design System Standards</h3>
            <p>Industry-grade specifications & guidelines</p>
          </div>

          <div class="docs-nav-menu">
            <div class="docs-nav-group">
              <span class="nav-group-title">1. FOUNDATIONS & TOKENS</span>
              <button class="docs-nav-item ${this.activeSection === 'foundations' ? 'active' : ''}" data-section="foundations">
                <span class="nav-icon">🎨</span>
                <span>Colors & WCAG Contrast</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'typography' ? 'active' : ''}" data-section="typography">
                <span class="nav-icon">🔤</span>
                <span>Typography Scales</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'spacing' ? 'active' : ''}" data-section="spacing">
                <span class="nav-icon">📐</span>
                <span>Spacing, Grids & Elevation</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'tokens' ? 'active' : ''}" data-section="tokens">
                <span class="nav-icon">🏷️</span>
                <span>Design Tokens Table</span>
              </button>
            </div>

            <div class="docs-nav-group">
              <span class="nav-group-title">2. COMPONENT PLAYGROUND</span>
              <button class="docs-nav-item ${this.activeSection === 'playground' ? 'active' : ''}" data-section="playground">
                <span class="nav-icon">⚡</span>
                <span>Interactive Playground</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'api' ? 'active' : ''}" data-section="api">
                <span class="nav-icon">📋</span>
                <span>Component API & Props</span>
              </button>
            </div>

            <div class="docs-nav-group">
              <span class="nav-group-title">3. USAGE & ACCESSIBILITY</span>
              <button class="docs-nav-item ${this.activeSection === 'guidelines' ? 'active' : ''}" data-section="guidelines">
                <span class="nav-icon">⚖️</span>
                <span>Do's and Don'ts</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'a11y' ? 'active' : ''}" data-section="a11y">
                <span class="nav-icon">♿</span>
                <span>Accessibility (a11y) Specs</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'voice' ? 'active' : ''}" data-section="voice">
                <span class="nav-icon">✍️</span>
                <span>Content & Voice Guidelines</span>
              </button>
            </div>

            <div class="docs-nav-group">
              <span class="nav-group-title">4. PATTERNS & GOVERNANCE</span>
              <button class="docs-nav-item ${this.activeSection === 'patterns' ? 'active' : ''}" data-section="patterns">
                <span class="nav-icon">🧩</span>
                <span>UI Patterns & Templates</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'assets' ? 'active' : ''}" data-section="assets">
                <span class="nav-icon">📦</span>
                <span>Getting Started & Assets</span>
              </button>
              <button class="docs-nav-item ${this.activeSection === 'changelog' ? 'active' : ''}" data-section="changelog">
                <span class="nav-icon">📜</span>
                <span>Changelog & Contribution</span>
              </button>
            </div>
          </div>

          <div class="docs-sidebar-footer">
            <button class="adsc-btn btn-secondary compact full-width" id="btn-back-to-editor">
              ← Return to Contract Editor
            </button>
          </div>
        </aside>

        <!-- Docs Main Content Stage -->
        <main class="docs-main-content">
          ${this.renderSectionContent()}
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  renderSectionContent() {
    switch (this.activeSection) {
      case 'foundations':
      case 'tokens':
        return this.renderFoundationsSection();
      case 'typography':
        return this.renderTypographySection();
      case 'spacing':
        return this.renderSpacingSection();
      case 'playground':
      case 'api':
        return this.renderPlaygroundSection();
      case 'guidelines':
        return this.renderDosAndDontsSection();
      case 'a11y':
        return this.renderAccessibilitySection();
      case 'voice':
        return this.renderVoiceSection();
      case 'patterns':
        return this.renderPatternsSection();
      case 'assets':
      case 'changelog':
        return this.renderGovernanceSection();
      default:
        return this.renderFoundationsSection();
    }
  }

  // =========================================================
  // SECTION 1: FOUNDATIONS & DESIGN TOKENS
  // =========================================================
  renderFoundationsSection() {
    const brandColors = [
      { name: 'Brand 900', hex: '#7C2D12', role: 'Deep contrast text & headings', ratio: '12.4:1', wcag: 'AAA' },
      { name: 'Brand 800 (Primary)', hex: '#9A3412', role: 'Hover buttons & emphasized borders', ratio: '8.6:1', wcag: 'AAA' },
      { name: 'Brand 700 (Terracotta)', hex: '#C2410C', role: 'Default primary actions & active tabs', ratio: '5.2:1', wcag: 'AA' },
      { name: 'Brand 500', hex: '#F97316', role: 'Focus indicators & visual accents', ratio: '3.1:1', wcag: 'UI Large' },
      { name: 'Brand 100', hex: '#FFEDD5', role: 'Badges & active container fills', ratio: '1.2:1', wcag: 'Surface' },
      { name: 'Brand 50', hex: '#FFF7ED', role: 'Subtle hover states & table rows', ratio: '1.1:1', wcag: 'Background' }
    ];

    const semanticColors = [
      { name: 'Success Green', hex: '#15803D', bg: '#DCFCE7', role: 'Confirmations, published badges, positive trends', ratio: '6.2:1', wcag: 'AAA' },
      { name: 'Error / Danger Red', hex: '#DC2626', bg: '#FEE2E2', role: 'Destructive alerts, form validation errors', ratio: '5.4:1', wcag: 'AA' },
      { name: 'Warning Amber', hex: '#B45309', bg: '#FEF3C7', role: 'Draft indicators, cautionary messages', ratio: '5.8:1', wcag: 'AA' },
      { name: 'Info Blue', hex: '#1D4ED8', bg: '#DBEAFE', role: 'System announcements, helpful hints', ratio: '7.1:1', wcag: 'AAA' }
    ];

    const tokensSyncList = [
      { css: '--color-primary-base', figma: 'Brand/Terracotta Primary', type: 'Color', val: '#C2410C', status: 'Synced' },
      { css: '--color-primary-hover', figma: 'Brand/Terracotta Dark', type: 'Color', val: '#9A3412', status: 'Synced' },
      { css: '--color-surface-bg', figma: 'Surface/Canvas Background', type: 'Color', val: '#FFFFFF', status: 'Synced' },
      { css: '--color-surface-subtle', figma: 'Surface/Subtle Neutral', type: 'Color', val: '#F9FAFB', status: 'Synced' },
      { css: '--radius-component-sm', figma: 'Radii/Small (4px)', type: 'Number', val: '4px', status: 'Synced' },
      { css: '--radius-component-md', figma: 'Radii/Medium (8px)', type: 'Number', val: '8px', status: 'Synced' },
      { css: '--radius-component-full', figma: 'Radii/Full Pill (9999px)', type: 'Number', val: '9999px', status: 'Synced' },
      { css: '--spacing-grid-base', figma: 'Spacing/Base Step (8px)', type: 'Number', val: '8px', status: 'Synced' },
      { css: '--elevation-modal', figma: 'Shadows/Elevation 3', type: 'Effect', val: '0 20px 25px -5px rgba(0,0,0,0.15)', status: 'Synced' }
    ];

    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">1. Foundations & Tokens</span>
          <h1>Color Palettes & WCAG Contrast Scores</h1>
          <p class="lead-text">
            The core visual foundation guarantees brand consistency across Figma design files and production code,
            validated against WCAG 2.1 Level AA/AAA accessibility criteria for optical legibility.
          </p>
        </header>

        <!-- Brand Scale Swatches Grid -->
        <section class="docs-section">
          <h2>Brand Terracotta Palette</h2>
          <div class="swatches-grid-cards">
            ${brandColors.map(c => `
              <div class="swatch-doc-card">
                <div class="swatch-color-box" style="background-color: ${c.hex};">
                  <span class="swatch-contrast-badge wcag-${c.wcag.toLowerCase()}">WCAG ${c.wcag}</span>
                </div>
                <div class="swatch-info">
                  <div class="swatch-name-row">
                    <strong>${c.name}</strong>
                    <code>${c.hex}</code>
                  </div>
                  <p class="swatch-role">${c.role}</p>
                  <span class="contrast-score">Contrast: <strong>${c.ratio}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Semantic Palette Table -->
        <section class="docs-section">
          <h2>Semantic & Status Colors</h2>
          <table class="docs-data-table">
            <thead>
              <tr>
                <th>Semantic Role</th>
                <th>Hex Code</th>
                <th>Surface / Tint</th>
                <th>WCAG Contrast</th>
                <th>Standard Usage</th>
              </tr>
            </thead>
            <tbody>
              ${semanticColors.map(s => `
                <tr>
                  <td><span class="color-dot" style="background:${s.hex};"></span> <strong>${s.name}</strong></td>
                  <td><code>${s.hex}</code></td>
                  <td><span class="badge-pill" style="background:${s.bg}; color:${s.hex}; font-weight:600;">Sample Tint</span></td>
                  <td><span class="wcag-pill">${s.wcag} (${s.ratio})</span></td>
                  <td>${s.role}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <!-- Design Tokens Synchronization Table -->
        <section class="docs-section">
          <div class="section-title-row">
            <h2>Design Tokens Sync Table (Figma &harr; CSS Variables)</h2>
            <span class="sync-badge">✓ 100% Synced</span>
          </div>
          <p>These tokens map 1:1 between Figma variables, CSS stylesheets, and the JSON component contract.</p>

          <table class="docs-data-table">
            <thead>
              <tr>
                <th>CSS Variable Token</th>
                <th>Figma Variable Binding</th>
                <th>Type</th>
                <th>Resolved Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tokensSyncList.map(t => `
                <tr>
                  <td><code>${t.css}</code></td>
                  <td><span class="figma-binding-pill">${t.figma}</span></td>
                  <td><span class="type-pill">${t.type}</span></td>
                  <td><code>${t.val}</code></td>
                  <td><span class="status-synced-pill">${t.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
      </div>
    `;
  }

  renderTypographySection() {
    const typeScale = [
      { name: 'Display 1', size: '36px / 2.25rem', line: '44px / 1.22', weight: '700 (Bold)', usage: 'Major landing headers & hero section titles' },
      { name: 'Heading 1', size: '28px / 1.75rem', line: '36px / 1.28', weight: '700 (Bold)', usage: 'Page titles & modal headers' },
      { name: 'Heading 2', size: '22px / 1.375rem', line: '28px / 1.27', weight: '600 (Semibold)', usage: 'Card titles & major widget headings' },
      { name: 'Subheading', size: '16px / 1.0rem', line: '24px / 1.5', weight: '600 (Semibold)', usage: 'Section subtitles & table headers' },
      { name: 'Body Regular', size: '14px / 0.875rem', line: '20px / 1.43', weight: '400 (Regular)', usage: 'Standard paragraph text, form descriptions' },
      { name: 'Body Medium', size: '14px / 0.875rem', line: '20px / 1.43', weight: '500 (Medium)', usage: 'Interactive button labels & navigation links' },
      { name: 'Caption / Small', size: '12px / 0.75rem', line: '16px / 1.33', weight: '400 (Regular)', usage: 'Helper text, timestamps & microcopy' }
    ];

    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">1. Foundations & Tokens</span>
          <h1>Typography Scales & Vertical Rhythm</h1>
          <p class="lead-text">
            Our typography system is built around the Inter and system font stack, tuned for crisp display readability
            across high-density screens with responsive rem scaling and consistent vertical baseline rhythm.
          </p>
        </header>

        <section class="docs-section">
          <h2>Type Scale Hierarchy</h2>
          <table class="docs-data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Font Size</th>
                <th>Line Height</th>
                <th>Font Weight</th>
                <th>Usage Rules</th>
              </tr>
            </thead>
            <tbody>
              ${typeScale.map(t => `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td><code>${t.size}</code></td>
                  <td><code>${t.line}</code></td>
                  <td>${t.weight}</td>
                  <td>${t.usage}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <section class="docs-section">
          <h2>Visual Scale Preview</h2>
          <div class="type-preview-cards-stack">
            <div class="type-preview-card">
              <span class="type-level-tag">Display 1 • 36px</span>
              <h1 style="font-size:36px; line-height:44px; font-weight:700; margin:4px 0;">Build faster design systems</h1>
            </div>
            <div class="type-preview-card">
              <span class="type-level-tag">Heading 1 • 28px</span>
              <h2 style="font-size:28px; line-height:36px; font-weight:700; margin:4px 0;">Component contracts & variants</h2>
            </div>
            <div class="type-preview-card">
              <span class="type-level-tag">Body Regular • 14px</span>
              <p style="font-size:14px; line-height:20px; color:#4B5563; margin:4px 0;">
                All typography is configured with automated kerning, responsive rem increments, and high contrast against light or dark canvas surfaces.
              </p>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderSpacingSection() {
    const spacingSteps = [
      { step: '0', val: '0px', rem: '0rem', use: 'No padding or zero margin' },
      { step: '1', val: '4px', rem: '0.25rem', use: 'Tight icon gaps, compact badge padding' },
      { step: '2', val: '8px', rem: '0.5rem', use: 'Base step: standard button vertical padding, form gaps' },
      { step: '3', val: '12px', rem: '0.75rem', use: 'Input horizontal padding, chip margins' },
      { step: '4', val: '16px', rem: '1.0rem', use: 'Card container padding, dialog spacing' },
      { step: '6', val: '24px', rem: '1.5rem', use: 'Section padding, layout gutters' },
      { step: '8', val: '32px', rem: '2.0rem', use: 'Modal dialog outer margins, stage gutters' },
      { step: '12', val: '48px', rem: '3.0rem', use: 'Major page section divisions' }
    ];

    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">1. Foundations & Tokens</span>
          <h1>Spacing, 8pt Grids & Elevation</h1>
          <p class="lead-text">
            Structured padding, margin and elevation variables maintain rhythm across complex multi-column UIs.
          </p>
        </header>

        <section class="docs-section">
          <h2>8pt Grid System Steps</h2>
          <table class="docs-data-table">
            <thead>
              <tr>
                <th>Token Step</th>
                <th>Pixel Value</th>
                <th>Rem Equivalent</th>
                <th>Visual Gauge</th>
                <th>Standard Usage</th>
              </tr>
            </thead>
            <tbody>
              ${spacingSteps.map(s => `
                <tr>
                  <td><code>--space-${s.step}</code></td>
                  <td><strong>${s.val}</strong></td>
                  <td><code>${s.rem}</code></td>
                  <td>
                    <div style="height:12px; width:${Math.max(4, parseInt(s.val))}px; background:#C2410C; border-radius:2px;"></div>
                  </td>
                  <td>${s.use}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>

        <section class="docs-section">
          <h2>Elevation & Drop Shadow Levels</h2>
          <div class="elevation-cards-row">
            <div class="elevation-card" style="box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h4>Elevation 1 (Subtle)</h4>
              <p>Cards & dropdown menus</p>
              <code>box-shadow: 0 1px 3px rgba(0,0,0,0.1);</code>
            </div>
            <div class="elevation-card" style="box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
              <h4>Elevation 2 (Floating)</h4>
              <p>Tooltips & floating bars</p>
              <code>box-shadow: 0 4px 6px -1px rgba(...);</code>
            </div>
            <div class="elevation-card" style="box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04);">
              <h4>Elevation 3 (Modal)</h4>
              <p>Dialog modals & active sheets</p>
              <code>box-shadow: 0 20px 25px -5px rgba(...);</code>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  // =========================================================
  // SECTION 2: INTERACTIVE COMPONENT PLAYGROUND
  // =========================================================
  renderPlaygroundSection() {
    const isDark = this.playgroundTheme === 'dark';
    const isHover = this.playgroundState === 'Hover';
    const isFocus = this.playgroundState === 'Focus';
    const isDisabled = this.playgroundState === 'Disabled';

    // Calculate preview styles
    let bg = '#C2410C';
    let text = '#FFFFFF';
    let border = '#C2410C';
    let shadow = 'none';

    if (this.playgroundVariant === 'secondary') {
      bg = isDark ? '#374151' : (isHover ? '#E5E7EB' : '#F3F4F6');
      text = isDark ? '#F9FAFB' : '#1F2937';
      border = isDark ? '#4B5563' : '#E5E7EB';
    } else if (this.playgroundVariant === 'outline') {
      bg = isDark ? 'transparent' : '#FFFFFF';
      text = '#C2410C';
      border = '#C2410C';
    } else if (this.playgroundVariant === 'danger') {
      bg = isHover ? '#B91C1C' : '#DC2626';
      text = '#FFFFFF';
      border = bg;
    } else {
      bg = isHover ? '#9A3412' : '#C2410C';
    }

    if (isFocus) shadow = '0 0 0 3px rgba(194,65,12,0.35)';
    if (isDisabled) {
      bg = isDark ? '#374151' : '#F3F4F6';
      text = '#9CA3AF';
      border = '#E5E7EB';
    }

    const padding = this.playgroundSize === 'sm' ? '6px 12px' : (this.playgroundSize === 'lg' ? '12px 24px' : '9px 18px');
    const fontSize = this.playgroundSize === 'sm' ? '12px' : (this.playgroundSize === 'lg' ? '16px' : '14px');

    const codeReact = `<Button
  variant="${this.playgroundVariant}"
  size="${this.playgroundSize}"
  state="${this.playgroundState}"
  ${this.playgroundIcon ? 'hasIcon\n  ' : ''}${isDisabled ? 'disabled\n  ' : ''}onClick={() => console.log('Action')}
>
  ${this.playgroundLabel}
</Button>`;

    const codeHtml = `<button 
  class="btn btn-${this.playgroundVariant} btn-${this.playgroundSize}"
  ${isDisabled ? 'disabled' : ''}
>
  ${this.playgroundIcon ? '<span class="icon">✦</span> ' : ''}${this.playgroundLabel}
</button>`;

    const codeVue = `<template>
  <adsc-button
    variant="${this.playgroundVariant}"
    size="${this.playgroundSize}"
    :disabled="${isDisabled}"
  >
    ${this.playgroundLabel}
  </adsc-button>
</template>`;

    const codeCss = `.btn-${this.playgroundVariant} {
  background-color: ${bg};
  color: ${text};
  border: 1px solid ${border};
  border-radius: 8px;
  padding: ${padding};
  font-size: ${fontSize};
  box-shadow: ${shadow};
}`;

    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">2. Interactive Component Playground</span>
          <h1>Live Component Playground & Props API</h1>
          <p class="lead-text">
            Test live coded components with real-time property toggles, theme switching, and copy-ready code snippets.
          </p>
        </header>

        <!-- Live Playground Box -->
        <div class="docs-playground-card">
          <!-- Playground Top Bar -->
          <div class="playground-top-bar">
            <div class="playground-comp-select">
              <label>Component:</label>
              <select id="play-comp-select" class="control-select-sm">
                <option value="button" ${this.playgroundComponentId === 'button' ? 'selected' : ''}>Button</option>
                <option value="checkbox" ${this.playgroundComponentId === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                <option value="switch" ${this.playgroundComponentId === 'switch' ? 'selected' : ''}>Switch / Toggle</option>
                <option value="input" ${this.playgroundComponentId === 'input' ? 'selected' : ''}>Input Field</option>
                <option value="badge" ${this.playgroundComponentId === 'badge' ? 'selected' : ''}>Badge</option>
              </select>
            </div>

            <div class="playground-theme-toggle">
              <button class="theme-pill-btn ${!isDark ? 'active' : ''}" id="btn-play-light">☀️ Light</button>
              <button class="theme-pill-btn ${isDark ? 'active' : ''}" id="btn-play-dark">🌙 Dark</button>
            </div>
          </div>

          <!-- Live Render Surface -->
          <div class="playground-surface ${isDark ? 'surface-dark' : 'surface-light'}">
            <div class="playground-render-target">
              ${this.playgroundComponentId === 'checkbox' ? `
                <label style="display:inline-flex; align-items:center; gap:10px; cursor:pointer;">
                  <div style="width:22px; height:22px; border-radius:4px; background:${isHover ? '#9A3412' : '#C2410C'}; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:${isFocus ? '0 0 0 3px rgba(194,65,12,0.3)' : 'none'};">
                    ✓
                  </div>
                  <span style="font-size:${fontSize}; font-weight:500; color:${isDark ? '#F9FAFB' : '#1F2937'};">${this.playgroundLabel}</span>
                </label>
              ` : this.playgroundComponentId === 'switch' ? `
                <div style="display:inline-flex; align-items:center; gap:12px; cursor:pointer;">
                  <div style="width:46px; height:24px; border-radius:999px; background:${isHover ? '#9A3412' : '#C2410C'}; padding:2px; display:flex; align-items:center; justify-content:flex-end; box-shadow:${isFocus ? '0 0 0 3px rgba(194,65,12,0.3)' : 'none'};">
                    <div style="width:20px; height:20px; border-radius:50%; background:#FFFFFF;"></div>
                  </div>
                  <span style="font-size:${fontSize}; font-weight:500; color:${isDark ? '#F9FAFB' : '#1F2937'};">${this.playgroundLabel}</span>
                </div>
              ` : this.playgroundComponentId === 'input' ? `
                <div style="display:flex; flex-direction:column; gap:6px; width:280px;">
                  <label style="font-size:12px; font-weight:600; color:${isDark ? '#D1D5DB' : '#4B5563'};">${this.playgroundLabel}</label>
                  <input type="text" value="Input value" style="padding:${padding}; font-size:${fontSize}; border-radius:6px; border:1px solid ${isFocus ? '#C2410C' : '#D1D5DB'}; background:${isDark ? '#1F2937' : '#FFFFFF'}; color:${isDark ? '#F9FAFB' : '#111827'}; box-shadow:${shadow};" />
                </div>
              ` : this.playgroundComponentId === 'badge' ? `
                <span style="display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; background:#FFEDD5; color:#9A3412; border:1px solid #FDBA74; font-weight:600; font-size:${fontSize};">
                  ${this.playgroundLabel}
                </span>
              ` : `
                <button style="display:inline-flex; align-items:center; gap:8px; padding:${padding}; font-size:${fontSize}; border-radius:8px; background:${bg}; color:${text}; border:1px solid ${border}; box-shadow:${shadow}; font-weight:600; cursor:pointer;">
                  ${this.playgroundIcon ? '<span>✦</span>' : ''}
                  <span>${this.playgroundLabel}</span>
                </button>
              `}
            </div>
          </div>

          <!-- Playground Props Controls Row -->
          <div class="playground-controls-grid">
            <div class="control-unit">
              <label>State</label>
              <select id="play-state-select" class="control-select-sm">
                <option value="Rest" ${this.playgroundState === 'Rest' ? 'selected' : ''}>Rest</option>
                <option value="Hover" ${this.playgroundState === 'Hover' ? 'selected' : ''}>Hover</option>
                <option value="Focus" ${this.playgroundState === 'Focus' ? 'selected' : ''}>Focus</option>
                <option value="Disabled" ${this.playgroundState === 'Disabled' ? 'selected' : ''}>Disabled</option>
              </select>
            </div>

            <div class="control-unit">
              <label>Variant</label>
              <select id="play-variant-select" class="control-select-sm">
                <option value="primary" ${this.playgroundVariant === 'primary' ? 'selected' : ''}>Primary</option>
                <option value="secondary" ${this.playgroundVariant === 'secondary' ? 'selected' : ''}>Secondary</option>
                <option value="outline" ${this.playgroundVariant === 'outline' ? 'selected' : ''}>Outline</option>
                <option value="danger" ${this.playgroundVariant === 'danger' ? 'selected' : ''}>Danger</option>
              </select>
            </div>

            <div class="control-unit">
              <label>Size</label>
              <select id="play-size-select" class="control-select-sm">
                <option value="sm" ${this.playgroundSize === 'sm' ? 'selected' : ''}>Small (sm)</option>
                <option value="md" ${this.playgroundSize === 'md' ? 'selected' : ''}>Medium (md)</option>
                <option value="lg" ${this.playgroundSize === 'lg' ? 'selected' : ''}>Large (lg)</option>
              </select>
            </div>

            <div class="control-unit">
              <label>Label</label>
              <input type="text" id="play-label-input" value="${this.playgroundLabel}" class="control-input-sm" />
            </div>

            <div class="control-unit toggle-unit">
              <label>Leading Icon</label>
              <input type="checkbox" id="play-icon-toggle" ${this.playgroundIcon ? 'checked' : ''} />
            </div>
          </div>

          <!-- Code Snippets Tabs (React, HTML, Vue, CSS) -->
          <div class="playground-code-drawer">
            <div class="code-drawer-header">
              <div class="code-lang-tabs">
                <button class="code-tab-btn ${this.activeCodeTab === 'react' ? 'active' : ''}" data-lang="react">React</button>
                <button class="code-tab-btn ${this.activeCodeTab === 'html' ? 'active' : ''}" data-lang="html">HTML</button>
                <button class="code-tab-btn ${this.activeCodeTab === 'vue' ? 'active' : ''}" data-lang="vue">Vue</button>
                <button class="code-tab-btn ${this.activeCodeTab === 'css' ? 'active' : ''}" data-lang="css">CSS</button>
              </div>
              <button class="btn-copy-code" id="btn-copy-playground-code">📋 Copy Snippet</button>
            </div>
            <div class="code-drawer-body">
              <pre><code>${this.escapeHtml(
                this.activeCodeTab === 'react' ? codeReact :
                this.activeCodeTab === 'html' ? codeHtml :
                this.activeCodeTab === 'vue' ? codeVue : codeCss
              )}</code></pre>
            </div>
          </div>
        </div>

        <!-- Component API / Props Table -->
        <section class="docs-section mt-32">
          <h2>Component API & Props Table</h2>
          <table class="docs-data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Accepted Values</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>variant</code></td>
                <td><code>enum</code></td>
                <td><code>'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'</code></td>
                <td><code>'primary'</code></td>
                <td>Visual appearance style of the button surface.</td>
              </tr>
              <tr>
                <td><code>size</code></td>
                <td><code>enum</code></td>
                <td><code>'sm' | 'md' | 'lg'</code></td>
                <td><code>'md'</code></td>
                <td>Controls padding, minimum height, and text font size.</td>
              </tr>
              <tr>
                <td><code>disabled</code></td>
                <td><code>boolean</code></td>
                <td><code>true | false</code></td>
                <td><code>false</code></td>
                <td>Suppresses hover/click interactions and applies accessible disabled palette.</td>
              </tr>
              <tr>
                <td><code>hasLeftIcon</code></td>
                <td><code>boolean</code></td>
                <td><code>true | false</code></td>
                <td><code>false</code></td>
                <td>Renders a leading visual icon slot inside the button layout.</td>
              </tr>
              <tr>
                <td><code>onClick</code></td>
                <td><code>function</code></td>
                <td><code>(event) =&gt; void</code></td>
                <td><code>undefined</code></td>
                <td>Primary click event handler for user interactions.</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    `;
  }

  // =========================================================
  // SECTION 3: USAGE GUIDELINES & ACCESSIBILITY
  // =========================================================
  renderDosAndDontsSection() {
    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">3. Usage Guidelines & Accessibility</span>
          <h1>Do's and Don'ts Visual Best Practices</h1>
          <p class="lead-text">
            Side-by-side design patterns illustrating correct implementation standards alongside common mistakes.
          </p>
        </header>

        <!-- Do / Don't Grid -->
        <section class="docs-section">
          <h2>1. Button Hierarchy & Placement</h2>
          <div class="dos-donts-grid">
            <div class="guideline-card card-do">
              <div class="card-status-banner do-banner">
                <span class="status-icon">✓</span>
                <strong>DO: Establish One Primary Action</strong>
              </div>
              <div class="guideline-visual">
                <button class="adsc-btn btn-secondary compact">Cancel</button>
                <button class="adsc-btn btn-primary compact">Publish changes</button>
              </div>
              <p class="guideline-caption">
                Use a single high-emphasis primary button paired with a neutral secondary button to establish clear visual hierarchy.
              </p>
            </div>

            <div class="guideline-card card-dont">
              <div class="card-status-banner dont-banner">
                <span class="status-icon">✕</span>
                <strong>DON'T: Compete With Multiple Primaries</strong>
              </div>
              <div class="guideline-visual">
                <button class="adsc-btn btn-primary compact">Cancel</button>
                <button class="adsc-btn btn-primary compact">Publish changes</button>
              </div>
              <p class="guideline-caption">
                Never place two primary buttons next to each other; it creates visual confusion regarding which action is dominant.
              </p>
            </div>
          </div>
        </section>

        <section class="docs-section">
          <h2>2. Microcopy & Button Labels</h2>
          <div class="dos-donts-grid">
            <div class="guideline-card card-do">
              <div class="card-status-banner do-banner">
                <span class="status-icon">✓</span>
                <strong>DO: Use Clear Action Verbs</strong>
              </div>
              <div class="guideline-visual">
                <button class="adsc-btn btn-primary compact">Create Project</button>
                <button class="adsc-btn btn-primary compact">Export Figma File</button>
              </div>
              <p class="guideline-caption">
                Begin button text with clear, unambiguous verbs specifying exactly what will happen when clicked.
              </p>
            </div>

            <div class="guideline-card card-dont">
              <div class="card-status-banner dont-banner">
                <span class="status-icon">✕</span>
                <strong>DON'T: Use Vague or Generic Labels</strong>
              </div>
              <div class="guideline-visual">
                <button class="adsc-btn btn-primary compact">Click Here</button>
                <button class="adsc-btn btn-primary compact">Submit</button>
              </div>
              <p class="guideline-caption">
                Avoid generic labels like "Click here" or "Go" which fail screen-reader context requirements.
              </p>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderAccessibilitySection() {
    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">3. Usage Guidelines & Accessibility</span>
          <h1>Accessibility (a11y) & Keyboard Navigation Specs</h1>
          <p class="lead-text">
            Compliant with WCAG 2.1 Level AA and Section 508 standards to ensure full keyboard navigation and assistive screen-reader interoperability.
          </p>
        </header>

        <section class="docs-section">
          <h2>Keyboard Interaction Matrix</h2>
          <table class="docs-data-table">
            <thead>
              <tr>
                <th>Key Trigger</th>
                <th>Target Component</th>
                <th>Expected Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd>Tab</kbd></td>
                <td>All interactive elements</td>
                <td>Advances focus to the next interactive element in DOM sequence.</td>
              </tr>
              <tr>
                <td><kbd>Shift</kbd> + <kbd>Tab</kbd></td>
                <td>All interactive elements</td>
                <td>Moves focus backwards to the previous interactive element.</td>
              </tr>
              <tr>
                <td><kbd>Enter</kbd> / <kbd>Space</kbd></td>
                <td>Buttons, Checkboxes, Switches</td>
                <td>Activates the button or toggles the checkbox/switch state.</td>
              </tr>
              <tr>
                <td><kbd>Escape</kbd></td>
                <td>Modals, Dropdowns, Drawers</td>
                <td>Dismisses active overlays and restores focus to the triggering element.</td>
              </tr>
              <tr>
                <td><kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd></td>
                <td>Selects, Menus, Radios</td>
                <td>Navigates between options in dropdown lists and radio groups.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="docs-section">
          <h2>Focus Ring & ARIA Specifications</h2>
          <div class="a11y-spec-cards-grid">
            <div class="spec-card">
              <h4>High-Contrast 3px Focus Rings</h4>
              <p>Every focusable element must present an unbroken 3px focus ring with minimum 3:1 contrast ratio against both component surface and page canvas.</p>
              <code>outline: 3px solid #C2410C; outline-offset: 2px;</code>
            </div>

            <div class="spec-card">
              <h4>Screen Reader ARIA Roles</h4>
              <p>Components utilize native semantic HTML elements (<code>&lt;button&gt;</code>, <code>&lt;input&gt;</code>) paired with <code>aria-checked</code>, <code>aria-expanded</code>, and <code>aria-disabled</code>.</p>
              <code>aria-expanded="true" aria-haspopup="dialog"</code>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderVoiceSection() {
    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">3. Usage Guidelines & Accessibility</span>
          <h1>Content & Voice Guidelines</h1>
          <p class="lead-text">
            Consistent microcopy rules ensure clarity, empathy, and conciseness across UI messaging, errors, and empty states.
          </p>
        </header>

        <section class="docs-section">
          <h2>Microcopy Standards by Surface</h2>
          <table class="docs-data-table">
            <thead>
              <tr>
                <th>UI Surface</th>
                <th>Recommended Pattern</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Action Buttons</td>
                <td><code>[Verb] + [Noun]</code>, sentence case, max 3 words</td>
                <td><em>Save changes, Create project, Export tokens</em></td>
              </tr>
              <tr>
                <td>Validation Errors</td>
                <td>State what went wrong and how to fix it immediately</td>
                <td><em>"Password must be at least 8 characters long."</em></td>
              </tr>
              <tr>
                <td>Empty States</td>
                <td>Friendly explanation + single clear primary call-to-action</td>
                <td><em>"No components found. Create your first component to begin."</em></td>
              </tr>
              <tr>
                <td>Tooltips</td>
                <td>Explain purpose or keyboard shortcut, never duplicate visible text</td>
                <td><em>"Push all 19 components to Figma canvas (Ctrl+Shift+P)"</em></td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    `;
  }

  // =========================================================
  // SECTION 4: PATTERNS, GOVERNANCE & RESOURCES
  // =========================================================
  renderPatternsSection() {
    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">4. Patterns, Governance & Resources</span>
          <h1>UI Patterns & Compound Templates</h1>
          <p class="lead-text">
            Standard assemblies demonstrating how individual design system components combine into cohesive workflows.
          </p>
        </header>

        <!-- Pattern 1: Authentication Form -->
        <section class="docs-section">
          <h2>Pattern: Authentication & Login Flow</h2>
          <div class="pattern-preview-box">
            <div class="pattern-form-sample">
              <h3>Sign in to your account</h3>
              <p>Enter your credentials to access your design system workspaces.</p>
              <div class="pattern-field">
                <label>Email Address</label>
                <input type="email" value="designer@studio.com" class="control-input" />
              </div>
              <div class="pattern-field">
                <label>Password</label>
                <input type="password" value="••••••••••••" class="control-input" />
              </div>
              <div class="pattern-options-row">
                <label class="pattern-checkbox"><input type="checkbox" checked /> Remember me</label>
                <a href="#" style="color:#C2410C; font-size:13px; text-decoration:none;">Forgot password?</a>
              </div>
              <button class="adsc-btn btn-primary full-width" style="margin-top:12px;">Sign in</button>
            </div>
          </div>
        </section>

        <!-- Pattern 2: Confirmation Dialog -->
        <section class="docs-section">
          <h2>Pattern: Destructive Confirmation Dialog</h2>
          <div class="pattern-preview-box">
            <div class="pattern-modal-sample">
              <div class="modal-top">
                <strong>⚠️ Delete component contract?</strong>
                <span>✕</span>
              </div>
              <p>This will permanently remove the component and its 20 variant definitions from your active project scope.</p>
              <div class="modal-actions">
                <button class="adsc-btn btn-secondary compact">Keep component</button>
                <button class="adsc-btn btn-primary compact" style="background:#DC2626; border-color:#B91C1C;">Delete permanently</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderGovernanceSection() {
    return `
      <div class="docs-article">
        <header class="docs-article-header">
          <span class="category-tag">4. Patterns, Governance & Resources</span>
          <h1>Getting Started, Downloads & Governance</h1>
          <p class="lead-text">
            Official assets, Figma UI Kit links, and contribution guidelines for team members proposing additions to the design system.
          </p>
        </header>

        <!-- Official Asset Downloads -->
        <section class="docs-section">
          <h2>Official Asset Downloads & Tooling</h2>
          <div class="asset-cards-grid">
            <div class="asset-card">
              <span class="asset-icon">🎨</span>
              <h4>Figma UI Kit & Variables</h4>
              <p>Native Figma library with 19 core component sets, auto-layout tokens, and light/dark variable modes.</p>
              <button class="adsc-btn btn-primary compact" id="btn-doc-download-figma">⚡ Sync to Figma</button>
            </div>

            <div class="asset-card">
              <span class="asset-icon">🏷️</span>
              <h4>JSON Design Tokens Export</h4>
              <p>W3C standard design tokens file for Style Dictionary, Tailwind CSS, and Android/iOS build pipelines.</p>
              <button class="adsc-btn btn-secondary compact" id="btn-doc-download-tokens">📋 Download JSON</button>
            </div>

            <div class="asset-card">
              <span class="asset-icon">📦</span>
              <h4>GitHub Codebase</h4>
              <p>React, HTML/CSS component templates and Figma Bridge server scripts.</p>
              <button class="adsc-btn btn-secondary compact" id="btn-doc-open-github">📁 View Files</button>
            </div>
          </div>
        </section>

        <!-- Changelog & Contribution Rules -->
        <section class="docs-section">
          <h2>Changelog & Version History</h2>
          <div class="changelog-timeline">
            <div class="timeline-item">
              <div class="timeline-badge">v2.5.0</div>
              <div class="timeline-content">
                <strong>Documentation Site & Authentic Figma Nodes (Current)</strong>
                <ul>
                  <li>Added comprehensive 4-section industry standard documentation site.</li>
                  <li>Authentic Figma node rendering: real checkboxes, switches, inputs, modals, tables, badges.</li>
                  <li>Removed graphics components; cleaned project scope.</li>
                  <li>Side-by-side live Code & Figma sync status indicators.</li>
                </ul>
              </div>
            </div>

            <div class="timeline-item">
              <div class="timeline-badge">v2.0.0</div>
              <div class="timeline-content">
                <strong>Project Scope & Figma Live Bridge</strong>
                <ul>
                  <li>Real-time WebSocket and HTTP sync between browser editor and Figma Desktop.</li>
                  <li>Project scope modal to customize foundations and components.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section class="docs-section">
          <h2>Contribution & RFC Process</h2>
          <ol class="contribution-steps">
            <li><strong>Identify Need:</strong> Verify the proposed component does not duplicate existing catalog components.</li>
            <li><strong>Design Contract:</strong> Define anatomy, props schema, and interaction states in the Contract Editor.</li>
            <li><strong>Figma Review:</strong> Sync component set to Figma and test auto-layout resizing behavior.</li>
            <li><strong>Submit Proposal:</strong> Export contract JSON and submit PR to the design system repository.</li>
          </ol>
        </section>
      </div>
    `;
  }

  // =========================================================
  // LISTENERS & EVENT BINDINGS
  // =========================================================
  attachEventListeners() {
    // Navigation items
    const navItems = this.container.querySelectorAll('.docs-nav-item');
    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-section');
        this.activeSection = sec;
        this.render();
      });
    });

    // Return to Contract Editor button
    const backBtn = this.container.querySelector('#btn-back-to-editor');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        store.setView('editor');
      });
    }

    // Playground Component Select
    const compSelect = this.container.querySelector('#play-comp-select');
    if (compSelect) {
      compSelect.addEventListener('change', (e) => {
        this.playgroundComponentId = e.target.value;
        this.render();
      });
    }

    // Theme toggles
    const lightBtn = this.container.querySelector('#btn-play-light');
    const darkBtn = this.container.querySelector('#btn-play-dark');
    if (lightBtn) lightBtn.addEventListener('click', () => { this.playgroundTheme = 'light'; this.render(); });
    if (darkBtn) darkBtn.addEventListener('click', () => { this.playgroundTheme = 'dark'; this.render(); });

    // Playground Prop Controls
    const stateSelect = this.container.querySelector('#play-state-select');
    if (stateSelect) stateSelect.addEventListener('change', (e) => { this.playgroundState = e.target.value; this.render(); });

    const varSelect = this.container.querySelector('#play-variant-select');
    if (varSelect) varSelect.addEventListener('change', (e) => { this.playgroundVariant = e.target.value; this.render(); });

    const sizeSelect = this.container.querySelector('#play-size-select');
    if (sizeSelect) sizeSelect.addEventListener('change', (e) => { this.playgroundSize = e.target.value; this.render(); });

    const labelInput = this.container.querySelector('#play-label-input');
    if (labelInput) labelInput.addEventListener('input', (e) => { this.playgroundLabel = e.target.value; this.render(); });

    const iconToggle = this.container.querySelector('#play-icon-toggle');
    if (iconToggle) iconToggle.addEventListener('change', (e) => { this.playgroundIcon = e.target.checked; this.render(); });

    // Code lang tabs
    const codeTabs = this.container.querySelectorAll('.code-tab-btn');
    codeTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCodeTab = btn.getAttribute('data-lang');
        this.render();
      });
    });

    // Copy playground code snippet
    const copyCodeBtn = this.container.querySelector('#btn-copy-playground-code');
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', () => {
        const codeEl = this.container.querySelector('.code-drawer-body code');
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent).then(() => {
            copyCodeBtn.textContent = '✓ Copied!';
            setTimeout(() => { copyCodeBtn.textContent = '📋 Copy Snippet'; }, 1800);
          });
        }
      });
    }

    // Download tokens from docs
    const dlTokensBtn = this.container.querySelector('#btn-doc-download-tokens');
    if (dlTokensBtn) {
      dlTokensBtn.addEventListener('click', () => {
        const tokensData = {
          version: '2.5.0',
          tokens: {
            color: { primary: '#C2410C', secondary: '#F3F4F6', surface: '#FFFFFF' },
            spacing: { base: '8px', sm: '4px', md: '8px', lg: '16px' },
            radius: { sm: '4px', md: '8px', full: '9999px' }
          }
        };
        const blob = new Blob([JSON.stringify(tokensData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'design-tokens-v2.5.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Sync to Figma from docs
    const figmaSyncBtn = this.container.querySelector('#btn-doc-download-figma');
    if (figmaSyncBtn) {
      figmaSyncBtn.addEventListener('click', () => {
        store.setView('editor');
        setTimeout(() => {
          const pushBtn = document.getElementById('btn-quick-push-scope');
          if (pushBtn) pushBtn.click();
        }, 150);
      });
    }
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
