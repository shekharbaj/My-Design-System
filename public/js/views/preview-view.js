// AI Design System Creator - Interactive State Preview Sandbox & Layout Inspector
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class PreviewView {
  constructor(containerEl) {
    this.container = containerEl;
    this.measureGuidesEnabled = true;
    this.paddingOverlayEnabled = true;
    this.canvasScale = 1.0;
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    store.subscribe('component:selected', () => this.render());
    store.subscribe('component:updated', () => this.updatePreviewOnly());
    store.subscribe('state:changed', () => this.updatePreviewOnly());
    store.subscribe('props:updated', () => this.updatePreviewOnly());
    store.subscribe('styles:updated', () => this.updatePreviewOnly());
  }

  render() {
    const comp = store.getActiveComponent();
    if (!comp) return;

    this.container.innerHTML = `
      <div class="preview-layout">
        <!-- Canvas Stage -->
        <div class="canvas-stage">
          <!-- Stage Top Toolbar -->
          <div class="stage-toolbar">
            <div class="stage-states-group">
              <span class="stage-label">Interactive State:</span>
              <div class="state-tabs-pill">
                ${['Rest', 'Hover', 'Focus', 'Press'].map(st => `
                  <button class="state-tab-btn ${store.activeState === st ? 'active' : ''}" data-state="${st}">
                    <span class="state-dot state-dot-${st.toLowerCase()}"></span>
                    ${st}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="stage-tools-group">
              <div class="stage-toggles">
                <button class="tool-btn ${this.measureGuidesEnabled ? 'active' : ''}" id="btn-toggle-guides" title="Toggle Dimension Guides">
                  ${ICON_SVGS.layers}
                  <span>Guides</span>
                </button>
                <button class="tool-btn ${this.paddingOverlayEnabled ? 'active' : ''}" id="btn-toggle-padding" title="Toggle Box Padding Overlay">
                  ${ICON_SVGS.sliders}
                  <span>Box Model</span>
                </button>
              </div>

              <div class="stage-zoom-controls">
                <button class="tool-btn zoom-btn" id="btn-zoom-out" title="Zoom Out">-</button>
                <span class="zoom-text" id="zoom-level">${Math.round(this.canvasScale * 100)}%</span>
                <button class="tool-btn zoom-btn" id="btn-zoom-in" title="Zoom In">+</button>
                <button class="tool-btn zoom-btn" id="btn-zoom-reset" title="Reset Zoom">${ICON_SVGS.refresh}</button>
              </div>
            </div>
          </div>

          <!-- Viewport Workspace -->
          <div class="stage-viewport" id="stage-viewport">
            <div class="canvas-grid-bg"></div>

            <div class="component-sandbox-wrapper" id="sandbox-wrapper" style="transform: scale(${this.canvasScale})">
              <!-- Dimension tags -->
              <div class="dimension-badge dim-width" id="dim-w">128 px</div>
              <div class="dimension-badge dim-height" id="dim-h">36 px</div>

              <!-- Live Render Target -->
              <div class="component-mount-point" id="component-mount">
                ${this.generateComponentHTML(comp)}
              </div>
            </div>
          </div>

          <!-- Stage Bottom Status Bar -->
          <div class="stage-statusbar">
            <div class="status-meta">
              <span class="component-pill">${comp.category || 'Component'}</span>
              <span class="name-pill">${comp.name}</span>
              <span class="variant-pill">Variant: <strong>${comp.activeProps?.variant || 'default'}</strong></span>
              <span class="size-pill">Size: <strong>${comp.activeProps?.size || 'md'}</strong></span>
            </div>
            <div class="status-hint">
              Click component inside stage to test interactive live states
            </div>
          </div>
        </div>

        <!-- Right Side Properties & Layout Inspector -->
        <aside class="layout-inspector-panel">
          <div class="inspector-header">
            <div class="inspector-title-row">
              <h3>Layout & Styling Engine</h3>
              <span class="badge-state state-badge-${store.activeState.toLowerCase()}">${store.activeState} State</span>
            </div>
            <p class="inspector-subtitle">Fine-tune auto-layout spacing, corners, shadows and colors</p>
          </div>

          <div class="inspector-scroll-area">
            ${this.renderLayoutControls(comp)}
          </div>
        </aside>
      </div>
    `;

    this.attachInternalListeners();
    this.updateDimensions();
  }

  updatePreviewOnly() {
    const comp = store.getActiveComponent();
    const mount = document.getElementById('component-mount');
    if (mount && comp) {
      mount.innerHTML = this.generateComponentHTML(comp);
      this.updateDimensions();
    }

    // Update active tab button highlight
    const tabBtns = this.container.querySelectorAll('.state-tab-btn');
    tabBtns.forEach(btn => {
      const st = btn.getAttribute('data-state');
      btn.classList.toggle('active', st === store.activeState);
    });

    // Update status bar variant text
    const varPill = this.container.querySelector('.variant-pill strong');
    if (varPill) varPill.textContent = comp.activeProps?.variant || 'default';

    const sizePill = this.container.querySelector('.size-pill strong');
    if (sizePill) sizePill.textContent = comp.activeProps?.size || 'md';

    // Update inspector values without re-rendering whole panel if focused
    this.refreshInspectorInputs(comp);
  }

  attachInternalListeners() {
    // State tab buttons
    const stateBtns = this.container.querySelectorAll('.state-tab-btn');
    stateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newState = btn.getAttribute('data-state');
        store.setActiveState(newState);
      });
    });

    // Toggle guides
    const guidesBtn = this.container.querySelector('#btn-toggle-guides');
    if (guidesBtn) {
      guidesBtn.addEventListener('click', () => {
        this.measureGuidesEnabled = !this.measureGuidesEnabled;
        guidesBtn.classList.toggle('active', this.measureGuidesEnabled);
        const wrapper = this.container.querySelector('#sandbox-wrapper');
        if (wrapper) wrapper.classList.toggle('hide-guides', !this.measureGuidesEnabled);
      });
    }

    // Toggle padding overlay
    const padBtn = this.container.querySelector('#btn-toggle-padding');
    if (padBtn) {
      padBtn.addEventListener('click', () => {
        this.paddingOverlayEnabled = !this.paddingOverlayEnabled;
        padBtn.classList.toggle('active', this.paddingOverlayEnabled);
        const mount = this.container.querySelector('#component-mount');
        if (mount) mount.classList.toggle('show-box-model', this.paddingOverlayEnabled);
      });
    }

    // Zoom controls
    const zoomIn = this.container.querySelector('#btn-zoom-in');
    const zoomOut = this.container.querySelector('#btn-zoom-out');
    const zoomReset = this.container.querySelector('#btn-zoom-reset');
    const zoomText = this.container.querySelector('#zoom-level');
    const wrapper = this.container.querySelector('#sandbox-wrapper');

    const updateZoom = (val) => {
      this.canvasScale = Math.min(2.5, Math.max(0.4, val));
      if (wrapper) wrapper.style.transform = `scale(${this.canvasScale})`;
      if (zoomText) zoomText.textContent = `${Math.round(this.canvasScale * 100)}%`;
    };

    if (zoomIn) zoomIn.addEventListener('click', () => updateZoom(this.canvasScale + 0.15));
    if (zoomOut) zoomOut.addEventListener('click', () => updateZoom(this.canvasScale - 0.15));
    if (zoomReset) zoomReset.addEventListener('click', () => updateZoom(1.0));

    // Layout controls inputs listeners
    this.attachInspectorInputsListeners();
  }

  attachInspectorInputsListeners() {
    const comp = store.getActiveComponent();
    if (!comp) return;

    // Padding inputs
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const input = this.container.querySelector(`#pad-${side}`);
      if (input) {
        input.addEventListener('input', (e) => {
          const val = parseInt(e.target.value) || 0;
          const currentPadding = comp.styles?.padding || { top: 10, right: 18, bottom: 10, left: 18 };
          currentPadding[side] = val;
          store.updateLayoutStyles({ padding: currentPadding });
        });
      }
    });

    // Gap input
    const gapInput = this.container.querySelector('#input-gap');
    if (gapInput) {
      gapInput.addEventListener('input', (e) => {
        store.updateLayoutStyles({ gap: parseInt(e.target.value) || 0 });
      });
    }

    // Corner radius
    const radiusInput = this.container.querySelector('#input-radius');
    const radiusSlider = this.container.querySelector('#slider-radius');
    if (radiusInput && radiusSlider) {
      radiusInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 0;
        radiusSlider.value = val;
        store.updateLayoutStyles({ cornerRadius: val });
      });
      radiusSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 0;
        radiusInput.value = val;
        store.updateLayoutStyles({ cornerRadius: val });
      });
    }

    // Alignment buttons
    const alignBtns = this.container.querySelectorAll('.align-btn');
    alignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.getAttribute('data-align');
        store.updateLayoutStyles({ align });
        alignBtns.forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // Color inputs for active variant & state
    const currentVariant = comp.activeProps?.variant || 'primary';
    const currentState = store.activeState;

    const bgInput = this.container.querySelector('#input-bg-color');
    const bgPicker = this.container.querySelector('#picker-bg-color');
    if (bgInput && bgPicker) {
      const handleBgChange = (val) => {
        bgInput.value = val;
        bgPicker.value = val;
        store.updateVariantStyles(currentVariant, currentState, { bg: val });
      };
      bgInput.addEventListener('input', (e) => handleBgChange(e.target.value));
      bgPicker.addEventListener('input', (e) => handleBgChange(e.target.value));
    }

    const textInput = this.container.querySelector('#input-text-color');
    const textPicker = this.container.querySelector('#picker-text-color');
    if (textInput && textPicker) {
      const handleTextChange = (val) => {
        textInput.value = val;
        textPicker.value = val;
        store.updateVariantStyles(currentVariant, currentState, { text: val });
      };
      textInput.addEventListener('input', (e) => handleTextChange(e.target.value));
      textPicker.addEventListener('input', (e) => handleTextChange(e.target.value));
    }

    const borderInput = this.container.querySelector('#input-border-color');
    const borderPicker = this.container.querySelector('#picker-border-color');
    if (borderInput && borderPicker) {
      const handleBorderChange = (val) => {
        borderInput.value = val;
        borderPicker.value = val;
        store.updateVariantStyles(currentVariant, currentState, { border: val });
      };
      borderInput.addEventListener('input', (e) => handleBorderChange(e.target.value));
      borderPicker.addEventListener('input', (e) => handleBorderChange(e.target.value));
    }

    // Shadow preset select
    const shadowSelect = this.container.querySelector('#select-shadow');
    if (shadowSelect) {
      shadowSelect.addEventListener('change', (e) => {
        store.updateVariantStyles(currentVariant, currentState, { shadow: e.target.value });
      });
    }

    // Border width
    const bWidthInput = this.container.querySelector('#input-border-width');
    if (bWidthInput) {
      bWidthInput.addEventListener('input', (e) => {
        store.updateLayoutStyles({ borderWidth: parseInt(e.target.value) || 0 });
      });
    }
  }

  refreshInspectorInputs(comp) {
    const currentVariant = comp.activeProps?.variant || 'primary';
    const currentState = store.activeState;
    const styles = this.resolveActiveStyles(comp);

    const bgInput = this.container.querySelector('#input-bg-color');
    const bgPicker = this.container.querySelector('#picker-bg-color');
    if (bgInput && styles.bg) {
      bgInput.value = styles.bg;
      if (bgPicker && styles.bg.startsWith('#')) bgPicker.value = styles.bg;
    }

    const textInput = this.container.querySelector('#input-text-color');
    const textPicker = this.container.querySelector('#picker-text-color');
    if (textInput && styles.text) {
      textInput.value = styles.text;
      if (textPicker && styles.text.startsWith('#')) textPicker.value = styles.text;
    }

    const borderInput = this.container.querySelector('#input-border-color');
    const borderPicker = this.container.querySelector('#picker-border-color');
    if (borderInput && styles.border) {
      borderInput.value = styles.border;
      if (borderPicker && styles.border.startsWith('#')) borderPicker.value = styles.border;
    }

    const stateBadge = this.container.querySelector('.badge-state');
    if (stateBadge) {
      stateBadge.className = `badge-state state-badge-${currentState.toLowerCase()}`;
      stateBadge.textContent = `${currentState} State`;
    }
  }

  resolveActiveStyles(comp) {
    const variant = comp.activeProps?.variant || 'primary';
    const state = store.activeState;
    const size = comp.activeProps?.size || 'md';

    let variantStyles = comp.styles?.variants?.[variant]?.[state] ||
      comp.styles?.variants?.[variant]?.['Rest'] || {
        bg: '#3B82F6',
        text: '#FFFFFF',
        border: '#2563EB',
        shadow: 'none'
      };

    const sizeStyles = comp.styles?.sizes?.[size] || {
      padding: comp.styles?.padding || { top: 10, right: 18, bottom: 10, left: 18 },
      fontSize: 14,
      iconSize: 16,
      cornerRadius: comp.styles?.cornerRadius || 8
    };

    return {
      bg: variantStyles.bg,
      text: variantStyles.text,
      border: variantStyles.border,
      shadow: variantStyles.shadow,
      padding: sizeStyles.padding || comp.styles?.padding,
      gap: comp.styles?.gap ?? 8,
      align: comp.styles?.align || 'center',
      cornerRadius: sizeStyles.cornerRadius !== undefined ? sizeStyles.cornerRadius : (comp.styles?.cornerRadius ?? 8),
      borderWidth: comp.styles?.borderWidth ?? 1,
      fontSize: sizeStyles.fontSize || 14,
      iconSize: sizeStyles.iconSize || 16
    };
  }

  updateDimensions() {
    requestAnimationFrame(() => {
      const target = this.container.querySelector('.sandbox-rendered-component');
      const dimW = this.container.querySelector('#dim-w');
      const dimH = this.container.querySelector('#dim-h');
      if (target && dimW && dimH) {
        const rect = target.getBoundingClientRect();
        const w = Math.round(target.offsetWidth);
        const h = Math.round(target.offsetHeight);
        dimW.textContent = `${w} px`;
        dimH.textContent = `${h} px`;
      }
    });
  }

  renderLayoutControls(comp) {
    const styles = this.resolveActiveStyles(comp);
    const p = styles.padding || { top: 10, right: 18, bottom: 10, left: 18 };
    const currentVariant = comp.activeProps?.variant || 'primary';

    return `
      <!-- Spacing / Padding Section -->
      <div class="control-group-card">
        <div class="card-title-row">
          <label class="group-title">${ICON_SVGS.sliders} Padding (Auto Layout)</label>
          <span class="unit-label">px</span>
        </div>
        <div class="padding-grid">
          <div class="pad-input-box pad-top">
            <span class="pad-label">T</span>
            <input type="number" id="pad-top" value="${p.top}" min="0" max="80" />
          </div>
          <div class="pad-middle-row">
            <div class="pad-input-box pad-left">
              <span class="pad-label">L</span>
              <input type="number" id="pad-left" value="${p.left}" min="0" max="80" />
            </div>
            <div class="padding-center-visual">
              <span class="center-tag">BOX</span>
            </div>
            <div class="pad-input-box pad-right">
              <span class="pad-label">R</span>
              <input type="number" id="pad-right" value="${p.right}" min="0" max="80" />
            </div>
          </div>
          <div class="pad-input-box pad-bottom">
            <span class="pad-label">B</span>
            <input type="number" id="pad-bottom" value="${p.bottom}" min="0" max="80" />
          </div>
        </div>

        <div class="control-row mt-12">
          <label class="field-label">Child Item Gap</label>
          <div class="input-with-stepper">
            <input type="number" id="input-gap" value="${styles.gap}" min="0" max="48" />
            <span class="suffix">px</span>
          </div>
        </div>

        <div class="control-row mt-10">
          <label class="field-label">Alignment</label>
          <div class="align-pill-group">
            <button class="align-btn ${styles.align === 'start' ? 'active' : ''}" data-align="start" title="Align Start">Start</button>
            <button class="align-btn ${styles.align === 'center' ? 'active' : ''}" data-align="center" title="Align Center">Center</button>
            <button class="align-btn ${styles.align === 'end' ? 'active' : ''}" data-align="end" title="Align End">End</button>
            <button class="align-btn ${styles.align === 'stretch' ? 'active' : ''}" data-align="stretch" title="Align Stretch">Stretch</button>
          </div>
        </div>
      </div>

      <!-- Surface & Colors for Active State -->
      <div class="control-group-card">
        <div class="card-title-row">
          <label class="group-title">Colors & Surface (${store.activeState})</label>
          <span class="variant-tag">${currentVariant}</span>
        </div>

        <div class="color-control-item">
          <label class="field-label">Background</label>
          <div class="color-picker-input">
            <input type="color" id="picker-bg-color" value="${styles.bg?.startsWith('#') ? styles.bg : '#3B82F6'}" />
            <input type="text" id="input-bg-color" value="${styles.bg}" class="color-hex-text" />
          </div>
        </div>

        <div class="color-control-item mt-10">
          <label class="field-label">Foreground Text</label>
          <div class="color-picker-input">
            <input type="color" id="picker-text-color" value="${styles.text?.startsWith('#') ? styles.text : '#FFFFFF'}" />
            <input type="text" id="input-text-color" value="${styles.text}" class="color-hex-text" />
          </div>
        </div>

        <div class="color-control-item mt-10">
          <label class="field-label">Border Stroke</label>
          <div class="color-picker-input">
            <input type="color" id="picker-border-color" value="${styles.border?.startsWith('#') ? styles.border : '#2563EB'}" />
            <input type="text" id="input-border-color" value="${styles.border}" class="color-hex-text" />
          </div>
        </div>
      </div>

      <!-- Corners, Border & Elevation -->
      <div class="control-group-card">
        <label class="group-title">Corners & Shadows</label>

        <div class="control-row">
          <label class="field-label">Corner Radius</label>
          <div class="slider-with-number">
            <input type="range" id="slider-radius" min="0" max="40" value="${styles.cornerRadius > 40 ? 40 : styles.cornerRadius}" />
            <input type="number" id="input-radius" min="0" max="9999" value="${styles.cornerRadius}" class="number-compact" />
          </div>
        </div>

        <div class="control-row mt-10">
          <label class="field-label">Border Width</label>
          <div class="input-with-stepper">
            <input type="number" id="input-border-width" value="${styles.borderWidth}" min="0" max="10" />
            <span class="suffix">px</span>
          </div>
        </div>

        <div class="control-row mt-10">
          <label class="field-label">Shadow Preset</label>
          <select id="select-shadow" class="adsc-select">
            <option value="none" ${styles.shadow === 'none' ? 'selected' : ''}>None (Flat)</option>
            <option value="0 1px 2px rgba(0,0,0,0.05)" ${styles.shadow?.includes('0 1px 2px') ? 'selected' : ''}>Subtle Elevation 1</option>
            <option value="0 4px 6px -1px rgba(0,0,0,0.1)" ${styles.shadow?.includes('0 4px 6px') ? 'selected' : ''}>Medium Elevation 2</option>
            <option value="0 20px 25px -5px rgba(0,0,0,0.15)" ${styles.shadow?.includes('0 20px 25px') ? 'selected' : ''}>Deep Modal Elevation 3</option>
            <option value="0 0 0 3px rgba(59,130,246,0.3)" ${styles.shadow?.includes('rgba(59,130,246') ? 'selected' : ''}>Focus Ring Glow</option>
          </select>
        </div>
      </div>
    `;
  }

  generateComponentHTML(comp) {
    const styles = this.resolveActiveStyles(comp);
    const activeProps = comp.activeProps || {};
    const p = styles.padding;

    const baseInlineStyle = `
      background-color: ${styles.bg};
      color: ${styles.text};
      border: ${styles.borderWidth}px solid ${styles.border};
      border-radius: ${styles.cornerRadius >= 9999 ? '9999px' : styles.cornerRadius + 'px'};
      padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px;
      gap: ${styles.gap}px;
      box-shadow: ${styles.shadow};
      font-size: ${styles.fontSize}px;
    `;

    // 1. Button Render
    if (comp.id === 'button' || comp.id === 'compact-button') {
      const leftIconSvg = activeProps.hasLeftIcon 
        ? `<span class="adsc-elem-icon" style="display:flex;align-items:center;">${ICON_SVGS[activeProps.iconSwap] || ICON_SVGS.sparkles}</span>` 
        : '';
      const rightIconSvg = activeProps.hasRightIcon 
        ? `<span class="adsc-elem-icon" style="display:flex;align-items:center;">${ICON_SVGS['arrow-right']}</span>` 
        : '';
      const slotHtml = activeProps.slotChild 
        ? `<span class="adsc-slot-pill">${activeProps.slotChild}</span>` 
        : '';

      return `
        <button class="sandbox-rendered-component adsc-rendered-button" style="${baseInlineStyle}">
          ${leftIconSvg}
          <span class="adsc-elem-label" style="font-weight:600;">${activeProps.label || comp.name}</span>
          ${slotHtml}
          ${rightIconSvg}
        </button>
      `;
    }

    // 2. Chip / Filter Chip / Tag / Pill / Badge
    if (comp.id === 'filter-chip' || comp.id === 'chip' || comp.id === 'tag-pill' || comp.id === 'badge') {
      const isBadge = comp.id === 'badge';
      const leadingIcon = activeProps.hasLeftIcon || activeProps.hasLeadingIcon
        ? `<span class="adsc-elem-icon">${ICON_SVGS[activeProps.iconSwap] || ICON_SVGS.tag}</span>`
        : '';
      const trailingIcon = activeProps.hasRightIcon || activeProps.hasTrailingIcon
        ? `<span class="adsc-elem-icon adsc-chip-dismiss">${ICON_SVGS.x}</span>`
        : '';

      return `
        <div class="sandbox-rendered-component adsc-rendered-chip ${isBadge ? 'adsc-rendered-badge' : ''}" style="${baseInlineStyle}">
          ${leadingIcon}
          <span class="adsc-elem-label" style="font-weight:600; font-size:${isBadge ? '11px' : '13px'};">${activeProps.label || comp.name}</span>
          ${trailingIcon}
        </div>
      `;
    }

    // 3. Avatar
    if (comp.id === 'avatar') {
      return `
        <div class="sandbox-rendered-component" style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:50%; background-color:${styles.bg}; color:${styles.text}; font-weight:700; border:2px solid ${styles.border}; box-shadow:${styles.shadow}; position:relative;">
          <span>${activeProps.label || 'AJ'}</span>
          <span style="position:absolute; bottom:0; right:0; width:10px; height:10px; background-color:#10B981; border:2px solid #FFFFFF; border-radius:50%;"></span>
        </div>
      `;
    }

    // 4. Checkbox
    if (comp.id === 'checkbox') {
      return `
        <div class="sandbox-rendered-component" style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
          <div style="width:20px; height:20px; border-radius:4px; background-color:${styles.bg}; border:${styles.borderWidth}px solid ${styles.border}; display:flex; align-items:center; justify-content:center; color:${styles.text}; box-shadow:${styles.shadow};">
            ${ICON_SVGS.check}
          </div>
          <span style="font-size:14px; font-weight:500; color:var(--text-primary);">${activeProps.label || 'Remember me'}</span>
        </div>
      `;
    }

    // 5. Radio button
    if (comp.id === 'radio-button') {
      return `
        <div class="sandbox-rendered-component" style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
          <div style="width:20px; height:20px; border-radius:50%; background-color:${styles.bg}; border:${styles.borderWidth}px solid ${styles.border}; display:flex; align-items:center; justify-content:center; box-shadow:${styles.shadow};">
            <span style="width:8px; height:8px; border-radius:50%; background-color:${styles.text};"></span>
          </div>
          <span style="font-size:14px; font-weight:500; color:var(--text-primary);">${activeProps.label || 'Select option'}</span>
        </div>
      `;
    }

    // 6. Switch / Toggle
    if (comp.id === 'switch-toggle') {
      return `
        <div class="sandbox-rendered-component" style="display:inline-flex; align-items:center; gap:10px; cursor:pointer;">
          <div style="width:44px; height:24px; border-radius:9999px; background-color:${styles.bg}; border:${styles.borderWidth}px solid ${styles.border}; padding:2px; display:flex; align-items:center; justify-content:flex-end; box-shadow:${styles.shadow};">
            <div style="width:18px; height:18px; border-radius:50%; background-color:#FFFFFF; box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
          </div>
          <span style="font-size:14px; font-weight:500; color:var(--text-primary);">${activeProps.label || 'Toggle switch'}</span>
        </div>
      `;
    }

    // 7. Input field / Date input / Select
    if (comp.id === 'input-field' || comp.id === 'date-input' || comp.id === 'select' || comp.id === 'textarea') {
      const isTextarea = comp.id === 'textarea';
      const isSelect = comp.id === 'select';
      const iconKey = comp.id === 'date-input' ? 'calendar' : isSelect ? 'chevron-down' : 'edit';
      return `
        <div class="sandbox-rendered-component" style="display:flex; flex-direction:column; gap:6px; width:280px;">
          <label style="font-size:12px; font-weight:600; color:var(--text-secondary);">${comp.name}</label>
          <div style="${baseInlineStyle}; display:flex; align-items:center; justify-content:space-between; width:100%; min-height:${isTextarea ? '72px' : '38px'};">
            <span style="opacity:0.85; font-size:13px;">${activeProps.label || 'Enter value...'}</span>
            <span style="display:flex; opacity:0.6;">${ICON_SVGS[iconKey] || ICON_SVGS['edit']}</span>
          </div>
        </div>
      `;
    }

    // 8. Card, Board card, Confirmation card, Contact card
    if (comp.id.includes('card')) {
      return `
        <div class="sandbox-rendered-component" style="${baseInlineStyle}; width:320px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid ${styles.border}; padding-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:flex;">${ICON_SVGS[comp.icon] || ICON_SVGS.window}</span>
              <strong style="font-size:14px;">${activeProps.label || comp.name}</strong>
            </div>
            <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(0,0,0,0.06); font-weight:600;">ACTIVE</span>
          </div>
          <p style="font-size:12px; opacity:0.85; line-height:1.5;">${comp.description || 'Configured design card surface.'}</p>
          <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; padding-top:6px;">
            <button style="padding:4px 10px; border-radius:4px; border:1px solid ${styles.border}; background:none; font-size:12px; cursor:pointer;">Dismiss</button>
            <button style="padding:4px 12px; border-radius:4px; border:none; background:${styles.text}; color:${styles.bg}; font-size:12px; font-weight:600; cursor:pointer;">Confirm</button>
          </div>
        </div>
      `;
    }

    // 9. Accordion
    if (comp.id === 'accordion') {
      return `
        <div class="sandbox-rendered-component" style="${baseInlineStyle}; width:340px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; width:100%; cursor:pointer;">
            <span style="font-weight:600; font-size:14px;">${activeProps.label || 'Accordion Item'}</span>
            <span style="display:flex;">${ICON_SVGS['chevron-down']}</span>
          </div>
          <div style="border-top:1px solid ${styles.border}; padding-top:8px; font-size:12px; opacity:0.85; line-height:1.5;">
            Expandable section content displaying detailed design tokens and layer properties.
          </div>
        </div>
      `;
    }

    // 10. Tab
    if (comp.id === 'tab') {
      return `
        <div class="sandbox-rendered-component" style="display:flex; align-items:center; gap:4px; border-bottom:2px solid var(--border-subtle); padding:0 4px;">
          <div style="${baseInlineStyle}; border-bottom:2px solid ${styles.border}; border-radius:6px 6px 0 0; font-weight:600; cursor:pointer;">
            ${activeProps.label || 'Active Tab'}
          </div>
          <div style="padding:8px 14px; font-size:13px; color:var(--text-secondary); cursor:pointer;">Inactive Tab</div>
        </div>
      `;
    }

    // 11. Breadcrumb
    if (comp.id === 'breadcrumb') {
      return `
        <div class="sandbox-rendered-component" style="display:flex; align-items:center; gap:8px; font-size:13px;">
          <span style="color:var(--text-tertiary);">Home</span>
          <span style="opacity:0.4;">/</span>
          <span style="color:var(--text-tertiary);">Components</span>
          <span style="opacity:0.4;">/</span>
          <span style="${baseInlineStyle}; font-weight:600;">${activeProps.label || 'Breadcrumb'}</span>
        </div>
      `;
    }

    // 12. Tooltip
    if (comp.id === 'tooltip') {
      return `
        <div class="sandbox-rendered-component" style="position:relative; display:inline-flex; flex-direction:column; align-items:center;">
          <div style="${baseInlineStyle}; font-size:12px; font-weight:500;">
            ${activeProps.label || 'Tooltip message (Ctrl+S)'}
          </div>
          <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid ${styles.bg};"></div>
        </div>
      `;
    }

    // 13. Toast / Notification
    if (comp.id === 'toast-notification') {
      return `
        <div class="sandbox-rendered-component" style="${baseInlineStyle}; width:320px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="display:flex;">${ICON_SVGS.bell}</span>
            <span style="font-size:13px; font-weight:500;">${activeProps.label || 'Operation successful'}</span>
          </div>
          <span style="cursor:pointer; opacity:0.7;">${ICON_SVGS.x}</span>
        </div>
      `;
    }

    // 14. Dialog / Dialog modal / Modal / Drawer
    if (comp.id === 'dialog-modal' || comp.id === 'dialog' || comp.id === 'modal' || comp.id.includes('drawer')) {
      const modalWidth = comp.styles?.sizes?.[activeProps.size || 'md']?.width || 380;
      const showBackdrop = activeProps.showBackdrop !== false;
      const headerIcon = ICON_SVGS[activeProps.iconSwap] || ICON_SVGS['window'];

      return `
        <div class="sandbox-rendered-component adsc-modal-container ${showBackdrop ? 'with-backdrop' : ''}">
          <div class="adsc-rendered-modal" style="${baseInlineStyle} width: ${modalWidth}px; max-width: 100%;">
            <div class="adsc-modal-header">
              <div class="adsc-modal-header-left">
                <span class="modal-header-icon">${headerIcon}</span>
                <h4 class="modal-title-text">${activeProps.label || comp.name}</h4>
              </div>
              <button class="modal-close-btn">${ICON_SVGS.x}</button>
            </div>
            <div class="adsc-modal-body">
              <p class="modal-body-desc">${comp.description || 'Configured overlay component.'}</p>
            </div>
            <div class="adsc-modal-footer">
              <button class="modal-btn-cancel">Cancel</button>
              <button class="modal-btn-confirm primary">Confirm</button>
            </div>
          </div>
        </div>
      `;
    }

    // 15. Dropdown & Dropdown Menu
    if (comp.id.includes('dropdown') || comp.id.includes('context-menu') || comp.id.includes('menu')) {
      const triggerIcon = ICON_SVGS[activeProps.iconSwap] || ICON_SVGS['chevron-down'];

      return `
        <div class="sandbox-rendered-component adsc-dropdown-wrapper">
          <div class="adsc-dropdown-trigger" style="${baseInlineStyle}">
            <span class="adsc-elem-label">${activeProps.label || comp.name}</span>
            <span class="adsc-elem-icon">${triggerIcon}</span>
          </div>

          <div class="adsc-dropdown-floating-menu" style="border-radius:${styles.cornerRadius}px; border:1px solid ${styles.border}; box-shadow:${styles.shadow};">
            <div class="dropdown-item active">
              <span class="item-icon">${ICON_SVGS.check}</span>
              <span class="item-text">Active Option</span>
            </div>
            <div class="dropdown-item">
              <span class="item-icon">${ICON_SVGS.layers}</span>
              <span class="item-text">Secondary Action</span>
            </div>
          </div>
        </div>
      `;
    }

    // Default Fallback Container for all other components
    return `
      <div class="sandbox-rendered-component adsc-generic-box" style="${baseInlineStyle}; display:inline-flex; align-items:center; gap:8px;">
        <span style="display:flex;">${ICON_SVGS[comp.icon] || ICON_SVGS.layers}</span>
        <span class="adsc-elem-label" style="font-weight:600;">${activeProps.label || comp.name}</span>
      </div>
    `;
  }
}
