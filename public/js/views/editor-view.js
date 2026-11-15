// AI Design System Creator - Exact Reference Editor View (Images 1, 3, 5, 6, 7 References)
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient, getComponentSpecificVariants } from '../bridge-client.js';

export class EditorView {
  constructor(containerEl) {
    this.container = containerEl;
    this.anatomySubTab = 'json'; // 'json' | 'preview'
    this.codePanelOpen = true; // 3rd right column open by default; toggled via 'Code' tab
    this.figmaMenuOpen = false;
    this.selectedMatrixCell = {
      size: 'sm',
      state: 'Focus',
      variant: 'Primary',
      tone: 'Danger',
      disabled: false,
      showIcon: false
    };
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    store.subscribe('component:selected', () => this.render());
    store.subscribe('component:updated', () => this.render());
    store.subscribe('subTab:changed', () => this.render());
    store.subscribe('kindsTab:changed', () => this.render());
    store.subscribe('prop-schema:updated', () => this.render());
    store.subscribe('anatomy:updated', () => this.render());
  }

  render() {
    const comp = store.getActiveComponent();
    if (!comp) return;

    const propCount = comp.props?.length || 0;
    const anatomyCount = this.countAnatomyNodes(comp.anatomy);
    const compVariants = getComponentSpecificVariants(comp);
    const variantsCount = compVariants.length;

    this.container.innerHTML = `
      <div class="editor-stage-layout">
        <!-- Stage Top Title Row (Line 1) -->
        <div class="editor-stage-header">
          <div class="editor-title-row">
            <input type="text" id="component-name-input" class="component-name-pill" value="${comp.name}" placeholder="Component name" />
          </div>

          <div class="editor-stage-top-right">
            <button class="stage-ghost-btn ${store.isDraft(comp.id) ? 'active-draft' : ''}" id="btn-edit-draft">${store.isDraft(comp.id) ? '● In Drafts' : 'Edit as draft'}</button>
   <button class="stage-ghost-btn" id="btn-docs-link" title="Open Design System Documentation Site">Docs ↗</button>
          </div>
        </div>

        <!-- Sub-tabs Navigation Row (Line 2): Subtabs on Left, Figma/Code/Preview on Extreme Right (Requirement 11) -->
        <div class="editor-subtabs-row">
          <!-- Subtabs on Left: Preview first, then Properties, Anatomy, Variants (Requirement 21) -->
          <div class="subtabs-left">
            <button class="subtab-btn ${store.currentSubTab === 'preview' ? 'active' : ''}" data-subtab="preview">
              Preview
            </button>
            <button class="subtab-btn ${store.currentSubTab === 'props' ? 'active' : ''}" data-subtab="props">
              Properties (${propCount})
            </button>
            <button class="subtab-btn ${store.currentSubTab === 'anatomy' ? 'active' : ''}" data-subtab="anatomy">
              Anatomy (${anatomyCount})
            </button>
            <button class="subtab-btn ${store.currentSubTab === 'variants' ? 'active' : ''}" data-subtab="variants">
              Variants (${variantsCount})
            </button>
          </div>

          <!-- Extreme Right: Live Sync Status side by side: Code and Figma (Requirement 19 & 20) -->
          <div class="subtabs-extreme-right">
            <div class="sync-status-side-by-side">
              <button class="sync-status-pill code-sync ${this.codePanelOpen ? 'active' : ''}" id="btn-stage-code" title="Toggle Code JSON Contract schema">
                <span class="sync-dot code-ready">●</span>
                <span class="sync-text">Code: <strong>Ready</strong></span>
              </button>
              <button class="sync-status-pill figma-sync ${store.bridgeStatus.connected ? 'connected' : 'offline'} ${this.figmaMenuOpen ? 'active' : ''}" id="btn-stage-figma" title="Figma Desktop Live Sync Status (Click for push options)">
                <span class="sync-dot ${store.bridgeStatus.connected ? 'figma-online' : 'figma-offline'}">●</span>
                <span class="sync-text">Figma: <strong>${store.bridgeStatus.connected ? 'Connected' : 'Offline'}</strong></span>
                <span class="sync-chevron">▾</span>
              </button>
            </div>

            <!-- Anchored Figma Dropdown (Images 5 & 6) -->
            ${this.figmaMenuOpen ? `
              <div class="figma-anchored-dropdown" id="figma-dropdown-menu">
                <div class="figma-menu-item active-push" id="btn-menu-push-project-scope" style="background-color: #FAF5FF; border-left: 3px solid #9333EA; cursor: pointer;">
                  <span class="menu-main-label">⚡ Push All Project Scope (${store.includedComponentIds.size} components)</span>
                  <span class="menu-sub-label">Sync all ${store.includedComponentIds.size} selected components to Figma canvas</span>
                </div>
                <div class="figma-menu-item" id="btn-menu-push-figma" style="cursor: pointer;">
                  <span class="menu-main-label">⚡ Push Active Component Only ("${comp.name}")</span>
                </div>
                <div class="figma-menu-item" id="btn-menu-copy-figma-json" style="border-top: 1px solid #F1F5F9; cursor: pointer;">
                  <span class="menu-main-label">📋 Copy Figma Payload (JSON)</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Stage Body -->
        <div class="editor-stage-body">
          ${this.renderSubTabContent(comp)}
        </div>
      </div>
    `;

    this.attachListeners(comp);
  }


  // =========================================================
  // SUBTAB: PREVIEW VIEW (Requirement 21: Show Preview First)
  // =========================================================
  renderPreviewSubTab(comp) {
    const activeProps = comp.activeProps || {};
    const currentState = store.activeState || 'Rest';
    const compType = this.detectCompType(comp);
    const renderedHtml = this.generateLiveComponentPreviewHtml(comp, compType, currentState);
    const tokens = this.getTokensForComponent(comp, compType);

    return `
      <div class="editor-preview-subtab-layout">
        <!-- Center Stage Canvas -->
        <div class="preview-stage-center">
          <div class="preview-stage-header-bar">
            <div class="state-pills-cluster">
              <span class="cluster-label">State:</span>
              <div class="stage-states-segmented">
                ${['Rest', 'Hover', 'Focus', 'Press'].map(st => `
                  <button class="stage-state-pill ${currentState === st ? 'active' : ''}" data-state="${st}">
                    <span class="st-dot st-${st.toLowerCase()}"></span>
                    ${st}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="preview-stage-meta">
              <span class="badge-comp-type">${comp.category || 'Component'}</span>
              <span class="badge-comp-id">${comp.name}</span>
            </div>
          </div>

          <!-- Interactive Viewport Canvas -->
          <div class="preview-interactive-canvas">
            <div class="canvas-grid-dots"></div>
            <div class="rendered-component-mount-box">
              ${renderedHtml}
            </div>
          </div>

          <!-- Bottom Design Tokens Strip (Requirement 17: Tokens visible for each item) -->
          <div class="preview-tokens-footer">
            <div class="tokens-footer-header">
              <span class="tokens-sparkle">✦</span>
              <span class="tokens-footer-title">Active Design Tokens for <strong>${comp.name}</strong></span>
              <button class="btn-copy-tokens" id="btn-copy-active-tokens">📋 Copy CSS Tokens</button>
            </div>
            <div class="tokens-chips-scroll">
              ${tokens.map(t => `
                <div class="token-chip" title="${t.desc}">
                  <span class="token-name">${t.name}</span>
                  <span class="token-val" style="${t.color ? 'background:' + t.val + '; color: #fff; text-shadow:0 1px 2px rgba(0,0,0,0.4);' : ''}">${t.val}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right Props & Interactive Config Panel -->
        <aside class="preview-controls-aside">
          <div class="controls-aside-header">
            <h4>Live Props & Values</h4>
            <span class="controls-badge">Interactive</span>
          </div>

          <div class="controls-aside-body">
            <!-- Label prop -->
            <div class="control-field-group">
              <label class="control-label">Label Text</label>
              <input type="text" id="live-prop-label" class="control-input" value="${activeProps.label || comp.name}" />
            </div>

            <!-- Size prop -->
            <div class="control-field-group">
              <label class="control-label">Size</label>
              <div class="segmented-option-pills">
                ${['sm', 'md', 'lg'].map(sz => `
                  <button class="seg-pill ${(activeProps.size || 'md') === sz ? 'active' : ''}" data-prop="size" data-val="${sz}">${sz.toUpperCase()}</button>
                `).join('')}
              </div>
            </div>

            <!-- Component-specific toggles -->
            ${compType === 'checkbox' || compType === 'switch' || compType === 'radio' ? `
              <div class="control-field-group">
                <label class="control-label">${compType === 'radio' ? 'Selected' : 'Checked'} State</label>
                <label class="switch-toggle-label">
                  <input type="checkbox" id="live-prop-checked" ${activeProps.checked !== false ? 'checked' : ''} />
                  <span>${activeProps.checked !== false ? 'Active (Checked / Selected)' : 'Inactive (Unchecked)'}</span>
                </label>
              </div>
            ` : ''}

            ${compType === 'button' || compType === 'chip' ? `
              <div class="control-field-group">
                <label class="control-label">Variant</label>
                <select id="live-prop-variant" class="control-select">
                  <option value="primary" ${activeProps.variant === 'primary' ? 'selected' : ''}>Primary Brand</option>
                  <option value="secondary" ${activeProps.variant === 'secondary' ? 'selected' : ''}>Secondary</option>
                  <option value="outline" ${activeProps.variant === 'outline' ? 'selected' : ''}>Outline</option>
                  <option value="ghost" ${activeProps.variant === 'ghost' ? 'selected' : ''}>Ghost</option>
                  <option value="danger" ${activeProps.variant === 'danger' ? 'selected' : ''}>Danger</option>
                </select>
              </div>
            ` : ''}

            ${compType === 'input' ? `
              <div class="control-field-group">
                <label class="control-label">Validation State</label>
                <select id="live-prop-input-state" class="control-select">
                  <option value="Default" ${activeProps.state === 'Default' ? 'selected' : ''}>Default</option>
                  <option value="Focus" ${activeProps.state === 'Focus' ? 'selected' : ''}>Focus</option>
                  <option value="Filled" ${activeProps.state === 'Filled' ? 'selected' : ''}>Filled</option>
                  <option value="Error" ${activeProps.state === 'Error' ? 'selected' : ''}>Error</option>
                  <option value="Disabled" ${activeProps.state === 'Disabled' ? 'selected' : ''}>Disabled</option>
                </select>
              </div>
            ` : ''}

            <!-- Icon Toggle -->
            <div class="control-field-group">
              <label class="control-label">Show Leading Icon</label>
              <label class="switch-toggle-label">
                <input type="checkbox" id="live-prop-show-icon" ${activeProps.showIcon || activeProps.hasLeftIcon ? 'checked' : ''} />
                <span>${activeProps.showIcon || activeProps.hasLeftIcon ? 'Icon Visible' : 'No Icon'}</span>
              </label>
            </div>

            <!-- Disabled Toggle -->
            <div class="control-field-group">
              <label class="control-label">Disabled</label>
              <label class="switch-toggle-label">
                <input type="checkbox" id="live-prop-disabled" ${activeProps.disabled ? 'checked' : ''} />
                <span>${activeProps.disabled ? 'Disabled' : 'Enabled'}</span>
              </label>
            </div>

            <!-- Sync to Figma button inside preview -->
            <div class="preview-actions-block">
              <button class="adsc-btn btn-primary full-width" id="btn-push-active-from-preview">
                ⚡ Push "${comp.name}" to Figma
              </button>
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  detectCompType(comp) {
    const id = (comp.id || '').toLowerCase();
    const name = (comp.name || '').toLowerCase();
    if (id.includes('checkbox') || name.includes('checkbox')) return 'checkbox';
    if (id.includes('switch') || id.includes('toggle') || name.includes('switch')) return 'switch';
    if (id.includes('radio') || name.includes('radio')) return 'radio';
    if (id.includes('input') || id.includes('textarea') || name.includes('input')) return 'input';
    if (id.includes('modal') || id.includes('dialog') || name.includes('modal')) return 'modal';
    if (id.includes('table') || name.includes('table')) return 'table';
    if (id.includes('avatar') || name.includes('avatar')) return 'avatar';
    if (id.includes('badge') || name.includes('badge')) return 'badge';
    if (id.includes('tab') || name.includes('tab')) return 'tab';
    if (id.includes('toast') || id.includes('notification')) return 'toast';
    if (id.includes('card') || name.includes('card')) return 'card';
    if (id.includes('chip') || name.includes('chip')) return 'chip';
    if (id.includes('dropdown') || id.includes('select') || id.includes('menu')) return 'dropdown';
    return 'button';
  }

  generateLiveComponentPreviewHtml(comp, compType, state) {
    const p = comp.activeProps || {};
    const label = p.label || comp.name;
    const isHover = state === 'Hover';
    const isFocus = state === 'Focus';
    const isPress = state === 'Press';
    const isDisabled = p.disabled || state === 'Disabled';

    if (compType === 'checkbox') {
      const isChecked = p.checked !== false;
      return `
        <div class="live-comp-checkbox" style="display:inline-flex; align-items:center; gap:10px; cursor:pointer;">
          <div style="width:22px; height:22px; border-radius:5px; background:${isChecked ? (isHover ? '#9A3412' : '#C2410C') : '#FFFFFF'}; border:1.5px solid ${isChecked ? (isHover ? '#9A3412' : '#C2410C') : (isHover ? '#9CA3AF' : '#D1D5DB')}; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:${isFocus ? '0 0 0 3px rgba(194,65,12,0.25)' : 'none'};">
            ${isChecked ? '✓' : ''}
          </div>
          <span style="font-size:15px; font-weight:500; color:${isDisabled ? '#9CA3AF' : '#1F2937'};">${label}</span>
        </div>
      `;
    }

    if (compType === 'switch') {
      const isChecked = p.checked !== false;
      return `
        <div class="live-comp-switch" style="display:inline-flex; align-items:center; gap:12px; cursor:pointer;">
          <div style="width:48px; height:26px; border-radius:999px; background:${isChecked ? (isHover ? '#9A3412' : '#C2410C') : '#D1D5DB'}; padding:2px; display:flex; align-items:center; justify-content:${isChecked ? 'flex-end' : 'flex-start'}; box-shadow:${isFocus ? '0 0 0 3px rgba(194,65,12,0.25)' : 'none'}; transition:all 0.2s;">
            <div style="width:22px; height:22px; border-radius:50%; background:#FFFFFF; box-shadow:0 1px 3px rgba(0,0,0,0.25);"></div>
          </div>
          <span style="font-size:15px; font-weight:500; color:${isDisabled ? '#9CA3AF' : '#1F2937'};">${label}</span>
        </div>
      `;
    }

    if (compType === 'radio') {
      const isSelected = p.checked !== false;
      return `
        <div class="live-comp-radio" style="display:inline-flex; align-items:center; gap:10px; cursor:pointer;">
          <div style="width:22px; height:22px; border-radius:50%; background:#FFFFFF; border:2px solid ${isSelected ? (isHover ? '#9A3412' : '#C2410C') : (isHover ? '#9CA3AF' : '#D1D5DB')}; display:flex; align-items:center; justify-content:center; box-shadow:${isFocus ? '0 0 0 3px rgba(194,65,12,0.25)' : 'none'};">
            ${isSelected ? '<div style="width:10px; height:10px; border-radius:50%; background:#C2410C;"></div>' : ''}
          </div>
          <span style="font-size:15px; font-weight:500; color:${isDisabled ? '#9CA3AF' : '#1F2937'};">${label}</span>
        </div>
      `;
    }

    if (compType === 'input') {
      return `
        <div class="live-comp-input" style="display:flex; flex-direction:column; gap:6px; width:280px;">
          <label style="font-size:12px; font-weight:600; color:#4B5563;">${label}</label>
          <div style="display:flex; align-items:center; justify-content:space-between; padding:9px 14px; border-radius:6px; background:#FFFFFF; border:1px solid ${isFocus ? '#C2410C' : '#D1D5DB'}; box-shadow:${isFocus ? '0 0 0 3px rgba(194,65,12,0.2)' : 'none'};">
            <span style="color:#6B7280; font-size:14px;">Enter value...</span>
            <span style="opacity:0.6;">✎</span>
          </div>
        </div>
      `;
    }

    if (compType === 'modal') {
      return `
        <div class="live-comp-modal" style="width:320px; border-radius:12px; background:#FFFFFF; border:1px solid #E5E7EB; box-shadow:0 20px 25px -5px rgba(0,0,0,0.15); padding:18px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <strong style="font-size:16px; color:#111827;">${label}</strong>
            <span style="cursor:pointer; opacity:0.6;">✕</span>
          </div>
          <p style="font-size:13px; color:#6B7280; line-height:1.5;">${comp.description || 'Dialog modal with confirm and cancel workflows.'}</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; padding-top:6px;">
            <button style="padding:6px 12px; border-radius:6px; border:1px solid #D1D5DB; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
            <button style="padding:6px 16px; border-radius:6px; border:none; background:#C2410C; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Confirm</button>
          </div>
        </div>
      `;
    }

    if (compType === 'table') {
      return `
        <div class="live-comp-table" style="width:340px; border-radius:8px; border:1px solid #E5E7EB; overflow:hidden; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.04);">
          <div style="display:flex; background:#F9FAFB; padding:8px 14px; font-size:12px; font-weight:600; color:#4B5563; border-bottom:1px solid #E5E7EB;">
            <div style="flex:1;">Name</div>
            <div style="flex:1;">Role</div>
            <div style="flex:1; text-align:right;">Status</div>
          </div>
          <div style="display:flex; padding:10px 14px; font-size:13px; color:#1F2937; border-bottom:1px solid #F3F4F6;">
            <div style="flex:1; font-weight:500;">Design Token</div>
            <div style="flex:1; color:#6B7280;">Foundation</div>
            <div style="flex:1; text-align:right; color:#15803D;">Active</div>
          </div>
          <div style="display:flex; padding:10px 14px; font-size:13px; color:#1F2937;">
            <div style="flex:1; font-weight:500;">Component</div>
            <div style="flex:1; color:#6B7280;">Contract</div>
            <div style="flex:1; text-align:right; color:#15803D;">Active</div>
          </div>
        </div>
      `;
    }

    if (compType === 'avatar') {
      return `
        <div class="live-comp-avatar" style="position:relative; width:48px; height:48px; border-radius:50%; background:#C2410C; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
          AJ
          <span style="position:absolute; bottom:0; right:0; width:12px; height:12px; border-radius:50%; background:#10B981; border:2px solid #fff;"></span>
        </div>
      `;
    }

    if (compType === 'badge') {
      return `
        <span class="live-comp-badge" style="display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; background:#FFEDD5; color:#9A3412; border:1px solid #FDBA74; font-weight:600; font-size:12px;">
          ${label}
        </span>
      `;
    }

    if (compType === 'tab') {
      return `
        <div class="live-comp-tab" style="display:flex; gap:16px; border-bottom:2px solid #E5E7EB; padding-bottom:2px;">
          <div style="padding:8px 4px; font-weight:600; color:#C2410C; border-bottom:2px solid #C2410C; cursor:pointer;">${label}</div>
          <div style="padding:8px 4px; font-weight:500; color:#6B7280; cursor:pointer;">Inactive Tab</div>
        </div>
      `;
    }

    if (compType === 'toast') {
      return `
        <div class="live-comp-toast" style="display:flex; align-items:center; justify-content:space-between; gap:12px; width:300px; padding:10px 14px; border-radius:8px; background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; box-shadow:0 4px 6px rgba(0,0,0,0.06);">
          <span>ℹ ${label}</span>
          <span style="cursor:pointer; opacity:0.7;">✕</span>
        </div>
      `;
    }

    // Default button / chip
    const bg = p.variant === 'secondary' ? (isHover ? '#E5E7EB' : '#F3F4F6') : (isHover ? '#9A3412' : '#C2410C');
    const color = p.variant === 'secondary' ? '#1F2937' : '#FFFFFF';
    const border = p.variant === 'secondary' ? '#E5E7EB' : (isHover ? '#9A3412' : '#C2410C');
    const shadow = isFocus ? '0 0 0 3px rgba(194,65,12,0.35)' : (isPress ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none');

    return `
      <button class="live-comp-button" style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; background:${bg}; color:${color}; border:1px solid ${border}; box-shadow:${shadow}; font-size:14px; font-weight:600; cursor:pointer;">
        ${p.showIcon || p.hasLeftIcon ? '<span>✦</span>' : ''}
        <span>${label}</span>
      </button>
    `;
  }

  getTokensForComponent(comp, compType) {
    return [
      { name: '--color-surface', val: compType === 'button' ? '#C2410C' : '#FFFFFF', color: true, desc: 'Background token' },
      { name: '--color-text', val: compType === 'button' ? '#FFFFFF' : '#1F2937', color: true, desc: 'Foreground text token' },
      { name: '--color-border', val: '#D1D5DB', color: true, desc: 'Border token' },
      { name: '--radius-component', val: compType === 'chip' ? '999px' : '8px', desc: 'Corner radius token' },
      { name: '--spacing-padding-y', val: '8px', desc: 'Vertical padding token' },
      { name: '--spacing-padding-x', val: '14px', desc: 'Horizontal padding token' },
      { name: '--font-size-base', val: '14px', desc: 'Typography font size' }
    ];
  }

  countAnatomyNodes(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      node.children.forEach(c => { count += this.countAnatomyNodes(c); });
    }
    return count;
  }

  renderSubTabContent(comp) {
    if (store.currentSubTab === 'preview') {
      return this.renderPreviewSubTab(comp);
    } else if (store.currentSubTab === 'props') {
      return this.renderPropsView(comp);
    } else if (store.currentSubTab === 'anatomy') {
      return this.renderAnatomyView(comp);
    } else if (store.currentSubTab === 'variants') {
      return this.renderVariantsView(comp);
    }
    return this.renderPreviewSubTab(comp);
  }

  // =========================================================
  // SUBTAB 1: PROPS VIEW (Image 1 Reference)
  // =========================================================
  renderPropsView(comp) {
    const jsonContract = this.generateComponentContract(comp);

    return `
      <div class="props-editor-split ${this.codePanelOpen ? 'has-code-column' : 'full-canvas-mode'}">
        <!-- Col 1: Kinds Drawer -->
        <aside class="kinds-drawer-panel">
          <div class="kinds-toggle-pill-row">
            <button class="kinds-tab-btn ${store.kindsTab === 'kinds' ? 'active' : ''}" data-kindstab="kinds">Kinds</button>
            <button class="kinds-tab-btn ${store.kindsTab === 'library' ? 'active' : ''}" data-kindstab="library">Library</button>
          </div>

          ${store.kindsTab === 'kinds' ? `
            <div class="kinds-sections-scroll">
              <!-- Figma and code -->
              <div class="kinds-section">
                <span class="kinds-section-title">Figma and code</span>
                <div class="kinds-grid-2col">
                  <button class="kind-tile-btn" data-kind="options" title="Add Options Prop">
                    <span class="kind-icon">≡</span>
                    <span class="kind-label">Options</span>
                  </button>
                  <button class="kind-tile-btn" data-kind="on_off" title="Add On / Off Prop">
                    <span class="kind-icon">◐</span>
                    <span class="kind-label">On / off</span>
                  </button>
                  <button class="kind-tile-btn" data-kind="text" title="Add Text Prop">
                    <span class="kind-icon">↔</span>
                    <span class="kind-label">Text</span>
                  </button>
                  <button class="kind-tile-btn" data-kind="swap" title="Add Swap Prop">
                    <span class="kind-icon">↺</span>
                    <span class="kind-label">Swap</span>
                  </button>
                  <button class="kind-tile-btn" data-kind="slot" title="Add Slot Prop">
                    <span class="kind-icon">□</span>
                    <span class="kind-label">Slot</span>
                  </button>
                </div>
              </div>

              <!-- Code only -->
              <div class="kinds-section">
                <span class="kinds-section-title">Code only</span>
                <div class="kinds-grid-2col">
                  <button class="kind-tile-btn" data-kind="number" title="Add Number Prop">
                    <span class="kind-icon">#</span>
                    <span class="kind-label">Number</span>
                  </button>
                  <button class="kind-tile-btn" data-kind="event" title="Add Event Prop">
                    <span class="kind-icon">⚡</span>
                    <span class="kind-label">Event</span>
                  </button>
                </div>
              </div>

              <!-- Figma only -->
              <div class="kinds-section">
                <span class="kinds-section-title">Figma only</span>
                <div class="kinds-grid-2col">
                  <button class="kind-tile-btn" data-kind="state" title="Add Interaction State Prop">
                    <span class="kind-icon">✦</span>
                    <span class="kind-label">Interaction states</span>
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <!-- Library / Tokens Shortcut Drawer -->
            <div class="kinds-sections-scroll library-drawer-content">
              <div class="kinds-section">
                <span class="kinds-section-title">Foundation & Tokens</span>
                <p class="library-drawer-desc">Brand colors, tonal swatches, and guidelines</p>
                <button class="adsc-btn btn-primary full-width" id="btn-open-tokens-studio" style="margin-top: 12px;">
                  ✦ Open Foundation Studio
                </button>
              </div>
            </div>
          `}
        </aside>

        <!-- Col 2: Props Canvas (Covers Max Area) -->
        <main class="props-canvas-area">
          <div class="props-cards-stack">
            ${this.renderPropCards(comp)}
          </div>

          <!-- Often added quick suggestions -->
          <div class="often-added-section">
            <span class="often-added-title">Often added</span>
            <div class="often-added-pills">
              <button class="often-pill-btn" data-add-prop="Disabled">+ Disabled</button>
              <button class="often-pill-btn" data-add-prop="State">+ State</button>
              <button class="often-pill-btn" data-add-prop="Selected">+ Selected</button>
            </div>
          </div>
        </main>

        <!-- Col 3: Live JSON Contract Column (When Code is active) -->
        ${this.codePanelOpen ? `
          <aside class="anatomy-json-panel props-code-panel">
            <div class="json-panel-header">
              <div class="json-subtabs-pill">
                <button class="json-tab-btn active">JSON Contract</button>
              </div>

              <div class="json-action-buttons">
                <button class="adsc-btn btn-secondary compact" id="btn-copy-contract-json">Copy JSON</button>
                <button class="adsc-btn btn-primary compact" id="btn-download-contract-json">Download</button>
                <button class="close-code-panel-btn" id="btn-close-code-col" title="Close Code Column">✕</button>
              </div>
            </div>

            <div class="json-panel-body">
              <pre class="json-code-viewer" id="json-code-viewer"><code>${this.escapeHtml(JSON.stringify(jsonContract, null, 2))}</code></pre>
            </div>
          </aside>
        ` : ''}
      </div>
    `;
  }

  renderPropCards(comp) {
    if (!comp.props || comp.props.length === 0) {
      return '<div class="empty-hint">No properties configured yet. Click a Kind on the left to add one.</div>';
    }

    return comp.props.map((p) => {
      const isIndented = p.id === 'icon' || p.id === 'iconSwap' || p.isIndented;
      const iconGlyph = this.getPropKindGlyph(p.kind);
      const displayVal = this.formatPropDisplayValue(p, comp.activeProps);

      return `
        <div class="prop-card-row ${isIndented ? 'is-indented' : ''} ${p.kind === 'state' ? 'state-card' : ''}" 
             data-prop-id="${p.id}" title="Click to edit property in popup">
          ${isIndented ? '<span class="indent-branch-connector"></span>' : ''}
          <div class="prop-card-left">
            <span class="drag-handle-dots" title="Drag to reorder">⠿</span>
            <span class="prop-kind-symbol">${iconGlyph}</span>
            <span class="prop-card-name">${p.name}</span>
          </div>

          <div class="prop-card-mid">
            <span class="prop-kind-type">${this.formatKindLabel(p.kind)}</span>
            <span class="prop-card-val">${displayVal}</span>
            <span class="prop-token-pill" title="Bound Design System Token">
              <span class="token-sparkle">✦</span>
              <span>${this.getPropTokenString(p, comp)}</span>
            </span>
          </div>

          <div class="prop-card-right">
            <button class="card-icon-btn btn-figma-bind" title="Link to Figma variable / token">
              <span>⧉</span>
            </button>
            ${p.kind !== 'state' ? `
              <button class="card-icon-btn btn-code-bind" title="Inspect JSX prop binding">
                <span>&lt;/&gt;</span>
              </button>
            ` : ''}
            <button class="card-icon-btn btn-prop-menu" title="Configure in popup" data-prop-id="${p.id}">
              <span>⋯</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  getPropKindGlyph(kind) {
    switch (kind) {
      case 'on_off': return '◐';
      case 'swap': return '↺';
      case 'text': return '↔';
      case 'options': return '≡';
      case 'slot': return '□';
      case 'number': return '#';
      case 'event': return '⚡';
      case 'state': return '✦';
      default: return '●';
    }
  }

  formatKindLabel(kind) {
    switch (kind) {
      case 'on_off': return 'On / off';
      case 'swap': return 'Swap';
      case 'text': return 'Text';
      case 'options': return 'Options';
      case 'slot': return 'Slot';
      case 'number': return 'Number';
      case 'event': return 'Event';
      case 'state': return 'Interaction st...';
      default: return kind;
    }
  }

  formatPropDisplayValue(p, activeProps) {
    const val = activeProps && activeProps[p.id] !== undefined ? activeProps[p.id] : p.defaultValue;
    if (p.kind === 'state') {
      return 'Rest (default), Focus, Hover, Press';
    }
    if (p.kind === 'text') {
      return `"${val || ''}"`;
    }
    if (p.kind === 'on_off') {
      return val ? 'true' : 'false';
    }
    if (p.kind === 'swap') {
      return val || 'circle-alert';
    }
    if (p.kind === 'options') {
      return p.options ? p.options.slice(0, 3).join(', ') : (val || '');
    }
    return String(val !== undefined ? val : '');
  }

  getPropTokenString(p, comp) {
    if (p.id === 'state' || p.kind === 'state') return 'token: states/4-mode';
    if (p.id === 'showIcon' || p.name === 'Show icon') return 'token: bool/show-icon';
    if (p.id === 'icon' || p.name === 'Icon') return 'token: icon/circle-alert';
    if (p.id === 'label' || p.name === 'Label') return 'token: typography/label-md';
    if (p.id === 'variant') return 'token: color/variant-primary';
    if (p.id === 'size') return 'token: size/control-scale';
    return `token: ${p.id}`;
  }

  // =========================================================
  // SUBTAB 2: ANATOMY VIEW (Middle Column Covers Max Area - Requirement 8)
  // =========================================================
  renderAnatomyView(comp) {
    const jsonContract = this.generateComponentContract(comp);

    return `
      <div class="anatomy-view-3col-layout ${this.codePanelOpen ? 'has-code-column' : 'full-canvas-mode'}">
        <!-- Col 1: Add a part -->
        <aside class="anatomy-add-part-panel">
          <span class="add-part-title">Add a part</span>
          <div class="add-parts-grid">
            <button class="add-part-tile" data-part="container" title="Add Container">
              <span class="part-icon">◫</span>
              <span class="part-name">Container</span>
            </button>
            <button class="add-part-tile" data-part="text" title="Add Text">
              <span class="part-icon">T</span>
              <span class="part-name">Text</span>
            </button>
            <button class="add-part-tile" data-part="instance" title="Add Instance">
              <span class="part-icon">❖</span>
              <span class="part-name">Instance</span>
            </button>
            <button class="add-part-tile" data-part="slot" title="Add Slot">
              <span class="part-icon">□</span>
              <span class="part-name">Slot</span>
            </button>
            <button class="add-part-tile" data-part="shape" title="Add Shape">
              <span class="part-icon">%</span>
              <span class="part-name">Shape</span>
            </button>
          </div>
        </aside>

        <!-- Col 2: Anatomy Tree (COVERS MAX AREA - Requirement 8) -->
        <main class="anatomy-tree-panel">
          <div class="anatomy-tree-stack">
            <!-- Root node: Outer box -->
            <div class="anatomy-card-row root-node">
              <div class="card-left">
                <span class="node-chevron">◫</span>
                <span class="node-title">${comp.anatomy?.name || 'Outer box'}</span>
              </div>
              <div class="card-mid">
                <span class="node-type">${comp.anatomy?.type || 'Container'}</span>
                <span class="anatomy-token-tag" title="Layout tokens">
                  <span class="token-sparkle">✦</span>
                  <span>Tokens: Spacing/4 (4px) • Padding: 8px, 12px • Corner: 999</span>
                </span>
              </div>
              <div class="card-right">
                <span class="node-menu-dots">⋯</span>
              </div>
            </div>

            <!-- Child 1: Icon (Instance) -->
            <div class="anatomy-card-row child-node is-indented">
              <span class="indent-branch-connector"></span>
              <div class="card-left">
                <span class="drag-handle-dots">⠿</span>
                <span class="node-symbol">❖</span>
                <span class="node-title">Icon</span>
              </div>
              <div class="card-mid">
                <span class="node-type">Instance</span>
                <span class="anatomy-token-tag" title="Instance token">
                  <span class="token-sparkle">✦</span>
                  <span>Token: icon/circle-alert</span>
                </span>
              </div>
              <div class="card-right">
                <span class="node-menu-dots">⋯</span>
              </div>
            </div>

            <!-- Child 2: Label (Text) -->
            <div class="anatomy-card-row child-node is-indented">
              <span class="indent-branch-connector"></span>
              <div class="card-left">
                <span class="drag-handle-dots">⠿</span>
                <span class="node-symbol">T</span>
                <span class="node-title">Label</span>
              </div>
              <div class="card-mid">
                <span class="node-type">Text</span>
                <span class="anatomy-token-tag" title="Typography token">
                  <span class="token-sparkle">✦</span>
                  <span>Token: typography/label-md (14px)</span>
                </span>
              </div>
              <div class="card-right">
                <span class="node-menu-dots">⋯</span>
              </div>
            </div>
          </div>
        </main>

        <!-- Col 3: Live JSON Contract Column (Opens on Code Tab - Requirement 9) -->
        ${this.codePanelOpen ? `
          <aside class="anatomy-json-panel">
            <div class="json-panel-header">
              <div class="json-subtabs-pill">
                <button class="json-tab-btn active">JSON</button>
                
              </div>

              <div class="json-action-buttons">
                <button class="adsc-btn btn-secondary compact" id="btn-copy-contract-json">Copy JSON</button>
                <button class="adsc-btn btn-primary compact" id="btn-download-contract-json">Download</button>
                <button class="close-code-panel-btn" id="btn-close-anatomy-code" title="Close Code Column">✕</button>
              </div>
            </div>

            <div class="json-panel-body">
              <pre class="json-code-viewer" id="json-code-viewer"><code>${this.escapeHtml(JSON.stringify(jsonContract, null, 2))}</code></pre>
            </div>
          </aside>
        ` : ''}
      </div>
    `;
  }

  generateComponentContract(comp) {
    const propsContract = {};
    if (comp.props) {
      comp.props.forEach(p => {
        const keyName = p.name ? p.name.toLowerCase() : p.id;
        if (p.id === 'showIcon' || p.kind === 'on_off' || keyName === 'show icon') {
          propsContract["show icon"] = {
            type: "boolean",
            default: p.defaultValue ?? false,
            figma: "Show icon",
            shows: ["Icon"]
          };
        } else if (p.id === 'icon' || p.kind === 'swap' || keyName === 'icon') {
          propsContract["icon"] = {
            type: "instance",
            default: p.defaultValue || "icon/circle-alert",
            figma: "Icon",
            swaps: ["Icon"]
          };
        } else if (p.id === 'label' || p.kind === 'text' || keyName === 'label') {
          propsContract["label"] = {
            type: "string",
            default: p.defaultValue || "Label",
            figma: "Label",
            texts: ["label"]
          };
        } else if (p.id === 'state' || p.kind === 'state' || keyName.includes('state')) {
          propsContract["state"] = {
            type: "enum",
            values: ["rest", "focus", "hover", "press"],
            default: "rest",
            figmaValues: ["Rest", "Focus", "Hover", "Press"],
            variants: "Interaction",
            pointer: ["focus", "hover"]
          };
        } else {
          propsContract[keyName] = {
            type: p.kind,
            default: p.defaultValue,
            figma: p.name
          };
        }
      });
    }

    return {
      contract: 1,
      component: comp.name,
      props: propsContract
    };
  }

  // =========================================================
  // SUBTAB: VARIANTS VIEW (Requirement 21: Related to that component only)
  renderVariantsView(comp) {
    const variants = getComponentSpecificVariants(comp);
    const compType = this.detectCompType(comp);

    return `
      <div class="variants-component-specific-layout">
        <div class="variants-header-bar">
          <div class="variants-title-block">
            <h3>${comp.name} Variants Matrix (${variants.length} defined)</h3>
            <p>Every variant matches ${comp.name} properties, states and anatomy.</p>
          </div>
          <button class="adsc-btn btn-primary" id="btn-push-all-variants-figma">
            ⚡ Push All ${variants.length} Variants to Figma
          </button>
        </div>

        <div class="variants-grid-cards">
          ${variants.map((v, i) => {
            const previewCell = this.generateLiveComponentPreviewHtml(
              { ...comp, activeProps: { ...comp.activeProps, ...v.properties } },
              compType,
              v.properties?.state || 'Rest'
            );
            return `
              <div class="variant-matrix-card">
                <div class="card-top-header">
                  <span class="variant-num">#${i + 1}</span>
                  <span class="variant-name-title">${v.name}</span>
                </div>
                <div class="card-rendered-preview">
                  ${previewCell}
                </div>
                <div class="card-props-chips">
                  ${Object.entries(v.properties || {}).filter(([k]) => k !== 'compType' && !k.startsWith('_')).map(([k, val]) => `
                    <span class="v-prop-chip"><strong>${k}:</strong> ${val}</span>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================
  // LISTENERS & INTERACTIONS
  // =========================================================
  attachListeners(comp) {

    // Edit as Draft toggle (Requirement 24)
    const editDraftBtn = this.container.querySelector('#btn-edit-draft');
    if (editDraftBtn) {
      editDraftBtn.addEventListener('click', () => {
        if (store.isDraft(comp.id)) {
          store.removeDraft(comp.id);
          bridgeClient.notifyUser(`Removed "${comp.name}" from drafts`, 'info');
        } else {
          store.addDraft(comp);
          bridgeClient.notifyUser(`Added "${comp.name}" to unpublished drafts`, 'success');
        }
        this.render();
      });
    }

    // Docs link navigation (Requirement 25)
    const docsLinkBtn = this.container.querySelector('#btn-docs-link');
    if (docsLinkBtn) {
      docsLinkBtn.addEventListener('click', () => {
        store.setView('docs');
      });
    }

    // Interactive State Pills in Preview Subtab
    const statePills = this.container.querySelectorAll('.stage-state-pill');
    statePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const st = pill.getAttribute('data-state');
        store.setActiveState(st);
        this.render();
      });
    });

    // Live Prop Controls in Preview Subtab
    const liveLabelInput = this.container.querySelector('#live-prop-label');
    if (liveLabelInput) {
      liveLabelInput.addEventListener('input', (e) => {
        store.updateActiveProp('label', e.target.value);
      });
    }

    const liveSizePills = this.container.querySelectorAll('.segmented-option-pills .seg-pill');
    liveSizePills.forEach(btn => {
      btn.addEventListener('click', () => {
        const sz = btn.getAttribute('data-val');
        store.updateActiveProp('size', sz);
        this.render();
      });
    });

    const liveCheckedInput = this.container.querySelector('#live-prop-checked');
    if (liveCheckedInput) {
      liveCheckedInput.addEventListener('change', (e) => {
        store.updateActiveProp('checked', e.target.checked);
        this.render();
      });
    }

    const liveVariantSelect = this.container.querySelector('#live-prop-variant');
    if (liveVariantSelect) {
      liveVariantSelect.addEventListener('change', (e) => {
        store.updateActiveProp('variant', e.target.value);
        this.render();
      });
    }

    const liveInputState = this.container.querySelector('#live-prop-input-state');
    if (liveInputState) {
      liveInputState.addEventListener('change', (e) => {
        store.updateActiveProp('state', e.target.value);
        this.render();
      });
    }

    const liveIconInput = this.container.querySelector('#live-prop-show-icon');
    if (liveIconInput) {
      liveIconInput.addEventListener('change', (e) => {
        store.updateActiveProp('showIcon', e.target.checked);
        store.updateActiveProp('hasLeftIcon', e.target.checked);
        this.render();
      });
    }

    const liveDisabledInput = this.container.querySelector('#live-prop-disabled');
    if (liveDisabledInput) {
      liveDisabledInput.addEventListener('change', (e) => {
        store.updateActiveProp('disabled', e.target.checked);
        this.render();
      });
    }

    const pushFromPreviewBtn = this.container.querySelector('#btn-push-active-from-preview');
    if (pushFromPreviewBtn) {
      pushFromPreviewBtn.addEventListener('click', async () => {
        await bridgeClient.pushComponent(comp);
      });
    }

    const pushAllVariantsBtn = this.container.querySelector('#btn-push-all-variants-figma');
    if (pushAllVariantsBtn) {
      pushAllVariantsBtn.addEventListener('click', async () => {
        await bridgeClient.pushComponent(comp);
      });
    }

    const copyTokensBtn = this.container.querySelector('#btn-copy-active-tokens');
    if (copyTokensBtn) {
      copyTokensBtn.addEventListener('click', () => {
        const compType = this.detectCompType(comp);
        const tokens = this.getTokensForComponent(comp, compType);
        const cssStr = tokens.map(t => `  ${t.name}: ${t.val}; /* ${t.desc} */`).join('\n');
        navigator.clipboard.writeText(`:root {\n${cssStr}\n}`).then(() => {
          copyTokensBtn.textContent = '✓ Copied CSS!';
          setTimeout(() => { copyTokensBtn.textContent = '📋 Copy CSS Tokens'; }, 1800);
        });
      });
    }

    // Title rename input
    const nameInput = this.container.querySelector('#component-name-input');
    if (nameInput) {
      nameInput.addEventListener('change', (e) => {
        store.renameActiveComponent(e.target.value.trim());
      });
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') nameInput.blur();
      });
    }

    // Subtabs click (Props, Anatomy, Variants)
    const subtabs = this.container.querySelectorAll('.subtab-btn');
    subtabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-subtab');
        store.setSubTab(target);
      });
    });

    // Kinds Tab click (Kinds vs Library)
    const kindsTabs = this.container.querySelectorAll('.kinds-tab-btn');
    kindsTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-kindstab');
        store.setKindsTab(target);
      });
    });

    // Open Foundation Tokens Studio from Library tab
    const openTokensBtn = this.container.querySelector('#btn-open-tokens-studio');
    if (openTokensBtn) {
      openTokensBtn.addEventListener('click', () => {
        store.setView('tokens');
      });
    }

    // Kind tile click opens New Prop Modal in popup (Requirement 5)
    const kindTiles = this.container.querySelectorAll('.kind-tile-btn');
    kindTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const kind = tile.getAttribute('data-kind');
        if (window.app && window.app.propModal) {
          window.app.propModal.open(kind);
        }
      });
    });

    // Clicking ANY property card row opens Property in Modal Popup (Requirement 5)
    const propCards = this.container.querySelectorAll('.prop-card-row');
    propCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-prop-menu') || e.target.closest('.btn-figma-bind') || e.target.closest('.btn-code-bind')) return;
        const propId = card.getAttribute('data-prop-id');
        const prop = comp.props?.find(p => p.id === propId);
        if (prop && window.app && window.app.propModal) {
          window.app.propModal.open(prop.kind, prop.name, prop);
        }
      });
    });

    // Clicking card action menu (⋯) also opens in modal popup (Requirement 5)
    const propMenuBtns = this.container.querySelectorAll('.btn-prop-menu');
    propMenuBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const propId = btn.getAttribute('data-prop-id');
        const prop = comp.props?.find(p => p.id === propId);
        if (prop && window.app && window.app.propModal) {
          window.app.propModal.open(prop.kind, prop.name, prop);
        }
      });
    });

    // Often added buttons
    const oftenBtns = this.container.querySelectorAll('.often-pill-btn');
    oftenBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const propName = btn.getAttribute('data-add-prop');
        this.addOftenProp(comp, propName);
      });
    });

    // Subtabs Extreme Right: Figma Dropdown Toggle (Images 5 & 6)
    const figmaBtn = this.container.querySelector('#btn-stage-figma');
    if (figmaBtn) {
      figmaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.figmaMenuOpen = !this.figmaMenuOpen;
        this.render();
      });
    }

    // Push all project scope components action inside dropdown
    const pushScopeMenuBtn = this.container.querySelector('#btn-menu-push-project-scope');
    if (pushScopeMenuBtn) {
      pushScopeMenuBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.figmaMenuOpen = false;
        await bridgeClient.pushProjectScopeComponents();
        this.render();
      });
    }

    // Push active component to Figma action inside dropdown
    const pushMenuBtn = this.container.querySelector('#btn-menu-push-figma');
    if (pushMenuBtn) {
      pushMenuBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.figmaMenuOpen = false;
        await bridgeClient.pushComponent(comp);
        this.render();
      });
    }

    // Copy Figma Payload action
    const copyFigmaBtn = this.container.querySelector('#btn-menu-copy-figma-json');
    if (copyFigmaBtn) {
      copyFigmaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.figmaMenuOpen = false;
        const payload = bridgeClient.generateFigmaSyncPayload(comp);
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
          bridgeClient.notifyUser('Copied Figma payload! You can paste it into the Figma Plugin "Paste JSON" tab.', 'success');
        });
        this.render();
      });
    }

    // Code button toggles 3rd right column open/close (Requirement 9)
    const codeBtn = this.container.querySelector('#btn-stage-code');
    if (codeBtn) {
      codeBtn.addEventListener('click', () => {
        this.codePanelOpen = !this.codePanelOpen;
        this.render();
      });
    }

    // Close code column button (✕)
    const closeCodeColBtns = this.container.querySelectorAll('#btn-close-code-col, #btn-close-anatomy-code');
    closeCodeColBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.codePanelOpen = false;
        this.render();
      });
    });

    // Preview button opens Interactive Sandbox as a Modal Popup (Requirement 7)
    const previewBtn = this.container.querySelector('#btn-stage-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        if (window.app && window.app.sandboxModal) {
          window.app.sandboxModal.open();
        }
      });
    }

    // Close figma menu on click outside
    document.addEventListener('click', (e) => {
      if (this.figmaMenuOpen && !e.target.closest('.subtabs-extreme-right')) {
        this.figmaMenuOpen = false;
        this.render();
      }
    }, { once: true });

    // Copy JSON Contract
    const copyJsonBtn = this.container.querySelector('#btn-copy-contract-json');
    if (copyJsonBtn) {
      copyJsonBtn.addEventListener('click', () => {
        const contract = this.generateComponentContract(comp);
        navigator.clipboard.writeText(JSON.stringify(contract, null, 2)).then(() => {
          copyJsonBtn.textContent = 'Copied!';
          setTimeout(() => { copyJsonBtn.textContent = 'Copy JSON'; }, 1800);
        });
      });
    }

    // Download JSON Contract
    const dlJsonBtn = this.container.querySelector('#btn-download-contract-json');
    if (dlJsonBtn) {
      dlJsonBtn.addEventListener('click', () => {
        const contract = this.generateComponentContract(comp);
        const blob = new Blob([JSON.stringify(contract, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${comp.id}-contract.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Preview button inside JSON column opens the popup (Requirement 7)
    const previewFromJsonBtns = this.container.querySelectorAll('#btn-preview-from-json, #btn-preview-from-anatomy-json');
    previewFromJsonBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.app && window.app.sandboxModal) {
          window.app.sandboxModal.open();
        }
      });
    });

    // Matrix cell selection click
    const matrixCells = this.container.querySelectorAll('.cell-marker');
    matrixCells.forEach(cell => {
      cell.addEventListener('click', () => {
        this.selectedMatrixCell = {
          size: cell.getAttribute('data-sz'),
          variant: cell.getAttribute('data-var'),
          tone: cell.getAttribute('data-tone'),
          state: cell.getAttribute('data-st'),
          disabled: cell.getAttribute('data-dis') === 'true',
          showIcon: cell.getAttribute('data-icon') === 'true'
        };
        this.render();
      });
    });
  }

  addOftenProp(comp, propName) {
    if (propName === 'Disabled') {
      store.addComponentProp({
        id: 'disabled',
        name: 'Disabled',
        kind: 'on_off',
        defaultValue: false,
        description: 'Disables user interactions'
      });
    } else if (propName === 'Selected') {
      store.addComponentProp({
        id: 'selected',
        name: 'Selected',
        kind: 'on_off',
        defaultValue: true,
        description: 'Toggles active selection state'
      });
    } else if (propName === 'State') {
      store.addComponentProp({
        id: 'state',
        name: 'Interaction states',
        kind: 'state',
        options: ['Rest', 'Hover', 'Focus', 'Press'],
        defaultValue: 'Rest',
        description: 'Interactive states'
      });
    }
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
