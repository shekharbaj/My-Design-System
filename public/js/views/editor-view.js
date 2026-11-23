// AI Design System Creator - Exact Reference Editor View (Images 1, 3, 5, 6, 7 References)
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient, getComponentSpecificVariants } from '../bridge-client.js';
import { STANDARD_ICONS, generateIconFromPrompt } from '../icons-data.js';
import { PropModal } from '../modals/prop-modal.js';
import { AnatomyModal } from '../modals/anatomy-modal.js';

export class EditorView {
  constructor(containerEl) {
    this.container = containerEl;
    this.propModal = new PropModal();
    this.anatomyModal = new AnatomyModal();
    this.anatomySubTab = 'json'; // 'json' | 'preview'
    this.codePanelOpen = true; // 3rd right column open by default; toggled via 'Code' tab
    this.figmaMenuOpen = false;
    this.iconStudioOpen = false;
    this.lastGeneratedIcon = null;
    this.iconCategoryFilter = 'All';
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
    store.subscribe('component:updated', (comp) => {
      // If user is currently focused on an inspector control, update preview without losing focus
      if (document.activeElement && this.container.contains(document.activeElement)) {
        const isInspectorInput = document.activeElement.closest('.figma-inspector-body');
        if (isInspectorInput) {
          this.updateLiveCanvasPreview();
          return;
        }
      }
      this.render();
    });
    store.subscribe('icons:updated', () => this.render());
    store.subscribe('subTab:changed', () => this.render());
    store.subscribe('kindsTab:changed', () => this.render());
    store.subscribe('prop-schema:updated', () => this.render());
    store.subscribe('anatomy:updated', () => this.render());
  }

  updateLiveCanvasPreview() {
    const comp = store.getActiveComponent();
    if (!comp) return;
    const compType = this.detectCompType(comp);
    const currentState = store.activeState || 'Rest';
    const mountBox = this.container.querySelector('.rendered-component-mount-box');
    if (mountBox) {
      mountBox.innerHTML = this.generateLiveComponentPreviewHtml(comp, compType, currentState);
      this.attachIconStudioListeners(comp);
    }
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
    const styles = this.getComponentComputedStyles(comp, currentState);
    const renderedHtml = this.generateLiveComponentPreviewHtml(comp, compType, currentState);
    const tokens = this.getTokensForComponent(comp, compType);
    const isIconComp = (compType === 'icon' || comp.id === 'icon' || (comp.name || '').toLowerCase().includes('icon'));
    const customIcons = store.getCustomIcons ? store.getCustomIcons() : [];
    const allIcons = [...STANDARD_ICONS, ...customIcons];
    const activeIconId = (comp.activeProps && comp.activeProps.iconSwap) || comp.icon || 'home';
    const activeIconObj = allIcons.find(i => i.id === activeIconId) || allIcons[0];
    const activeIconSvg = activeIconObj ? activeIconObj.svg : '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
    const activeIconName = activeIconObj ? activeIconObj.name : 'Home';

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

            ${isIconComp ? `
              <button type="button" id="btn-open-icon-studio-header" class="adsc-btn btn-secondary compact" style="margin-left: auto; margin-right: 12px; display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; background: #FFF7ED; color: #C2410C; border: 1px solid #FDBA74; border-radius: 6px; padding: 4px 12px; cursor: pointer;">
                <span>🛠 Open Icon Studio & Generator</span>
                <span style="background: #EA580C; color: #FFFFFF; padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 700;">${allIcons.length}</span>
              </button>
            ` : ''}

            <div class="preview-stage-meta" ${isIconComp ? 'style="margin-left: 0;"' : ''}>
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

          </div>
        <!-- Right: FIGMA-GRADE PROPERTIES INSPECTOR (Requirement 29) -->
        <aside class="preview-controls-aside figma-inspector-panel">
          <div class="controls-aside-header">
            <div class="figma-inspector-title">
              <span class="figma-icon">❖</span>
              <h4>Properties</h4>
            </div>
            <span class="controls-badge">Figma Mode</span>
          </div>

          <div class="controls-aside-body figma-inspector-body">
            <!-- 1. RESIZING & LAYOUT (Auto Layout - Requirement 32) -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <span class="sec-title">Resizing & Layout</span>
                <span class="figma-sub-tag">Auto Layout</span>
              </div>

              <!-- Width & Height with Hug / Fixed Controls -->
              <div class="figma-grid-row">
                <div class="figma-field-col">
                  <label>Width</label>
                  <div class="input-with-pill">
                    <input type="number" id="figma-width-input" value="${styles.customWidth}" class="figma-input-sm" />
                    <button class="pill-toggle-btn ${styles.widthMode === 'hug' ? 'active' : ''}" id="btn-toggle-w-hug" title="Hug Content">Hug</button>
                  </div>
                </div>

                <div class="figma-field-col">
                  <label>Height</label>
                  <div class="input-with-pill">
                    <input type="number" id="figma-height-input" value="${styles.customHeight || 36}" min="16" max="600" class="figma-input-sm" />
                    <button class="pill-toggle-btn ${styles.heightMode === 'hug' ? 'active' : ''}" id="btn-toggle-h-hug" title="Hug Content (Default ~36px)">Hug</button>
                  </div>
                </div>
              </div>

              <!-- Padding Y & Padding X Controls (Requirement 32) -->
              <div class="figma-grid-row mt-8">
                <div class="figma-field-col">
                  <label>Padding Y (V)</label>
                  <div class="input-with-unit">
                    <input type="number" id="figma-pad-y-input" value="${styles.padding.top}" min="0" max="64" class="figma-input-sm" />
                    <span class="unit-suffix">px</span>
                  </div>
                </div>
                <div class="figma-field-col">
                  <label>Padding X (H)</label>
                  <div class="input-with-unit">
                    <input type="number" id="figma-pad-x-input" value="${styles.padding.right}" min="0" max="64" class="figma-input-sm" />
                    <span class="unit-suffix">px</span>
                  </div>
                </div>
              </div>

              <div class="figma-field-col mt-6">
                <label>Item Gap</label>
                <input type="number" id="figma-gap-input" value="${styles.gap}" min="0" max="64" class="figma-input-sm" />
              </div>
            </div>

            <!-- 2. APPEARANCE -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <span class="sec-title">Appearance</span>
              </div>
              <div class="figma-grid-row">
                <div class="figma-field-col">
                  <label>Opacity</label>
                  <div class="input-with-unit">
                    <input type="number" id="figma-opacity-input" value="${styles.opacity}" min="0" max="100" class="figma-input-sm" />
                    <span class="unit-suffix">%</span>
                  </div>
                </div>
                <div class="figma-field-col">
                  <label>Corner Radius</label>
                  <div class="input-with-unit">
                    <input type="number" id="figma-radius-input" value="${styles.cornerRadius}" min="0" max="999" class="figma-input-sm" />
                    <span class="unit-suffix">px</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2.5 TYPOGRAPHY (Requirement 32: Font Size, Weight, Font Color) -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <span class="sec-title">Typography</span>
              </div>
              <div class="figma-grid-row">
                <div class="figma-field-col">
                  <label>Font Size</label>
                  <div class="input-with-unit">
                    <input type="number" id="figma-font-size-input" value="${styles.fontSize}" min="9" max="72" class="figma-input-sm" />
                    <span class="unit-suffix">px</span>
                  </div>
                </div>
                <div class="figma-field-col">
                  <label>Weight</label>
                  <select id="figma-font-weight-select" class="figma-select-sm">
                    <option value="400" ${styles.fontWeight === '400' ? 'selected' : ''}>Regular (400)</option>
                    <option value="500" ${styles.fontWeight === '500' ? 'selected' : ''}>Medium (500)</option>
                    <option value="600" ${styles.fontWeight === '600' ? 'selected' : ''}>Semi-Bold (600)</option>
                    <option value="700" ${styles.fontWeight === '700' ? 'selected' : ''}>Bold (700)</option>
                  </select>
                </div>
              </div>
              <div class="figma-field-col mt-6">
                <label>Text Color</label>
                <div class="figma-property-row">
                  <input type="color" id="figma-text-color-picker" value="${styles.textColor.startsWith('#') ? styles.textColor : '#1F2937'}" class="figma-color-thumb" />
                  <input type="text" id="figma-text-color-hex" value="${styles.textColor}" class="figma-input-hex" />
                </div>
              </div>
            </div>

            <!-- 3. FILL (BACKGROUND) - ADD/REMOVE (Requirement 29) -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <div class="title-with-eye">
                  <span class="sec-title">Fill</span>
                  <button class="figma-eye-btn ${styles.hasFill ? 'active' : 'off'}" id="btn-toggle-fill-eye" title="Toggle Fill Visibility">
                    ${styles.hasFill ? '👁' : '🚫'}
                  </button>
                </div>
                <div class="section-actions-right">
                  <button class="figma-action-btn" id="btn-toggle-fill-remove" title="Remove or add Fill">
                    ${styles.hasFill ? '−' : '+'}
                  </button>
                </div>
              </div>

              ${styles.hasFill ? `
                <div class="figma-property-row mt-6">
                  <input type="color" id="figma-fill-picker" value="${styles.bg.startsWith('#') ? styles.bg : '#FFFFFF'}" class="figma-color-thumb" />
                  <input type="text" id="figma-fill-hex" value="${styles.bg}" class="figma-input-hex" />
                  <span class="opacity-tag">100%</span>
                </div>

                <!-- Background Image (Requirement 29) -->
                <div class="figma-field-col mt-8">
                  <label>Background Image URL</label>
                  <input type="text" id="figma-bg-image-input" placeholder="https://... (Optional image)" value="${styles.bgImage || ''}" class="figma-input-sm" />
                </div>
              ` : `
                <div class="figma-empty-note">No fill applied (Transparent background)</div>
              `}
            </div>

            <!-- 4. STROKE (BORDER) - ADD/REMOVE (Requirement 29) -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <div class="title-with-eye">
                  <span class="sec-title">Stroke</span>
                  <button class="figma-eye-btn ${styles.hasBorder ? 'active' : 'off'}" id="btn-toggle-stroke-eye" title="Toggle Border Visibility">
                    ${styles.hasBorder ? '👁' : '🚫'}
                  </button>
                </div>
                <div class="section-actions-right">
                  <button class="figma-action-btn" id="btn-toggle-stroke-remove" title="Remove or add Stroke">
                    ${styles.hasBorder ? '−' : '+'}
                  </button>
                </div>
              </div>

              ${styles.hasBorder ? `
                <div class="figma-property-row mt-6">
                  <input type="color" id="figma-stroke-picker" value="${styles.borderColor.startsWith('#') ? styles.borderColor : '#D1D5DB'}" class="figma-color-thumb" />
                  <input type="text" id="figma-stroke-hex" value="${styles.borderColor}" class="figma-input-hex" />
                  <div class="stroke-weight-box">
                    <input type="number" id="figma-stroke-weight" value="${styles.borderWidth}" min="1" max="12" class="figma-input-weight" />
                    <span>px</span>
                  </div>
                </div>

                <div class="figma-grid-row mt-6">
                  <div class="figma-field-col">
                    <label>Position</label>
                    <select id="figma-stroke-pos" class="figma-select-sm">
                      <option value="inside" selected>Inside</option>
                      <option value="center">Center</option>
                      <option value="outside">Outside</option>
                    </select>
                  </div>
                  <div class="figma-field-col">
                    <label>Style</label>
                    <select id="figma-stroke-style" class="figma-select-sm">
                      <option value="solid" ${styles.borderStyle === 'solid' ? 'selected' : ''}>Solid</option>
                      <option value="dashed" ${styles.borderStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                      <option value="dotted" ${styles.borderStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                    </select>
                  </div>
                </div>
              ` : `
                <div class="figma-empty-note">No stroke applied (Border none)</div>
              `}
            </div>

            <!-- 5. EFFECTS (SHADOW) - ADD/REMOVE (Requirement 29) -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <span class="sec-title">Effects</span>
                <button class="figma-action-btn" id="btn-toggle-effects" title="Toggle Drop Shadow">
                  ${styles.shadow && styles.shadow !== 'none' ? '−' : '+'}
                </button>
              </div>

              <div class="figma-field-col mt-6">
                <label>Drop Shadow Preset</label>
                <select id="figma-shadow-select" class="figma-select-sm">
                  <option value="none" ${styles.shadow === 'none' ? 'selected' : ''}>None</option>
                  <option value="0 1px 3px rgba(0,0,0,0.1)" ${styles.shadow?.includes('0 1px 3px') ? 'selected' : ''}>Elevation 1 (Subtle)</option>
                  <option value="0 4px 6px -1px rgba(0,0,0,0.1)" ${styles.shadow?.includes('0 4px 6px') ? 'selected' : ''}>Elevation 2 (Card)</option>
                  <option value="0 10px 15px -3px rgba(0,0,0,0.1)" ${styles.shadow?.includes('0 10px 15px') ? 'selected' : ''}>Elevation 3 (Floating)</option>
                  <option value="0 20px 25px -5px rgba(0,0,0,0.15)" ${styles.shadow?.includes('0 20px 25px') ? 'selected' : ''}>Elevation 4 (Modal)</option>
                </select>
              </div>
            </div>

            <!-- 5.5 ICON GLYPH & STUDIO TOOL (When active component is Icon) -->
            ${isIconComp ? `
              <div class="figma-section-block">
                <div class="figma-section-title-row">
                  <span class="sec-title">Icon Glyph</span>
                  <span class="figma-sub-tag">Library</span>
                </div>
                <div class="figma-field-col mt-6">
                  <div style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 8px;">
                    <div style="width: 32px; height: 32px; border-radius: 6px; background: #FFF7ED; border: 1px solid #FED7AA; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${activeIconSvg}
                      </svg>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <strong style="font-size: 13px; color: #111827; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${activeIconName}</strong>
                      <span style="font-size: 11px; color: #6B7280;">Active Component Glyph</span>
                    </div>
                  </div>
                </div>

                <div class="figma-field-col mt-6">
                  <label>Quick Glyph Switch</label>
                  <select id="quick-icon-swap-select" class="figma-select-sm">
                    ${allIcons.slice(0, 30).map(icon => `
                      <option value="${icon.id}" ${activeIconId === icon.id ? 'selected' : ''}>${icon.name} (${icon.category || 'General'})</option>
                    `).join('')}
                  </select>
                </div>

                <div class="figma-field-col mt-8">
                  <button type="button" id="btn-open-icon-studio-aside" class="adsc-btn btn-secondary full-width" style="background: #FFF7ED; color: #C2410C; border-color: #FDBA74; font-size: 12px; font-weight: 600; padding: 7px 10px; cursor: pointer;">
                    🛠 Open Icon Studio & Generator (${allIcons.length})
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- 6. COMPONENT TEXT & PROPS -->
            <div class="figma-section-block">
              <div class="figma-section-title-row">
                <span class="sec-title">Content & Props</span>
              </div>

              <div class="figma-field-col mt-6">
                <label>Label / Title</label>
                <input type="text" id="live-prop-label" value="${activeProps.label || comp.name}" class="figma-input-sm" />
              </div>

              ${compType === 'checkbox' || compType === 'switch' || compType === 'radio' ? `
                <div class="figma-field-col mt-8">
                  <label class="switch-toggle-label">
                    <input type="checkbox" id="live-prop-checked" ${activeProps.checked !== false ? 'checked' : ''} />
                    <span>${compType === 'radio' ? 'Selected' : 'Checked'} state</span>
                  </label>
                </div>
              ` : ''}

              <div class="figma-field-col mt-8">
                <label class="switch-toggle-label">
                  <input type="checkbox" id="live-prop-show-icon" ${activeProps.showIcon || activeProps.hasLeftIcon ? 'checked' : ''} />
                  <span>Show leading icon</span>
                </label>
              </div>

              <div class="figma-field-col mt-6">
                <label class="switch-toggle-label">
                  <input type="checkbox" id="live-prop-disabled" ${activeProps.disabled ? 'checked' : ''} />
                  <span>Disabled interaction</span>
                </label>
              </div>
            </div>

            <!-- 7. PUSH TO FIGMA ACTION BUTTON -->
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
    if (!comp) return 'button';
    const id = (comp.id || '').toLowerCase();
    const name = (comp.name || '').toLowerCase();

    if (id.includes('footer') || name.includes('footer')) return 'footer';
    if (id.includes('header') || name.includes('header')) return 'header';
    if (id.includes('sidebar-switcher') || name.includes('switcher')) return 'sidebar-switcher';
    if (id.includes('sidebar') || name.includes('sidebar')) return 'sidebar-item';
    if (id.includes('stepper') || name.includes('stepper')) return 'stepper';
    if (id.includes('pagination') || name.includes('pagination')) return 'pagination';
    if (id.includes('slider') || name.includes('slider')) return 'slider';
    if (id.includes('file-upload') || name.includes('upload') || id.includes('upload')) return 'file-upload';
    if (id.includes('date-picker') || id.includes('date-input') || name.includes('date')) return 'date-input';
    if (id.includes('multiselect') || name.includes('multiselect')) return 'multiselect';
    if (id.includes('link') || name.includes('link')) return 'link';
    if (id.includes('action-bar') || name.includes('action bar')) return 'action-bar';
    if (id.includes('compact-button') || name.includes('compact button')) return 'compact-button';
    if (id.includes('checkbox') || name.includes('checkbox')) return 'checkbox';
    if (id.includes('switch') || id.includes('toggle') || name.includes('switch')) return 'switch';
    if (id.includes('radio') || name.includes('radio')) return 'radio';
    if (id.includes('input') || id.includes('textarea') || name.includes('input')) return 'input';
    if (id.includes('modal') || id.includes('dialog')) return 'modal';
    if (id.includes('drawer') || name.includes('drawer')) return 'drawer';
    if (id.includes('table') || name.includes('table')) return 'table';
    if (id.includes('avatar') || name.includes('avatar')) return 'avatar';
    if (id.includes('badge') || name.includes('badge')) return 'badge';
    if (id.includes('tab') || name.includes('tab')) return 'tab';
    if (id.includes('toast') || id.includes('notification')) return 'toast';
    if (id.includes('card') || name.includes('card')) return 'card';
    if (id.includes('chip') || name.includes('chip')) return 'chip';
    if (id.includes('dropdown') || id.includes('select') || id.includes('menu')) return 'dropdown';
    if (id.includes('icon') || name.includes('icon')) return 'icon';
    if (id.includes('accordion') || name.includes('accordion')) return 'accordion';
    if (id.includes('breadcrumb') || name.includes('breadcrumb')) return 'breadcrumb';
    if (id.includes('progress') || name.includes('progress')) return 'progress-bar';
    if (id.includes('feedback') || id.includes('alert') || name.includes('feedback') || name.includes('alert')) return 'feedback-message';
    if (id.includes('skeleton') || name.includes('skeleton')) return 'skeleton-loader';
    if (id.includes('empty') || name.includes('empty')) return 'empty-state';
    if (id.includes('rating') || name.includes('rating')) return 'rating';
    if (id.includes('popover') || name.includes('popover')) return 'popover';
    if (id.includes('tooltip') || name.includes('tooltip')) return 'tooltip';
    if (id.includes('carousel') || name.includes('carousel')) return 'carousel';
    if (id.includes('list') || id.includes('added-item') || name.includes('list') || name.includes('item')) return 'list';
    if (id.includes('tag') || id.includes('pill') || name.includes('tag') || name.includes('pill')) return 'tag-pill';
    if (id.includes('divider') || name.includes('divider')) return 'divider';
    if (id.includes('label') || name.includes('label')) return 'label';
    return 'button';
  }


  getComponentComputedStyles(comp, state) {
    const s = comp.styles || {};
    const compType = this.detectCompType(comp);
    const isHover = state === 'Hover';
    const isFocus = state === 'Focus';
    const isPress = state === 'Press';
    const p = comp.activeProps || {};

    // Defaults based on component type
    let defaultHasFill = true;
    let defaultBg = '#FFFFFF';
    let defaultHasBorder = true;
    let defaultBorderColor = '#D1D5DB';
    let defaultBorderWidth = 1;
    let defaultRadius = 8;
    let defaultTextColor = '#1F2937';
    let defaultFontSize = 14;
    let defaultFontWeight = '500';
    let defaultHeightMode = 'hug';
    let defaultCustomHeight = 36;
    let defaultWidthMode = 'hug';
    let defaultCustomWidth = 320;
    let defaultPadTop = 8;
    let defaultPadRight = 14;
    let defaultPadBottom = 8;
    let defaultPadLeft = 14;
    let defaultGap = 8;

    if (compType === 'checkbox' || compType === 'switch' || compType === 'radio' || compType === 'link') {
      defaultHasFill = false;
      defaultBg = 'transparent';
      defaultHasBorder = false;
      defaultBorderWidth = 0;
      defaultRadius = 4;
      defaultPadTop = 4;
      defaultPadRight = 8;
      defaultPadBottom = 4;
      defaultPadLeft = 8;
      defaultCustomHeight = 24;
    } else if (compType === 'icon') {
      defaultHasFill = false;
      defaultBg = 'transparent';
      defaultHasBorder = false;
      defaultBorderWidth = 0;
      defaultRadius = 8;
      defaultTextColor = '#1F2937';
      defaultCustomWidth = 640;
      defaultPadTop = 18;
      defaultPadRight = 18;
      defaultPadBottom = 18;
      defaultPadLeft = 18;
    } else if (compType === 'badge') {
      defaultHasFill = true;
      defaultBg = '#FFEDD5';
      defaultBorderColor = '#FDBA74';
      defaultBorderWidth = 1;
      defaultRadius = 999;
      defaultTextColor = '#9A3412';
      defaultFontSize = 12;
      defaultFontWeight = '600';
      defaultPadTop = 4;
      defaultPadRight = 10;
      defaultPadBottom = 4;
      defaultPadLeft = 10;
      defaultCustomHeight = 24;
    } else if (compType === 'chip') {
      defaultHasFill = true;
      defaultBg = '#F3F4F6';
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 999;
      defaultTextColor = '#374151';
      defaultFontSize = 13;
      defaultFontWeight = '500';
      defaultPadTop = 6;
      defaultPadRight = 12;
      defaultPadBottom = 6;
      defaultPadLeft = 12;
      defaultCustomHeight = 28;
    } else if (compType === 'button' || compType === 'compact-button' || compType === 'action-bar') {
      defaultHasFill = true;
      defaultBg = p.variant === 'secondary' ? '#F3F4F6' : (p.variant === 'outline' ? '#FFFFFF' : '#C2410C');
      defaultTextColor = p.variant === 'secondary' ? '#1F2937' : (p.variant === 'outline' ? '#C2410C' : '#FFFFFF');
      defaultBorderColor = p.variant === 'outline' ? '#C2410C' : (p.variant === 'secondary' ? '#E5E7EB' : '#9A3412');
      defaultBorderWidth = p.variant === 'outline' ? 1.5 : (p.variant === 'secondary' ? 1 : 0);
      defaultRadius = 6;
      defaultFontSize = 14;
      defaultFontWeight = '600';
      defaultPadTop = compType === 'compact-button' ? 5 : 8;
      defaultPadRight = compType === 'compact-button' ? 10 : 16;
      defaultPadBottom = compType === 'compact-button' ? 5 : 8;
      defaultPadLeft = compType === 'compact-button' ? 10 : 16;
      defaultCustomHeight = compType === 'compact-button' ? 28 : 36;
    } else if (compType === 'footer' || compType === 'header' || compType === 'card' || compType === 'table' || compType === 'modal') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultPadTop = compType === 'footer' ? 18 : 16;
      defaultPadRight = compType === 'footer' ? 24 : 20;
      defaultPadBottom = compType === 'footer' ? 18 : 16;
      defaultPadLeft = compType === 'footer' ? 24 : 20;
      defaultCustomWidth = compType === 'footer' ? 540 : 480;
      defaultCustomHeight = compType === 'footer' ? 110 : 140;
    } else if (compType === 'accordion') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 8;
      defaultPadTop = 0;
      defaultPadRight = 0;
      defaultPadBottom = 0;
      defaultPadLeft = 0;
      defaultCustomWidth = 520;
    } else if (compType === 'breadcrumb') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 8;
      defaultPadTop = 10;
      defaultPadRight = 18;
      defaultPadBottom = 10;
      defaultPadLeft = 18;
      defaultCustomHeight = 44;
    } else if (compType === 'progress-bar') {
      defaultHasFill = false;
      defaultBg = 'transparent';
      defaultHasBorder = false;
      defaultBorderWidth = 0;
      defaultCustomWidth = 420;
      defaultCustomHeight = 52;
    } else if (compType === 'feedback-message') {
      defaultHasFill = true;
      defaultBg = '#FFF7ED';
      defaultHasBorder = true;
      defaultBorderColor = '#FDBA74';
      defaultBorderWidth = 1;
      defaultRadius = 8;
      defaultPadTop = 14;
      defaultPadRight = 18;
      defaultPadBottom = 14;
      defaultPadLeft = 18;
      defaultCustomWidth = 460;
    } else if (compType === 'skeleton-loader') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 12;
      defaultCustomWidth = 380;
      defaultPadTop = 20;
      defaultPadRight = 20;
      defaultPadBottom = 20;
      defaultPadLeft = 20;
    } else if (compType === 'empty-state') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 12;
      defaultCustomWidth = 440;
      defaultPadTop = 28;
      defaultPadRight = 24;
      defaultPadBottom = 28;
      defaultPadLeft = 24;
    } else if (compType === 'rating') {
      defaultHasFill = false;
      defaultBg = 'transparent';
      defaultHasBorder = false;
      defaultBorderWidth = 0;
      defaultCustomHeight = 36;
      defaultPadTop = 6;
      defaultPadRight = 12;
      defaultPadBottom = 6;
      defaultPadLeft = 12;
    } else if (compType === 'drawer') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 12;
      defaultCustomWidth = 340;
      defaultPadTop = 0;
      defaultPadRight = 0;
      defaultPadBottom = 0;
      defaultPadLeft = 0;
    } else if (compType === 'popover' || compType === 'tooltip') {
      defaultHasFill = true;
      defaultBg = compType === 'tooltip' ? '#1F2937' : '#FFFFFF';
      defaultTextColor = compType === 'tooltip' ? '#FFFFFF' : '#1F2937';
      defaultHasBorder = compType !== 'tooltip';
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = compType === 'tooltip' ? 0 : 1;
      defaultRadius = compType === 'tooltip' ? 6 : 8;
      defaultCustomWidth = compType === 'tooltip' ? 200 : 300;
    } else if (compType === 'list') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#E5E7EB';
      defaultBorderWidth = 1;
      defaultRadius = 8;
      defaultCustomWidth = 380;
      defaultPadTop = 0;
      defaultPadRight = 0;
      defaultPadBottom = 0;
      defaultPadLeft = 0;
    } else if (compType === 'carousel') {
      defaultHasFill = true;
      defaultBg = '#FFFFFF';
      defaultHasBorder = true;
      defaultBorderColor = '#FED7AA';
      defaultBorderWidth = 1;
      defaultRadius = 12;
      defaultCustomWidth = 480;
      defaultCustomHeight = 200;
      defaultPadTop = 0;
      defaultPadRight = 0;
      defaultPadBottom = 0;
      defaultPadLeft = 0;
    }

    // Merge stored custom styles
    const hasFill = s.hasFill !== undefined ? s.hasFill : defaultHasFill;
    const bg = s.bg !== undefined ? s.bg : defaultBg;
    const bgOpacity = s.bgOpacity !== undefined ? s.bgOpacity : 100;
    const bgImage = s.bgImage || '';

    const hasBorder = s.hasBorder !== undefined ? s.hasBorder : defaultHasBorder;
    const borderColor = s.borderColor !== undefined ? s.borderColor : defaultBorderColor;
    const borderWidth = s.borderWidth !== undefined ? s.borderWidth : defaultBorderWidth;
    const borderStyle = s.borderStyle || 'solid';

    const cornerRadius = s.cornerRadius !== undefined ? s.cornerRadius : defaultRadius;
    const opacity = s.opacity !== undefined ? s.opacity : 100;

    // Typography (Requirement 32)
    const fontSize = s.fontSize !== undefined ? s.fontSize : defaultFontSize;
    const textColor = s.textColor !== undefined ? s.textColor : defaultTextColor;
    const fontWeight = s.fontWeight !== undefined ? s.fontWeight : defaultFontWeight;

    // Height & Width (Requirement 32)
    const heightMode = s.heightMode || defaultHeightMode;
    const customHeight = s.customHeight || defaultCustomHeight;
    const widthMode = s.widthMode || defaultWidthMode;
    const customWidth = s.customWidth || defaultCustomWidth;

    // Padding (Requirement 32: editable for all components)
    const padTop = s.padding?.top ?? defaultPadTop;
    const padRight = s.padding?.right ?? defaultPadRight;
    const padBottom = s.padding?.bottom ?? defaultPadBottom;
    const padLeft = s.padding?.left ?? defaultPadLeft;
    const gap = s.gap !== undefined ? s.gap : defaultGap;
    const shadow = s.shadow || 'none';
    const align = s.align || 'center';

    return {
      fontSize,
      textColor,
      fontWeight,
      heightMode,
      customHeight,
      hasFill,
      bg: hasFill ? bg : 'transparent',
      bgOpacity,
      bgImage,
      hasBorder,
      borderColor: hasBorder ? borderColor : 'transparent',
      borderWidth: hasBorder ? borderWidth : 0,
      borderStyle,
      cornerRadius,
      opacity,
      padding: { top: padTop, right: padRight, bottom: padBottom, left: padLeft },
      gap,
      shadow,
      align,
      widthMode,
      customWidth
    };
  }

  generateLiveComponentPreviewHtml(comp, compType, state) {
    const p = comp.activeProps || {};
    const label = p.label || comp.name;
    const isHover = state === 'Hover';
    const isFocus = state === 'Focus';
    const isPress = state === 'Press';
    const isDisabled = p.disabled || state === 'Disabled';
    const styles = this.getComponentComputedStyles(comp, state);

    // Compute container inline style with box-sizing, sizing, typography, fill, border, effects
    const widthCss = styles.widthMode === 'fixed'
      ? `width: ${styles.customWidth}px;`
      : (styles.widthMode === 'fill' ? 'width: 100%;' : '');

    const heightCss = styles.heightMode === 'fixed'
      ? `height: ${styles.customHeight}px;`
      : '';

    const bgCss = styles.hasFill
      ? `background-color: ${styles.bg} !important;`
      : 'background-color: transparent !important;';

    const bgImgCss = (styles.hasFill && styles.bgImage)
      ? `background-image: url('${styles.bgImage}') !important; background-size: cover; background-position: center;`
      : '';

    const borderCss = (styles.hasBorder && styles.borderWidth > 0)
      ? `border: ${styles.borderWidth}px ${styles.borderStyle} ${styles.borderColor} !important;`
      : (styles.hasBorder === false ? 'border: none !important;' : `border: ${styles.borderWidth}px ${styles.borderStyle} ${styles.borderColor};`);

    const radiusCss = `border-radius: ${styles.cornerRadius >= 9999 ? '9999px' : styles.cornerRadius + 'px'} !important;`;

    const paddingCss = `padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px !important;`;

    const fontCss = `font-size: ${styles.fontSize}px !important; font-weight: ${styles.fontWeight} !important; color: ${styles.textColor} !important;`;

    const containerStyle = `box-sizing: border-box; ${widthCss} ${heightCss} ${bgCss} ${bgImgCss} ${borderCss} ${radiusCss} ${paddingCss} gap: ${styles.gap}px; box-shadow: ${styles.shadow}; opacity: ${styles.opacity / 100}; ${fontCss}`;

    // Icon component renderer: Clean authentic Icon Component Preview (NOT the tool!)
    if (compType === 'icon' || comp.id === 'icon' || (comp.name || '').toLowerCase().includes('icon')) {
      const customIcons = store.getCustomIcons ? store.getCustomIcons() : [];
      const allIcons = [...STANDARD_ICONS, ...customIcons];
      const activeIconId = p.iconSwap || comp.icon || 'home';
      const activeIconObj = allIcons.find(i => i.id === activeIconId) || allIcons[0];
      const activeIconSvg = activeIconObj ? activeIconObj.svg : '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
      const activeIconName = activeIconObj ? activeIconObj.name : 'Home';

      let glyphSize = 32;
      if (p.size === 'sm' || styles.fontSize <= 16) glyphSize = 18;
      else if (p.size === 'lg' || styles.fontSize >= 32) glyphSize = 40;
      else if (styles.fontSize && styles.fontSize >= 12 && styles.fontSize <= 64) glyphSize = styles.fontSize;

      const strokeColor = styles.textColor && styles.textColor !== '#FFFFFF' && styles.textColor !== '#ffffff'
        ? styles.textColor
        : (p.color === 'Neutral' ? '#1F2937' : (p.color === 'Muted' ? '#6B7280' : (p.color === 'Success' ? '#15803D' : '#C2410C')));

      return `
        <div class="live-comp-icon-stage" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 28px 20px; box-sizing: border-box; min-height: 220px;">
          <!-- Authentic Icon Component -->
          <div class="live-comp-icon-preview" style="${containerStyle} display: inline-flex; align-items: center; justify-content: center; min-width: ${glyphSize + 20}px; min-height: ${glyphSize + 20}px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;" title="Icon Component: ${activeIconName}">
            <svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; flex-shrink: 0;">
              ${activeIconSvg}
            </svg>
          </div>

          <!-- Component Details Card -->
          <div style="display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 999px; padding: 5px 14px; font-size: 11.5px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <span style="font-weight: 700; color: #111827;">Icon / ${activeIconName}</span>
            <span style="color: #D1D5DB;">|</span>
            <span style="color: #6B7280;">Size: <strong>${glyphSize}px</strong></span>
            <span style="color: #D1D5DB;">|</span>
            <span style="display: flex; align-items: center; gap: 5px; color: #6B7280;">
              <span style="width: 9px; height: 9px; border-radius: 50%; background: ${strokeColor}; display: inline-block;"></span>
              <strong>${strokeColor}</strong>
            </span>
          </div>

          <!-- Quick Action to Open Tool directly from canvas -->
          <button type="button" id="btn-trigger-icon-studio" class="adsc-btn btn-secondary compact" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; background: #FFF7ED; color: #C2410C; border: 1px solid #FDBA74; border-radius: 8px; padding: 6px 14px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <span>🛠 Open Icon Studio & Generator</span>
            <span style="background: #EA580C; color: #FFFFFF; padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 700;">${allIcons.length}</span>
          </button>
        </div>
      `;
    }

    // 1. FOOTER (Requirement 29: Real footer layout, NOT a button!)
    if (compType === 'footer') {
      return `
        <div class="live-comp-footer" style="${containerStyle} min-width: 480px; max-width: 580px; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; color: #C2410C;">✦</span>
              <strong style="font-size: 14px; color: #111827;">Terracotta Design System</strong>
            </div>
            <div style="display: flex; gap: 14px; font-size: 12px; color: #6B7280;">
              <span style="cursor: pointer;">Privacy</span>
              <span style="cursor: pointer;">Terms</span>
              <span style="cursor: pointer;">Docs</span>
              <span style="cursor: pointer;">Status</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #9CA3AF;">
            <span>${label || '© 2026 Design System. All rights reserved.'}</span>
            <span style="color: #10B981; font-weight: 600;">● All systems normal</span>
          </div>
        </div>
      `;
    }

    // 2. HEADER
    if (compType === 'header') {
      return `
        <div class="live-comp-header" style="${containerStyle} min-width: 520px; max-width: 600px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <strong style="font-size: 15px; color: #C2410C;">✦ Brand</strong>
            <div style="display: flex; gap: 12px; font-size: 13px; color: #4B5563;">
              <span style="font-weight: 600; color: #111827;">Overview</span>
              <span>Tokens</span>
              <span>Components</span>
            </div>
          </div>
          <button style="padding: 5px 12px; border-radius: 6px; background: #C2410C; color: #fff; border: none; font-size: 12px; font-weight: 600; cursor: pointer;">
            Get Started
          </button>
        </div>
      `;
    }

    // 3. STEPPER
    if (compType === 'stepper') {
      return `
        <div class="live-comp-stepper" style="${containerStyle} display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: #C2410C; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">1</span>
            <span style="font-size: 13px; font-weight: 600; color: #111827;">Details</span>
          </div>
          <div style="width: 32px; height: 2px; background: #C2410C;"></div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: #FFF7ED; color: #C2410C; border: 1.5px solid #C2410C; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">2</span>
            <span style="font-size: 13px; font-weight: 600; color: #C2410C;">Review</span>
          </div>
          <div style="width: 32px; height: 2px; background: #E5E7EB;"></div>
          <div style="display: flex; align-items: center; gap: 6px; opacity: 0.5;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: #F3F4F6; color: #6B7280; display: flex; align-items: center; justify-content: center; font-size: 12px;">3</span>
            <span style="font-size: 13px; color: #6B7280;">Done</span>
          </div>
        </div>
      `;
    }

    // 4. PAGINATION
    if (compType === 'pagination') {
      return `
        <div class="live-comp-pagination" style="${containerStyle} display: flex; align-items: center; gap: 4px;">
          <button style="padding: 5px 10px; border-radius: 6px; border: 1px solid #E5E7EB; background: #fff; font-size: 12px; cursor: pointer;">‹ Previous</button>
          <button style="width: 28px; height: 28px; border-radius: 6px; border: 1px solid #E5E7EB; background: #fff; font-size: 12px; cursor: pointer;">1</button>
          <button style="width: 28px; height: 28px; border-radius: 6px; border: none; background: #C2410C; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;">2</button>
          <button style="width: 28px; height: 28px; border-radius: 6px; border: 1px solid #E5E7EB; background: #fff; font-size: 12px; cursor: pointer;">3</button>
          <button style="padding: 5px 10px; border-radius: 6px; border: 1px solid #E5E7EB; background: #fff; font-size: 12px; cursor: pointer;">Next ›</button>
        </div>
      `;
    }

    // 5. SLIDER
    if (compType === 'slider') {
      return `
        <div class="live-comp-slider" style="${containerStyle} width: 280px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
            <span style="color: #4B5563;">${label}</span>
            <span style="color: #C2410C;">75%</span>
          </div>
          <div style="position: relative; width: 100%; height: 6px; border-radius: 3px; background: #E5E7EB;">
            <div style="width: 75%; height: 100%; border-radius: 3px; background: #C2410C;"></div>
            <div style="position: absolute; left: 75%; top: 50%; transform: translate(-50%, -50%); width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid #C2410C; box-shadow: 0 1px 3px rgba(0,0,0,0.2); cursor: grab;"></div>
          </div>
        </div>
      `;
    }

    // 6. LINK
    if (compType === 'link') {
      return `
        <a class="live-comp-link" style="${containerStyle} display: inline-flex; align-items: center; gap: 6px; color: #C2410C; text-decoration: none; font-size: 14px; font-weight: 600; cursor: pointer;">
          <span>${label || 'Explore documentation'}</span>
          <span>→</span>
        </a>
      `;
    }

    // 7. FILE UPLOAD
    if (compType === 'file-upload') {
      return `
        <div class="live-comp-upload" style="${containerStyle} width: 340px; border: 2px dashed #D1D5DB; border-radius: 10px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
          <span style="font-size: 28px; color: #C2410C;">☁</span>
          <strong style="font-size: 14px; color: #111827;">Upload a file</strong>
          <span style="font-size: 12px; color: #6B7280;">Drag and drop SVG, PNG, or JSON up to 10MB</span>
        </div>
      `;
    }

    // 8. MULTISELECT CHIP INPUT
    if (compType === 'multiselect') {
      return `
        <div class="live-comp-multiselect" style="${containerStyle} width: 320px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 10px; border: 1px solid #D1D5DB; border-radius: 6px; background: #fff;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: #FFEDD5; color: #9A3412; font-size: 12px; font-weight: 600;">
            Foundations ✕
          </span>
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: #FFEDD5; color: #9A3412; font-size: 12px; font-weight: 600;">
            Components ✕
          </span>
          <span style="color: #9CA3AF; font-size: 13px;">Add tag...</span>
        </div>
      `;
    }

    // 9. SIDEBAR MENU ITEM
    if (compType === 'sidebar-item' || compType === 'sidebar-switcher') {
      return `
        <div class="live-comp-sidebar-item" style="${containerStyle} width: 240px; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: #FFF7ED; color: #C2410C; font-weight: 600; font-size: 13px; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>◫</span>
            <span>${label || 'Components Catalog'}</span>
          </div>
          <span style="font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #FFEDD5; color: #9A3412;">19</span>
        </div>
      `;
    }

    // 10. CHECKBOX (Clean transparent container, box + label!)
    if (compType === 'checkbox') {
      const isChecked = p.checked !== false;
      return `
        <div class="live-comp-checkbox" style="${containerStyle} display: inline-flex; align-items: center; gap: 10px; cursor: pointer;">
          <div style="width: 20px; height: 20px; border-radius: 4px; background: ${isChecked ? (isHover ? '#9A3412' : '#C2410C') : '#FFFFFF'}; border: 1.5px solid ${isChecked ? (isHover ? '#9A3412' : '#C2410C') : (isHover ? '#9CA3AF' : '#D1D5DB')}; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: ${isFocus ? '0 0 0 3px rgba(194,65,12,0.25)' : 'none'};">
            ${isChecked ? '✓' : ''}
          </div>
          <span style="font-size: 14px; font-weight: 500; color: ${isDisabled ? '#9CA3AF' : '#1F2937'};">${label}</span>
        </div>
      `;
    }

    // 11. SWITCH / TOGGLE
    if (compType === 'switch') {
      const isChecked = p.checked !== false;
      return `
        <div class="live-comp-switch" style="${containerStyle} display: inline-flex; align-items: center; gap: 12px; cursor: pointer;">
          <div style="width: 44px; height: 24px; border-radius: 999px; background: ${isChecked ? (isHover ? '#9A3412' : '#C2410C') : '#D1D5DB'}; padding: 2px; display: flex; align-items: center; justify-content: ${isChecked ? 'flex-end' : 'flex-start'}; box-shadow: ${isFocus ? '0 0 0 3px rgba(194,65,12,0.25)' : 'none'}; transition: all 0.2s;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.25);"></div>
          </div>
          <span style="font-size: 14px; font-weight: 500; color: ${isDisabled ? '#9CA3AF' : '#1F2937'};">${label}</span>
        </div>
      `;
    }

    // 12. RADIO
    if (compType === 'radio') {
      const isSelected = p.checked !== false;
      return `
        <div class="live-comp-radio" style="${containerStyle} display: inline-flex; align-items: center; gap: 10px; cursor: pointer;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: #FFFFFF; border: 2px solid ${isSelected ? (isHover ? '#9A3412' : '#C2410C') : (isHover ? '#9CA3AF' : '#D1D5DB')}; display: flex; align-items: center; justify-content: center; box-shadow: ${isFocus ? '0 0 0 3px rgba(194,65,12,0.25)' : 'none'};">
            ${isSelected ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #C2410C;"></div>' : ''}
          </div>
          <span style="font-size: 14px; font-weight: 500; color: ${isDisabled ? '#9CA3AF' : '#1F2937'};">${label}</span>
        </div>
      `;
    }

    // 13. INPUT FIELD / TEXTAREA
    if (compType === 'input' || compType === 'date-input') {
      return `
        <div class="live-comp-input" style="${containerStyle} display: flex; flex-direction: column; gap: 6px; width: 280px;">
          <label style="font-size: 12px; font-weight: 600; color: #4B5563;">${label}</label>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: #FFFFFF; border: 1px solid ${isFocus ? '#C2410C' : '#D1D5DB'}; box-shadow: ${isFocus ? '0 0 0 3px rgba(194,65,12,0.2)' : 'none'};">
            <span style="color: #6B7280; font-size: 13px;">${compType === 'date-input' ? 'YYYY-MM-DD' : 'Enter value...'}</span>
            <span style="opacity: 0.6;">${compType === 'date-input' ? '📅' : '✎'}</span>
          </div>
        </div>
      `;
    }

    // 14. MODAL / DIALOG
    if (compType === 'modal') {
      return `
        <div class="live-comp-modal" style="${containerStyle} width: 320px; border-radius: 12px; background: #FFFFFF; border: 1px solid #E5E7EB; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); padding: 18px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 15px; color: #111827;">${label}</strong>
            <span style="cursor: pointer; opacity: 0.6;">✕</span>
          </div>
          <p style="font-size: 13px; color: #6B7280; line-height: 1.5; margin: 0;">Modal action confirmation dialog.</p>
          <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 6px;">
            <button style="padding: 5px 12px; border-radius: 6px; border: 1px solid #D1D5DB; background: #fff; font-size: 12px; cursor: pointer;">Cancel</button>
            <button style="padding: 5px 14px; border-radius: 6px; border: none; background: #C2410C; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;">Confirm</button>
          </div>
        </div>
      `;
    }

    // 15. TABLE
    if (compType === 'table') {
      return `
        <div class="live-comp-table" style="${containerStyle} width: 360px; border-radius: 8px; border: 1px solid #E5E7EB; overflow: hidden; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
          <div style="display: flex; background: #F9FAFB; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #4B5563; border-bottom: 1px solid #E5E7EB;">
            <div style="flex: 1;">Column 1</div>
            <div style="flex: 1;">Category</div>
            <div style="flex: 1; text-align: right;">Status</div>
          </div>
          <div style="display: flex; padding: 9px 12px; font-size: 13px; color: #1F2937; border-bottom: 1px solid #F3F4F6;">
            <div style="flex: 1; font-weight: 500;">Item Alpha</div>
            <div style="flex: 1; color: #6B7280;">Foundation</div>
            <div style="flex: 1; text-align: right; color: #15803D;">Active</div>
          </div>
          <div style="display: flex; padding: 9px 12px; font-size: 13px; color: #1F2937;">
            <div style="flex: 1; font-weight: 500;">Item Beta</div>
            <div style="flex: 1; color: #6B7280;">Component</div>
            <div style="flex: 1; text-align: right; color: #15803D;">Active</div>
          </div>
        </div>
      `;
    }

    // 16. AVATAR
    if (compType === 'avatar') {
      return `
        <div class="live-comp-avatar" style="position: relative; width: 44px; height: 44px; border-radius: 50%; background: #C2410C; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          AJ
          <span style="position: absolute; bottom: 0; right: 0; width: 11px; height: 11px; border-radius: 50%; background: #10B981; border: 2px solid #fff;"></span>
        </div>
      `;
    }

    // 17. BADGE
    if (compType === 'badge') {
      return `
        <span class="live-comp-badge" style="${containerStyle} display: inline-flex; align-items: center; justify-content: center; line-height: 1;">
          ${label}
        </span>
      `;
    }

    // 18. TAB
    if (compType === 'tab') {
      return `
        <div class="live-comp-tab" style="${containerStyle} display: flex; gap: 14px; border-bottom: 2px solid #E5E7EB; padding-bottom: 2px;">
          <div style="padding: 6px 4px; font-weight: 600; color: #C2410C; border-bottom: 2px solid #C2410C; cursor: pointer;">${label}</div>
          <div style="padding: 6px 4px; font-weight: 500; color: #6B7280; cursor: pointer;">Inactive Tab</div>
        </div>
      `;
    }

    // 19. TOAST
    if (compType === 'toast') {
      return `
        <div class="live-comp-toast" style="${containerStyle} display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 280px; padding: 9px 12px; border-radius: 8px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; box-shadow: 0 4px 6px rgba(0,0,0,0.06);">
          <span>ℹ ${label}</span>
          <span style="cursor: pointer; opacity: 0.7;">✕</span>
        </div>
      `;
    }

    // Filter chip renderer (Requirement 32)
    if (compType === 'chip') {
      const isSelected = p.selected || isHover;
      return `
        <div class="live-comp-chip" style="${containerStyle} display: inline-flex; align-items: center; gap: 6px; padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px; border-radius: ${styles.cornerRadius}px; background: ${styles.hasFill ? styles.bg : 'transparent'}; color: ${styles.textColor}; border: ${styles.hasBorder ? `${styles.borderWidth}px ${styles.borderStyle} ${styles.borderColor}` : '1px solid #D1D5DB'}; font-size: ${styles.fontSize}px; font-weight: ${styles.fontWeight}; height: ${styles.heightMode === 'fixed' ? styles.customHeight + 'px' : 'auto'}; cursor: pointer;">
          ${p.showIcon || p.hasLeftIcon ? '<span style="font-size: 12px; opacity: 0.8;">✦</span>' : ''}
          <span>${label}</span>
          <span style="font-size: 11px; opacity: 0.6; margin-left: 2px;">✕</span>
        </div>
      `;
    }

    // BOOTSTRAP 5 ACCORDION (Requirement 39 & URL Reference)
    if (compType === 'accordion') {
      return `
        <div class="live-comp-accordion bs5-accordion" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '500px'}; max-width: 100%; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; overflow: hidden; background: #FFFFFF; box-shadow: ${styles.shadow || '0 2px 8px -2px rgba(0,0,0,0.06)'};">
          <!-- Accordion Item 1 (Expanded / Active) -->
          <div class="accordion-item" style="border-bottom: 1px solid #E5E7EB;">
            <button class="accordion-button active-accordion-header" type="button" data-accordion-index="0" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #FFF7ED; color: #C2410C; border: none; font-size: ${styles.fontSize}px; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.2s ease;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px; opacity: 0.9;">✦</span>
                <span>${label || 'Accordion Item #1'}</span>
              </span>
              <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg); transition: transform 0.2s ease;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="accordion-body" style="padding: 14px 18px 16px 18px; background: #FFFFFF; font-size: 13.5px; line-height: 1.6; color: #4B5563; border-top: 1px solid #FED7AA;">
              <strong>${label || 'Accordion Item #1'}.</strong> Designed per Bootstrap 5 component standards. This section displays collapsible content panels with rich text, inputs, or nested lists.
            </div>
          </div>

          <!-- Accordion Item 2 (Collapsed) -->
          <div class="accordion-item" style="border-bottom: 1px solid #E5E7EB;">
            <button class="accordion-button collapsed-accordion-header" type="button" data-accordion-index="1" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #FFFFFF; color: #1F2937; border: none; font-size: ${styles.fontSize}px; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.2s ease;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px; color: #9CA3AF;">•</span>
                <span>Accordion Item #2 (Collapsible)</span>
              </span>
              <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg); transition: transform 0.2s ease;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <!-- Accordion Item 3 (Collapsed) -->
          <div class="accordion-item">
            <button class="accordion-button collapsed-accordion-header" type="button" data-accordion-index="2" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #FFFFFF; color: #1F2937; border: none; font-size: ${styles.fontSize}px; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.2s ease;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px; color: #9CA3AF;">•</span>
                <span>Accordion Item #3 (Collapsible)</span>
              </span>
              <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg); transition: transform 0.2s ease;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    // BOOTSTRAP 5 BREADCRUMB (Requirement 5 & URL Reference)
    if (compType === 'breadcrumb') {
      return `
        <nav aria-label="breadcrumb" class="live-comp-breadcrumb bs5-breadcrumb" style="${containerStyle} display: inline-flex; align-items: center; padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px; background: ${styles.hasFill ? styles.bg : '#FFFFFF'}; border: ${styles.hasBorder ? `${styles.borderWidth}px ${styles.borderStyle} ${styles.borderColor}` : '1px solid #E5E7EB'}; border-radius: ${styles.cornerRadius}px; box-shadow: ${styles.shadow || '0 1px 3px rgba(0,0,0,0.05)'}; font-size: ${styles.fontSize}px;">
          <ol class="breadcrumb-list" style="display: flex; align-items: center; list-style: none; margin: 0; padding: 0; gap: 8px; flex-wrap: wrap;">
            <li class="breadcrumb-item" style="display: flex; align-items: center; gap: 6px;">
              <a href="javascript:void(0)" style="color: #C2410C; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                <span>Home</span>
              </a>
              <span class="breadcrumb-divider" style="color: #9CA3AF; font-size: 12px; margin-left: 2px;">/</span>
            </li>
            <li class="breadcrumb-item" style="display: flex; align-items: center; gap: 6px;">
              <a href="javascript:void(0)" style="color: #C2410C; text-decoration: none; font-weight: 500;">
                <span>Components</span>
              </a>
              <span class="breadcrumb-divider" style="color: #9CA3AF; font-size: 12px; margin-left: 2px;">/</span>
            </li>
            <li class="breadcrumb-item active" aria-current="page" style="display: flex; align-items: center; color: #6B7280; font-weight: 600;">
              <span>${label || 'Data'}</span>
            </li>
          </ol>
        </nav>
      `;
    }

    // BOOTSTRAP 5 PROGRESS BAR (Requirement 58)
    if (compType === 'progress-bar') {
      return `
        <div class="live-comp-progress bs5-progress-wrap" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '400px'}; max-width: 100%; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
            <span style="font-weight: 600; color: #1F2937;">${label || 'Sync Progress'}</span>
            <span style="font-weight: 700; color: #C2410C;">68%</span>
          </div>
          <div class="progress-track" style="width: 100%; height: 12px; background: #E5E7EB; border-radius: 999px; overflow: hidden; position: relative; box-shadow: inset 0 1px 2px rgba(0,0,0,0.06);">
            <div class="progress-bar-fill" style="width: 68%; height: 100%; background: linear-gradient(90deg, #EA580C 0%, #C2410C 100%); border-radius: 999px; transition: width 0.3s ease;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #9CA3AF;">
            <span>0% Initialized</span>
            <span>Step 3 of 4</span>
            <span>100% Complete</span>
          </div>
        </div>
      `;
    }

    // BOOTSTRAP 5 ALERT / FEEDBACK MESSAGE (Requirement 56)
    if (compType === 'feedback-message') {
      return `
        <div class="live-comp-alert bs5-alert" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '460px'}; max-width: 100%; display: flex; align-items: flex-start; gap: 12px; padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px; background: ${styles.hasFill ? styles.bg : '#FFF7ED'}; border: 1px solid ${styles.borderColor || '#FDBA74'}; border-radius: ${styles.cornerRadius}px; box-shadow: ${styles.shadow || '0 2px 6px rgba(0,0,0,0.04)'}; color: #9A3412;">
          <div style="font-size: 18px; line-height: 1; flex-shrink: 0; color: #C2410C; margin-top: 2px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style="flex: 1; font-size: ${styles.fontSize}px;">
            <strong style="display: block; font-size: 14px; color: #9A3412; margin-bottom: 3px;">${label || 'Attention Required'}</strong>
            <span style="font-size: 13px; color: #7C2D12; line-height: 1.5;">This alert follows Bootstrap 5 specs to provide contextual status notifications and user alerts.</span>
          </div>
          <button style="background: none; border: none; font-size: 14px; color: #9A3412; opacity: 0.7; cursor: pointer; padding: 2px 4px; line-height: 1;" title="Dismiss alert">✕</button>
        </div>
      `;
    }

    // BOOTSTRAP 5 SKELETON LOADER / PLACEHOLDER (Requirement 57)
    if (compType === 'skeleton-loader') {
      return `
        <div class="live-comp-skeleton bs5-placeholder-card" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '360px'}; max-width: 100%; padding: 20px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite;"></div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
              <div style="width: 65%; height: 14px; border-radius: 4px; background: #E5E7EB;"></div>
              <div style="width: 40%; height: 10px; border-radius: 4px; background: #F3F4F6;"></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px;">
            <div style="width: 100%; height: 11px; border-radius: 4px; background: #F3F4F6;"></div>
            <div style="width: 90%; height: 11px; border-radius: 4px; background: #F3F4F6;"></div>
            <div style="width: 75%; height: 11px; border-radius: 4px; background: #F3F4F6;"></div>
          </div>
        </div>
      `;
    }

    // EMPTY STATE (Requirement 55)
    if (compType === 'empty-state') {
      return `
        <div class="live-comp-empty-state" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '420px'}; max-width: 100%; padding: 32px 24px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #FFF7ED; display: flex; align-items: center; justify-content: center; color: #C2410C; margin-bottom: 4px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h4 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0;">${label || 'No Components Found'}</h4>
          <p style="font-size: 13px; color: #6B7280; line-height: 1.5; margin: 0; max-width: 320px;">Your design system project is ready for new components. Create or sync to start assembling pages.</p>
          <button style="margin-top: 6px; padding: 8px 18px; border-radius: 6px; background: #C2410C; color: #FFFFFF; border: none; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">+ Create First Component</button>
        </div>
      `;
    }

    // RATING (Requirement 31)
    if (compType === 'rating') {
      return `
        <div class="live-comp-rating" style="${containerStyle} display: inline-flex; align-items: center; gap: 10px; padding: 6px 14px; border-radius: 8px; background: #FFFFFF; border: 1px solid #E5E7EB; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; gap: 3px;">
            ${[1, 2, 3, 4, 5].map(star => `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${star <= 4 ? '#F59E0B' : 'none'}" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer;">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            `).join('')}
          </div>
          <strong style="font-size: 14px; color: #1F2937;">4.8</strong>
          <span style="font-size: 12px; color: #6B7280;">(128 reviews)</span>
        </div>
      `;
    }

    // BOOTSTRAP 5 OFFCANVAS / DRAWER (Requirements 35 & 36)
    if (compType === 'drawer') {
      return `
        <div class="live-comp-drawer bs5-offcanvas" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '340px'}; max-width: 100%; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
            <strong style="font-size: 14px; color: #111827;">${label || 'Side Panel Drawer'}</strong>
            <span style="cursor: pointer; opacity: 0.6; font-size: 13px;">✕</span>
          </div>
          <div style="padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: #4B5563;">
            <p style="margin: 0;">Offcanvas panel providing contextual details and action controls.</p>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; font-weight: 600; color: #374151;">Configuration Title</label>
              <input type="text" value="Default Layout" readonly style="padding: 6px 10px; border-radius: 6px; border: 1px solid #D1D5DB; font-size: 12px; background: #F9FAFB;" />
            </div>
          </div>
          <div style="padding: 12px 18px; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 8px; background: #F9FAFB;">
            <button style="padding: 5px 12px; border-radius: 6px; border: 1px solid #D1D5DB; background: #FFFFFF; font-size: 12px; cursor: pointer;">Cancel</button>
            <button style="padding: 5px 14px; border-radius: 6px; border: none; background: #C2410C; color: #FFFFFF; font-size: 12px; font-weight: 600; cursor: pointer;">Apply</button>
          </div>
        </div>
      `;
    }

    // BOOTSTRAP 5 POPOVER (Requirement 37)
    if (compType === 'popover') {
      return `
        <div class="live-comp-popover bs5-popover" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '280px'}; max-width: 100%; position: relative; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F3F4F6; padding-bottom: 6px;">
            <strong style="font-size: 13.5px; color: #111827;">${label || 'Popover Header'}</strong>
            <span style="font-size: 12px; color: #9CA3AF; cursor: pointer;">✕</span>
          </div>
          <p style="font-size: 12.5px; color: #4B5563; line-height: 1.5; margin: 0;">Contextual popup overlay anchored to an element displaying rich guidance or additional inputs.</p>
          <div style="display: flex; justify-content: flex-end; padding-top: 4px;">
            <a href="javascript:void(0)" style="font-size: 12px; font-weight: 600; color: #C2410C; text-decoration: none;">Learn more →</a>
          </div>
        </div>
      `;
    }

    // BOOTSTRAP 5 TOOLTIP (Requirement 38)
    if (compType === 'tooltip') {
      return `
        <div class="live-comp-tooltip bs5-tooltip" style="${containerStyle} display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #1F2937; color: #FFFFFF; border-radius: 6px; font-size: 12px; font-weight: 500; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); position: relative;">
          <span>✦</span>
          <span>${label || 'Tooltip guidance text'}</span>
        </div>
      `;
    }

    // BOOTSTRAP 5 LIST GROUP (Requirements 44 & 45)
    if (compType === 'list') {
      return `
        <div class="live-comp-list bs5-list-group" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '360px'}; max-width: 100%; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; overflow: hidden; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #E5E7EB; background: #FFF7ED;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 14px; color: #C2410C;">✦</span>
              <div>
                <strong style="font-size: 13.5px; color: #9A3412; display: block;">${label || 'Primary Active Item'}</strong>
                <span style="font-size: 11.5px; color: #C2410C;">Selected List Group Entry</span>
              </div>
            </div>
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #C2410C; color: #FFFFFF; font-weight: 600;">Active</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #E5E7EB; background: #FFFFFF;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 14px; color: #9CA3AF;">•</span>
              <div>
                <strong style="font-size: 13px; color: #1F2937; display: block;">Secondary List Item</strong>
                <span style="font-size: 11.5px; color: #6B7280;">Standard Entry</span>
              </div>
            </div>
            <span style="font-size: 12px; color: #9CA3AF;">›</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #FFFFFF;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 14px; color: #9CA3AF;">•</span>
              <div>
                <strong style="font-size: 13px; color: #1F2937; display: block;">Tertiary List Item</strong>
                <span style="font-size: 11.5px; color: #6B7280;">Standard Entry</span>
              </div>
            </div>
            <span style="font-size: 12px; color: #9CA3AF;">›</span>
          </div>
        </div>
      `;
    }

    // BOOTSTRAP 5 CAROUSEL (Requirement 47)
    if (compType === 'carousel') {
      return `
        <div class="live-comp-carousel bs5-carousel" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '460px'}; max-width: 100%; border-radius: ${styles.cornerRadius}px; overflow: hidden; background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border: 1px solid #FED7AA; box-shadow: 0 4px 12px -2px rgba(194,65,12,0.12); position: relative; padding: 24px 28px; display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="font-size: 11px; padding: 3px 9px; border-radius: 999px; background: #C2410C; color: #FFFFFF; font-weight: 700; text-transform: uppercase;">Slide 1 of 3</span>
            <div style="display: flex; gap: 6px;">
              <button style="width: 28px; height: 28px; border-radius: 50%; background: #FFFFFF; border: 1px solid #FDBA74; color: #C2410C; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; font-weight: 700;">‹</button>
              <button style="width: 28px; height: 28px; border-radius: 50%; background: #FFFFFF; border: 1px solid #FDBA74; color: #C2410C; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; font-weight: 700;">›</button>
            </div>
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: #9A3412; margin: 0 0 6px 0;">${label || 'Terracotta Design System 2.0'}</h3>
            <p style="font-size: 13px; color: #7C2D12; margin: 0; line-height: 1.5;">Modern enterprise components synchronized between Figma and code.</p>
          </div>
          <div style="display: flex; justify-content: center; gap: 6px; padding-top: 8px;">
            <span style="width: 20px; height: 6px; border-radius: 999px; background: #C2410C;"></span>
            <span style="width: 6px; height: 6px; border-radius: 999px; background: #FDBA74;"></span>
            <span style="width: 6px; height: 6px; border-radius: 999px; background: #FDBA74;"></span>
          </div>
        </div>
      `;
    }

    // TAG / PILL (Requirement 51)
    if (compType === 'tag-pill') {
      return `
        <div class="live-comp-tag-pill" style="${containerStyle} display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #FFF7ED; border: 1px solid #FDBA74; color: #C2410C; font-size: 12px; font-weight: 600;">
          <span>✦</span>
          <span>${label || 'Tag Label'}</span>
          <span style="cursor: pointer; opacity: 0.6; margin-left: 2px;">✕</span>
        </div>
      `;
    }

    // DIVIDER (Requirement 52)
    if (compType === 'divider') {
      return `
        <div class="live-comp-divider" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '360px'}; max-width: 100%; display: flex; align-items: center; gap: 14px; margin: 8px 0;">
          <span style="flex: 1; height: 1px; background: #E5E7EB;"></span>
          <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">${label || 'OR'}</span>
          <span style="flex: 1; height: 1px; background: #E5E7EB;"></span>
        </div>
      `;
    }

    // LABEL (Requirement 53)
    if (compType === 'label') {
      return `
        <div class="live-comp-label" style="${containerStyle} display: inline-flex; align-items: center; gap: 4px; font-size: ${styles.fontSize}px; font-weight: 600; color: ${styles.textColor || '#374151'};">
          <span>${label || 'Form Field Label'}</span>
          <span style="color: #DC2626;" title="Required">*</span>
          <span style="color: #9CA3AF; font-size: 12px; cursor: help;" title="Field guidance information">ⓘ</span>
        </div>
      `;
    }

    // ACTION BAR (Requirement 4)
    if (compType === 'action-bar') {
      return `
        <div class="live-comp-action-bar" style="${containerStyle} width: ${styles.widthMode === 'fixed' ? styles.customWidth + 'px' : '440px'}; max-width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: ${styles.cornerRadius}px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #1F2937;">
            <span style="color: #C2410C;">✦</span>
            <span>${label || '3 items selected'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button style="padding: 6px 12px; border-radius: 6px; border: 1px solid #D1D5DB; background: #FFFFFF; font-size: 12px; font-weight: 500; cursor: pointer;">Duplicate</button>
            <button style="padding: 6px 14px; border-radius: 6px; border: none; background: #C2410C; color: #FFFFFF; font-size: 12px; font-weight: 600; cursor: pointer;">Export</button>
          </div>
        </div>
      `;
    }

        // 20. BUTTON / COMPACT BUTTON / DEFAULT (Requirement 32: Honors no background, typography, height)
    const isPrimary = p.variant !== 'secondary' && p.variant !== 'outline' && p.variant !== 'ghost';
    const bgCol = isPrimary ? (isHover ? '#9A3412' : '#C2410C') : (p.variant === 'secondary' ? (isHover ? '#E5E7EB' : '#F3F4F6') : '#FFFFFF');
    const txtCol = styles.textColor || (isPrimary ? '#FFFFFF' : (p.variant === 'outline' ? '#C2410C' : '#1F2937'));
    const bdrCol = isPrimary ? '#9A3412' : (p.variant === 'outline' ? '#C2410C' : '#E5E7EB');

    return `
      <button class="live-comp-button" style="${containerStyle} display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px; border-radius: ${styles.cornerRadius}px; background: ${styles.hasFill ? styles.bg : 'transparent'}; color: ${txtCol}; border: ${styles.hasBorder ? `${styles.borderWidth}px ${styles.borderStyle} ${styles.borderColor}` : (styles.hasFill ? 'none' : `1.5px solid ${bdrCol}`)}; font-size: ${styles.fontSize}px; font-weight: ${styles.fontWeight}; height: ${styles.heightMode === 'fixed' ? styles.customHeight + 'px' : 'auto'}; cursor: pointer; box-shadow: ${isFocus ? '0 0 0 3px rgba(194,65,12,0.35)' : styles.shadow}; transition: all 0.15s ease;">
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
    let html = '';
    if (store.currentSubTab === 'preview') {
      html = this.renderPreviewSubTab(comp);
    } else if (store.currentSubTab === 'props') {
      html = this.renderPropsView(comp);
    } else if (store.currentSubTab === 'anatomy') {
      html = this.renderAnatomyView(comp);
    } else if (store.currentSubTab === 'variants') {
      html = this.renderVariantsView(comp);
    } else {
      html = this.renderPreviewSubTab(comp);
    }

    const isIconComp = (comp && (comp.id === 'icon' || (comp.name || '').toLowerCase().includes('icon')));
    if (this.iconStudioOpen && isIconComp) {
      html += this.renderIconStudioModal(comp);
    }
    return html;
  }

  // =========================================================================
  // ICON STUDIO & GENERATOR MODAL TOOL (Requirement: Open tool & add to library)
  // =========================================================================
  renderIconStudioModal(comp) {
    const customIcons = store.getCustomIcons ? store.getCustomIcons() : [];
    const allIcons = [...STANDARD_ICONS, ...customIcons];
    const activeIconId = (comp.activeProps && comp.activeProps.iconSwap) || comp.icon || 'home';
    const activeIconObj = allIcons.find(i => i.id === activeIconId) || allIcons[0];

    const currentCat = this.iconCategoryFilter || 'All';
    const filteredIcons = currentCat === 'All'
      ? allIcons
      : (currentCat === 'Custom'
          ? customIcons
          : allIcons.filter(i => (i.category || '').toLowerCase() === currentCat.toLowerCase()));

    const categories = ['All', 'Navigation', 'Actions', 'Commerce', 'Devices', 'Media', 'Security', 'Communication', 'Custom'];

    return `
      <div class="icon-studio-modal-backdrop" id="icon-studio-modal-backdrop" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 20px; box-sizing: border-box;">
        <div class="icon-studio-modal-window" style="background: #FFFFFF; border-radius: 16px; border: 1px solid #E5E7EB; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: 780px; max-width: 96vw; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Modal Header -->
          <div style="padding: 16px 22px; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between; background: #FAFAFA;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 9px; background: #FFF7ED; border: 1px solid #FDBA74; display: flex; align-items: center; justify-content: center; color: #C2410C; font-size: 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ✨
              </div>
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px;">Icon Studio & Generator Tool</h3>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #6B7280;">Generate custom vector icons, browse project library, and add icons to your design system</p>
              </div>
            </div>
            <button type="button" id="btn-close-icon-studio" style="background: transparent; border: none; font-size: 20px; color: #64748B; cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1; transition: background 0.15s ease;" title="Close">✕</button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div style="padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px;">
            
            <!-- 1. CREATE & GENERATE NEW ICON FIRST (User Requirement: create icon first then option to add in library/component) -->
            <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 15px;">✨</span>
                  <strong style="font-size: 13.5px; color: #9A3412;">Generate New Vector Icon</strong>
                </div>
                <span style="font-size: 11px; color: #C2410C; background: #FFEDD5; padding: 2px 8px; border-radius: 999px; font-weight: 600;">Vector AI Generator</span>
              </div>

              <!-- Input Row -->
              <div style="display: flex; gap: 8px;">
                <input type="text" id="custom-icon-prompt" placeholder="Enter icon concept (e.g. rocket, target, biometric, shield-secure, battery, drone...)" style="flex: 1; padding: 8px 12px; font-size: 13px; border: 1px solid #FDBA74; border-radius: 8px; background: #FFFFFF; outline: none; box-sizing: border-box;" />
                <button type="button" id="btn-generate-icon-preview" class="adsc-btn btn-primary compact" style="padding: 8px 16px; font-size: 13px; font-weight: 600; white-space: nowrap; background: #C2410C; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer;">
                  ✨ Generate Preview
                </button>
              </div>

              <!-- Generated Icon Preview & Option to Add to Library -->
              <div id="generated-icon-preview-box" style="display: ${this.lastGeneratedIcon ? 'flex' : 'none'}; align-items: center; justify-content: space-between; background: #FFFFFF; border: 1px solid #FDBA74; border-radius: 10px; padding: 12px 16px; gap: 16px; box-shadow: 0 2px 8px rgba(194, 65, 12, 0.08);">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div id="preview-icon-glyph-mount" style="width: 48px; height: 48px; border-radius: 10px; background: #FFF7ED; border: 1px solid #FED7AA; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${this.lastGeneratedIcon ? `
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                        ${this.lastGeneratedIcon.svg}
                      </svg>
                    ` : ''}
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <label style="font-size: 11px; color: #6B7280; font-weight: 600;">Icon Name:</label>
                      <input type="text" id="generated-icon-name-input" value="${this.lastGeneratedIcon ? this.lastGeneratedIcon.name : ''}" style="font-weight: 700; font-size: 13px; color: #111827; border: 1px solid #D1D5DB; border-radius: 6px; padding: 3px 8px; width: 150px; outline: none;" />
                      <span id="preview-icon-category-badge" style="font-size: 11px; color: #6B7280; background: #F3F4F6; padding: 2px 7px; border-radius: 4px;">${this.lastGeneratedIcon ? this.lastGeneratedIcon.category : 'Custom'}</span>
                    </div>
                    <span style="font-size: 11px; color: #059669; font-weight: 600; display: block; margin-top: 4px;">✓ Vector geometry ready for component export</span>
                  </div>
                </div>

                <!-- Explicit button: Add in Icon Library / Component (User Requirement) -->
                <button type="button" id="btn-add-to-icon-library" class="adsc-btn btn-primary compact" style="padding: 9px 16px; font-size: 12.5px; font-weight: 700; background: #15803D; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <span>➕ Add to Icon Library / Component</span>
                </button>
              </div>
            </div>

            <!-- 2. BROWSE & SEARCH ICON LIBRARY -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="font-size: 14px; color: #111827;">Icon Library</strong>
                  <span id="icon-library-count" style="font-size: 11.5px; padding: 2px 8px; border-radius: 999px; background: #FFF7ED; color: #C2410C; font-weight: 700; border: 1px solid #FED7AA;">
                    ${allIcons.length} Icons
                  </span>
                </div>

                <div style="display: flex; align-items: center; gap: 8px; flex: 1; max-width: 320px;">
                  <div style="position: relative; width: 100%;">
                    <span style="position: absolute; left: 8px; top: 7px; font-size: 12px; color: #9CA3AF; pointer-events: none;">🔍</span>
                    <input type="text" id="icon-library-search" placeholder="Search ${allIcons.length} SVG icons by name..." style="width: 100%; padding: 6px 10px 6px 28px; font-size: 12px; border: 1px solid #D1D5DB; border-radius: 6px; outline: none; box-sizing: border-box;" />
                  </div>
                </div>
              </div>

              <!-- Category Filter Pills -->
              <div class="icon-category-filter-bar" style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${categories.map(cat => `
                  <button type="button" class="icon-cat-filter-btn ${currentCat === cat ? 'active' : ''}" data-category="${cat}" style="font-size: 11px; padding: 3px 10px; border-radius: 999px; border: 1px solid ${currentCat === cat ? '#C2410C' : '#E5E7EB'}; background: ${currentCat === cat ? '#C2410C' : '#FFFFFF'}; color: ${currentCat === cat ? '#FFFFFF' : '#4B5563'}; font-weight: ${currentCat === cat ? '600' : '400'}; cursor: pointer; transition: all 0.15s ease;">
                    ${cat} ${cat === 'Custom' && customIcons.length ? `(${customIcons.length})` : ''}
                  </button>
                `).join('')}
              </div>

              <!-- 100+ Icons Grid -->
              <div id="icon-library-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; max-height: 250px; overflow-y: auto; padding: 10px; border: 1px solid #E5E7EB; border-radius: 10px; background: #F9FAFB;">
                ${filteredIcons.map(icon => `
                  <div class="icon-library-tile ${activeIconId === icon.id ? 'selected' : ''}" data-icon-id="${icon.id}" data-category="${icon.category || 'Custom'}" title="${icon.name} (${icon.category || 'General'}) - Click to set as active Icon" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 10px 4px; border-radius: 8px; background: #FFFFFF; border: 1px solid ${activeIconId === icon.id ? '#C2410C' : '#E5E7EB'}; cursor: pointer; transition: all 0.15s ease; box-shadow: ${activeIconId === icon.id ? '0 0 0 2px rgba(194, 65, 12, 0.2)' : 'none'};">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${activeIconId === icon.id ? '#C2410C' : '#1F2937'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; pointer-events: none; flex-shrink: 0;">
                      ${icon.svg}
                    </svg>
                    <span class="icon-tile-name" style="font-size: 10px; color: ${activeIconId === icon.id ? '#C2410C' : '#4B5563'}; font-weight: ${activeIconId === icon.id ? '700' : '500'}; text-align: center; max-width: 72px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none;">${icon.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div style="padding: 12px 22px; border-top: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between; background: #FAFAFA;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6B7280;">
              <span>Active glyph: <strong style="color: #111827;">${activeIconObj ? activeIconObj.name : 'None'}</strong></span>
              <span>•</span>
              <span>Click any icon in the library to set it as active component</span>
            </div>
            <button type="button" id="btn-close-icon-studio-footer" class="adsc-btn btn-secondary compact" style="padding: 6px 16px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer;">Done</button>
          </div>
        </div>
      </div>
    `;
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
  // SUBTAB: VARIANTS VIEW (Requirements 33 & 34: Formula & 2D Matrix matching Image 2)
  renderVariantsView(comp) {
    const compType = this.detectCompType(comp);
    const variants = getComponentSpecificVariants(comp);

    // Compute axis breakdown for formula display
    const propKeys = Object.keys(variants[0]?.properties || {}).filter(k => k !== 'compType' && !k.startsWith('_') && k !== 'label');
    const axes = propKeys.map(k => {
      const vals = new Set(variants.map(v => v.properties?.[k]));
      return { name: k, count: vals.size };
    });

    const formulaString = axes.map(a => `${a.name} (${a.count})`).join(' × ');

    return `
      <div class="variants-component-specific-layout">
        <!-- 1. COMPONENT-SPECIFIC VARIANT FORMULA BANNER -->
        <div class="variant-formula-banner-card">
          <div class="formula-top-row">
            <div class="formula-badge-cluster">
              <span class="formula-sparkle">❖</span>
              <h3 class="formula-title">${comp.name} Variants Matrix (${variants.length} defined)</h3>
            </div>
            <button class="adsc-btn btn-figma compact" id="btn-push-all-variants-figma">
              ⚡ Push All ${variants.length} Variants to Figma Page "${comp.name}"
            </button>
          </div>

          <div class="formula-math-display">
            <span class="math-label">The Variant Calculation Formula:</span>
            <div class="math-equation-badge">
              Total Variants = P₁ × P₂ × P₃ × … × Pₙ
            </div>
            <div class="math-sub-desc">
              Formula for <strong>${comp.name}</strong>: ${formulaString ? `${formulaString} = ` : ''}<strong>${variants.length} Variants</strong>
            </div>
          </div>

          <div class="formula-axes-pills-row">
            ${axes.map((a, idx) => `
              <span class="axis-pill"><strong>${a.name}:</strong> ${a.count}</span>
              ${idx < axes.length - 1 ? '<span class="axis-multiply">×</span>' : ''}
            `).join('')}
            <span class="axis-equals">=</span>
            <span class="axis-result-pill">${variants.length} Component Variants</span>
          </div>
        </div>

        <!-- 2. AUTHENTIC COMPONENT VARIANT CARDS (Requirement 19, 21 & User Feedback 1) -->
        <div class="variants-grid-cards">
          ${variants.map((v, i) => {
            const previewCell = this.generateLiveComponentPreviewHtml(
              {
                ...comp,
                activeProps: { ...comp.activeProps, ...v.properties },
                styles: v.styles ? { ...(comp.styles || {}), ...v.styles } : comp.styles
              },
              v.compType || compType,
              v.properties?.state || v.properties?.State || 'Rest'
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

  attachListeners(comp) {
    const styles = this.getComponentComputedStyles(comp, store.activeState || 'Rest');

    // 1. Resizing & Layout: Width & Width Hug (Requirement 32)
    const widthInput = this.container.querySelector('#figma-width-input');
    const widthHugBtn = this.container.querySelector('#btn-toggle-w-hug');
    if (widthInput) {
      const handleWidth = (e) => {
        const val = parseInt(e.target.value) || 320;
        store.updateLayoutStyles({ customWidth: val, widthMode: 'fixed' }, false);
        if (widthHugBtn) widthHugBtn.classList.remove('active');
        this.updateLiveCanvasPreview();
      };
      widthInput.addEventListener('input', handleWidth);
      widthInput.addEventListener('change', handleWidth);
    }
    if (widthHugBtn) {
      widthHugBtn.addEventListener('click', () => {
        const isHug = comp.styles?.widthMode === 'hug';
        const nextMode = isHug ? 'fixed' : 'hug';
        store.updateLayoutStyles({ widthMode: nextMode }, false);
        widthHugBtn.classList.toggle('active', nextMode === 'hug');
        this.updateLiveCanvasPreview();
      });
    }

    // 2. Resizing & Layout: Height & Height Hug (Requirement 32)
    const heightInput = this.container.querySelector('#figma-height-input');
    const heightHugBtn = this.container.querySelector('#btn-toggle-h-hug');
    if (heightInput) {
      const handleHeight = (e) => {
        const val = parseInt(e.target.value) || 36;
        store.updateLayoutStyles({ customHeight: val, heightMode: 'fixed' }, false);
        if (heightHugBtn) heightHugBtn.classList.remove('active');
        this.updateLiveCanvasPreview();
      };
      heightInput.addEventListener('input', handleHeight);
      heightInput.addEventListener('change', handleHeight);
    }
    if (heightHugBtn) {
      heightHugBtn.addEventListener('click', () => {
        const isHug = comp.styles?.heightMode === 'hug';
        const nextMode = isHug ? 'fixed' : 'hug';
        store.updateLayoutStyles({ heightMode: nextMode }, false);
        heightHugBtn.classList.toggle('active', nextMode === 'hug');
        this.updateLiveCanvasPreview();
      });
    }

    // 3. Resizing & Layout: Padding Y (Top/Bottom) & Padding X (Left/Right) (Requirement 32)
    const padYInput = this.container.querySelector('#figma-pad-y-input');
    if (padYInput) {
      const handlePadY = (e) => {
        const val = Math.max(0, parseInt(e.target.value) || 0);
        const curPad = comp.styles?.padding || styles.padding || { top: 8, right: 14, bottom: 8, left: 14 };
        store.updateLayoutStyles({ padding: { ...curPad, top: val, bottom: val } }, false);
        this.updateLiveCanvasPreview();
      };
      padYInput.addEventListener('input', handlePadY);
      padYInput.addEventListener('change', handlePadY);
    }

    const padXInput = this.container.querySelector('#figma-pad-x-input');
    if (padXInput) {
      const handlePadX = (e) => {
        const val = Math.max(0, parseInt(e.target.value) || 0);
        const curPad = comp.styles?.padding || styles.padding || { top: 8, right: 14, bottom: 8, left: 14 };
        store.updateLayoutStyles({ padding: { ...curPad, left: val, right: val } }, false);
        this.updateLiveCanvasPreview();
      };
      padXInput.addEventListener('input', handlePadX);
      padXInput.addEventListener('change', handlePadX);
    }

    // 4. Resizing & Layout: Gap
    const gapInput = this.container.querySelector('#figma-gap-input');
    if (gapInput) {
      const handleGap = (e) => {
        const val = Math.max(0, parseInt(e.target.value) || 0);
        store.updateLayoutStyles({ gap: val }, false);
        this.updateLiveCanvasPreview();
      };
      gapInput.addEventListener('input', handleGap);
      gapInput.addEventListener('change', handleGap);
    }

    // 5. Appearance: Opacity
    const opacityInput = this.container.querySelector('#figma-opacity-input');
    if (opacityInput) {
      const handleOpacity = (e) => {
        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
        store.updateLayoutStyles({ opacity: val }, false);
        this.updateLiveCanvasPreview();
      };
      opacityInput.addEventListener('input', handleOpacity);
      opacityInput.addEventListener('change', handleOpacity);
    }

    // 6. Appearance: Corner Radius
    const radiusInput = this.container.querySelector('#figma-radius-input');
    if (radiusInput) {
      const handleRadius = (e) => {
        const val = Math.max(0, parseInt(e.target.value) || 0);
        store.updateLayoutStyles({ cornerRadius: val }, false);
        this.updateLiveCanvasPreview();
      };
      radiusInput.addEventListener('input', handleRadius);
      radiusInput.addEventListener('change', handleRadius);
    }

    // 7. Typography: Font Size, Weight, Text Color (Requirement 32)
    const fontSizeInput = this.container.querySelector('#figma-font-size-input');
    if (fontSizeInput) {
      const handleFontSize = (e) => {
        const val = Math.max(8, parseInt(e.target.value) || 14);
        store.updateLayoutStyles({ fontSize: val }, false);
        this.updateLiveCanvasPreview();
      };
      fontSizeInput.addEventListener('input', handleFontSize);
      fontSizeInput.addEventListener('change', handleFontSize);
    }

    const fontWeightSelect = this.container.querySelector('#figma-font-weight-select');
    if (fontWeightSelect) {
      fontWeightSelect.addEventListener('change', (e) => {
        store.updateLayoutStyles({ fontWeight: e.target.value }, false);
        this.updateLiveCanvasPreview();
      });
    }

    const textColorPicker = this.container.querySelector('#figma-text-color-picker');
    const textColorHex = this.container.querySelector('#figma-text-color-hex');
    if (textColorPicker && textColorHex) {
      textColorPicker.addEventListener('input', (e) => {
        textColorHex.value = e.target.value;
        store.updateLayoutStyles({ textColor: e.target.value }, false);
        this.updateLiveCanvasPreview();
      });
      textColorHex.addEventListener('input', (e) => {
        if (e.target.value.startsWith('#') && (e.target.value.length === 4 || e.target.value.length === 7)) {
          textColorPicker.value = e.target.value;
        }
        store.updateLayoutStyles({ textColor: e.target.value }, false);
        this.updateLiveCanvasPreview();
      });
    }

    // 8. Fill (Background): Eye, Remove/Add, Color Picker, Hex, Background Image (Requirement 29 & 32)
    const fillEyeBtn = this.container.querySelector('#btn-toggle-fill-eye');
    const fillRemoveBtn = this.container.querySelector('#btn-toggle-fill-remove');
    const toggleFill = () => {
      const cur = comp.styles?.hasFill !== undefined ? comp.styles.hasFill : styles.hasFill;
      store.updateLayoutStyles({ hasFill: !cur });
      this.render();
    };
    if (fillEyeBtn) fillEyeBtn.addEventListener('click', toggleFill);
    if (fillRemoveBtn) fillRemoveBtn.addEventListener('click', toggleFill);

    const fillPicker = this.container.querySelector('#figma-fill-picker');
    const fillHex = this.container.querySelector('#figma-fill-hex');
    if (fillPicker && fillHex) {
      fillPicker.addEventListener('input', (e) => {
        fillHex.value = e.target.value;
        store.updateLayoutStyles({ bg: e.target.value, hasFill: true }, false);
        this.updateLiveCanvasPreview();
      });
      fillHex.addEventListener('input', (e) => {
        if (e.target.value.startsWith('#') && (e.target.value.length === 4 || e.target.value.length === 7)) {
          fillPicker.value = e.target.value;
        }
        store.updateLayoutStyles({ bg: e.target.value, hasFill: true }, false);
        this.updateLiveCanvasPreview();
      });
    }

    const bgImageInput = this.container.querySelector('#figma-bg-image-input');
    if (bgImageInput) {
      const handleBgImage = (e) => {
        store.updateLayoutStyles({ bgImage: e.target.value.trim() }, false);
        this.updateLiveCanvasPreview();
      };
      bgImageInput.addEventListener('input', handleBgImage);
      bgImageInput.addEventListener('change', handleBgImage);
    }

    // 9. Stroke (Border): Eye, Remove/Add, Color, Weight, Style (Requirement 29)
    const strokeEyeBtn = this.container.querySelector('#btn-toggle-stroke-eye');
    const strokeRemoveBtn = this.container.querySelector('#btn-toggle-stroke-remove');
    const toggleStroke = () => {
      const cur = comp.styles?.hasBorder !== undefined ? comp.styles.hasBorder : styles.hasBorder;
      store.updateLayoutStyles({ hasBorder: !cur });
      this.render();
    };
    if (strokeEyeBtn) strokeEyeBtn.addEventListener('click', toggleStroke);
    if (strokeRemoveBtn) strokeRemoveBtn.addEventListener('click', toggleStroke);

    const strokePicker = this.container.querySelector('#figma-stroke-picker');
    const strokeHex = this.container.querySelector('#figma-stroke-hex');
    if (strokePicker && strokeHex) {
      strokePicker.addEventListener('input', (e) => {
        strokeHex.value = e.target.value;
        store.updateLayoutStyles({ borderColor: e.target.value, hasBorder: true }, false);
        this.updateLiveCanvasPreview();
      });
      strokeHex.addEventListener('input', (e) => {
        if (e.target.value.startsWith('#') && (e.target.value.length === 4 || e.target.value.length === 7)) {
          strokePicker.value = e.target.value;
        }
        store.updateLayoutStyles({ borderColor: e.target.value, hasBorder: true }, false);
        this.updateLiveCanvasPreview();
      });
    }

    const strokeWeightInput = this.container.querySelector('#figma-stroke-weight');
    if (strokeWeightInput) {
      const handleWeight = (e) => {
        const val = Math.max(0, parseInt(e.target.value) || 0);
        store.updateLayoutStyles({ borderWidth: val, hasBorder: true }, false);
        this.updateLiveCanvasPreview();
      };
      strokeWeightInput.addEventListener('input', handleWeight);
      strokeWeightInput.addEventListener('change', handleWeight);
    }

    const strokeStyleSelect = this.container.querySelector('#figma-stroke-style');
    if (strokeStyleSelect) {
      strokeStyleSelect.addEventListener('change', (e) => {
        store.updateLayoutStyles({ borderStyle: e.target.value }, false);
        this.updateLiveCanvasPreview();
      });
    }

    // 10. Effects & Shadow
    const shadowSelect = this.container.querySelector('#figma-shadow-select');
    if (shadowSelect) {
      shadowSelect.addEventListener('change', (e) => {
        store.updateLayoutStyles({ shadow: e.target.value }, false);
        this.updateLiveCanvasPreview();
      });
    }
    const toggleEffectsBtn = this.container.querySelector('#btn-toggle-effects');
    if (toggleEffectsBtn) {
      toggleEffectsBtn.addEventListener('click', () => {
        const cur = comp.styles?.shadow || 'none';
        const next = cur === 'none' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none';
        store.updateLayoutStyles({ shadow: next });
        this.render();
      });
    }

    // 11. Content & Live Props
    const labelInput = this.container.querySelector('#live-prop-label');
    if (labelInput) {
      const handleLabel = (e) => {
        if (!comp.activeProps) comp.activeProps = {};
        comp.activeProps.label = e.target.value;
        store.saveComponents();
        this.updateLiveCanvasPreview();
      };
      labelInput.addEventListener('input', handleLabel);
      labelInput.addEventListener('change', handleLabel);
    }

    const checkedInput = this.container.querySelector('#live-prop-checked');
    if (checkedInput) {
      checkedInput.addEventListener('change', (e) => {
        if (!comp.activeProps) comp.activeProps = {};
        comp.activeProps.checked = e.target.checked;
        store.saveComponents();
        this.updateLiveCanvasPreview();
      });
    }

    const showIconInput = this.container.querySelector('#live-prop-show-icon');
    if (showIconInput) {
      showIconInput.addEventListener('change', (e) => {
        if (!comp.activeProps) comp.activeProps = {};
        comp.activeProps.showIcon = e.target.checked;
        store.saveComponents();
        this.updateLiveCanvasPreview();
      });
    }

    const disabledInput = this.container.querySelector('#live-prop-disabled');
    if (disabledInput) {
      disabledInput.addEventListener('change', (e) => {
        if (!comp.activeProps) comp.activeProps = {};
        comp.activeProps.disabled = e.target.checked;
        store.saveComponents();
        this.updateLiveCanvasPreview();
      });
    }

    // 12. Edit as Draft toggle (Requirement 24)
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

    // 13. Docs link navigation (Requirement 25)
    const docsLinkBtn = this.container.querySelector('#btn-docs-link');
    if (docsLinkBtn) {
      docsLinkBtn.addEventListener('click', () => {
        store.setView('docs');
      });
    }

    // 14. Interactive State Pills in Preview Subtab
    const statePills = this.container.querySelectorAll('.stage-state-pill');
    statePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const st = pill.getAttribute('data-state');
        store.setActiveState(st);
        this.render();
      });
    });

    // 15. Figma Sync Buttons
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

    // 16. Title rename input
    const nameInput = this.container.querySelector('#component-name-input');
    if (nameInput) {
      nameInput.addEventListener('change', (e) => {
        store.renameActiveComponent(e.target.value.trim());
      });
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') nameInput.blur();
      });
    }

    // 17. Subtabs click (Preview, Properties, Anatomy, Variants - Requirement 21)
    const subTabBtns = this.container.querySelectorAll('.subtabs-left .subtab-btn');
    subTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSubTab = btn.getAttribute('data-subtab');
        store.setSubTab(targetSubTab);
        this.render();
      });
    });

    // 18. Anatomy internal subtabs (JSON / Visual Tree)
    const anatomySubTabBtns = this.container.querySelectorAll('.anatomy-view-switcher button');
    anatomySubTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.anatomySubTab = btn.getAttribute('data-anatomy-subtab');
        this.render();
      });
    });

    // Interactive Bootstrap 5 Accordion collapse toggle
    const accordionButtons = this.container.querySelectorAll('.bs5-accordion .accordion-button');
    accordionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.accordion-item');
        if (!item) return;
        const body = item.querySelector('.accordion-body');
        const chevron = btn.querySelector('.accordion-chevron');
        const isOpen = body && body.style.display !== 'none';
        if (isOpen) {
          if (body) body.style.display = 'none';
          btn.style.backgroundColor = '#FFFFFF';
          btn.style.color = '#1F2937';
          if (chevron) chevron.style.transform = 'rotate(0deg)';
          if (chevron) chevron.setAttribute('stroke', '#6B7280');
        } else {
          let b = body;
          if (!b) {
            b = document.createElement('div');
            b.className = 'accordion-body';
            b.style.cssText = 'padding: 14px 18px 16px 18px; background: #FFFFFF; font-size: 13.5px; line-height: 1.6; color: #4B5563; border-top: 1px solid #FED7AA;';
            b.innerHTML = '<strong>' + (btn.textContent.trim()) + '.</strong> Collapsible details, form controls, or nested parameters loaded in real-time.';
            item.appendChild(b);
          } else {
            b.style.display = 'block';
          }
          btn.style.backgroundColor = '#FFF7ED';
          btn.style.color = '#C2410C';
          if (chevron) chevron.style.transform = 'rotate(180deg)';
          if (chevron) chevron.setAttribute('stroke', '#C2410C');
        }
      });
    });

    // 19. Icon Library Studio listeners
    this.attachIconStudioListeners(comp);

    // 20. Properties Subtab (Kinds / Library Tabs)
    const kindTabBtns = this.container.querySelectorAll('.kinds-tab-btn');
    kindTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-kindstab');
        store.setKindsTab(tab);
        this.render();
      });
    });

    // 21. Kinds tiles in Properties subtab (Clicking opens PropModal)
    const kindTiles = this.container.querySelectorAll('.kind-tile-btn');
    kindTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const kind = tile.getAttribute('data-kind');
        this.propModal.open(kind);
      });
    });

    // 22. Often Added Pills (+ Disabled, + State, + Selected)
    const oftenPills = this.container.querySelectorAll('.often-pill-btn');
    oftenPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const propName = pill.getAttribute('data-add-prop');
        let kind = 'on_off';
        if (propName === 'State') kind = 'state';
        this.propModal.open(kind, propName);
      });
    });

    // 23. Property card click / menu dots (Edit property in PropModal)
    const propRows = this.container.querySelectorAll('.prop-card-row, .btn-prop-menu');
    propRows.forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const propId = row.getAttribute('data-prop-id') || row.closest('.prop-card-row')?.getAttribute('data-prop-id');
        const p = comp.props?.find(x => x.id === propId);
        if (p) {
          this.propModal.open(p.kind, p.name, p);
        }
      });
    });

    // 24. Open Foundation Studio button from Library drawer
    const openTokensBtn = this.container.querySelector('#btn-open-tokens-studio');
    if (openTokensBtn) {
      openTokensBtn.addEventListener('click', () => {
        store.setView('tokens');
      });
    }

    // 25. Copy & Download JSON Contract in Code column
    const copyContractBtns = this.container.querySelectorAll('#btn-copy-contract-json');
    copyContractBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const jsonContract = this.generateComponentContract(comp);
        try {
          await navigator.clipboard.writeText(JSON.stringify(jsonContract, null, 2));
          bridgeClient.notifyUser('✓ Copied JSON Contract to clipboard!', 'success');
        } catch (e) {
          bridgeClient.notifyUser('Failed to copy to clipboard', 'error');
        }
      });
    });

    const downloadContractBtns = this.container.querySelectorAll('#btn-download-contract-json');
    downloadContractBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const jsonContract = this.generateComponentContract(comp);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonContract, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `${comp.id || 'component'}-contract.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        bridgeClient.notifyUser('✓ Downloaded JSON Contract file', 'success');
      });
    });

    // 26. Code panel toggle (btn-stage-code and close buttons)
    const toggleCodeBtn = this.container.querySelector('#btn-stage-code');
    if (toggleCodeBtn) {
      toggleCodeBtn.addEventListener('click', () => {
        this.codePanelOpen = !this.codePanelOpen;
        this.render();
      });
    }

    const closeCodeColBtns = this.container.querySelectorAll('#btn-close-code-col, #btn-close-anatomy-code');
    closeCodeColBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.codePanelOpen = false;
        this.render();
      });
    });

    // 27. Figma Top Status Bar & Anchored Dropdown Menu
    const figmaStatusBtn = this.container.querySelector('#btn-stage-figma');
    if (figmaStatusBtn) {
      figmaStatusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.figmaMenuOpen = !this.figmaMenuOpen;
        this.render();
      });
    }

    const menuPushScope = this.container.querySelector('#btn-menu-push-project-scope');
    if (menuPushScope) {
      menuPushScope.addEventListener('click', async () => {
        this.figmaMenuOpen = false;
        await bridgeClient.pushProjectScopeComponents();
      });
    }

    const menuPushActive = this.container.querySelector('#btn-menu-push-figma');
    if (menuPushActive) {
      menuPushActive.addEventListener('click', async () => {
        this.figmaMenuOpen = false;
        await bridgeClient.pushComponent(comp);
      });
    }

    const menuCopyJson = this.container.querySelector('#btn-menu-copy-figma-json');
    if (menuCopyJson) {
      menuCopyJson.addEventListener('click', async () => {
        this.figmaMenuOpen = false;
        const payload = bridgeClient.generateFigmaSyncPayload(comp);
        try {
          await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
          bridgeClient.notifyUser('✓ Copied Figma payload JSON to clipboard!', 'success');
        } catch (e) {
          bridgeClient.notifyUser('Failed to copy to clipboard', 'error');
        }
      });
    }

    // 28. Anatomy subtab: Add a part tiles & cards
    const addPartTiles = this.container.querySelectorAll('.add-part-tile');
    addPartTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        this.anatomyModal.open();
      });
    });

    const anatomyCards = this.container.querySelectorAll('.anatomy-card-row, .node-menu-dots, #btn-add-anatomy-part');
    anatomyCards.forEach(card => {
      card.addEventListener('click', () => {
        this.anatomyModal.open();
      });
    });
  }

  attachIconStudioListeners(comp) {
    if (!comp) return;
    const isIconComp = (comp.id === 'icon' || (comp.name || '').toLowerCase().includes('icon'));
    if (!isIconComp) return;

    // 1. Triggers to OPEN the tool modal
    const openBtns = [
      this.container.querySelector('#btn-trigger-icon-studio'),
      this.container.querySelector('#btn-open-icon-studio-header'),
      this.container.querySelector('#btn-open-icon-studio-aside')
    ];
    openBtns.forEach(btn => {
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.iconStudioOpen = true;
          this.render();
        });
      }
    });

    // Quick icon dropdown in inspector aside
    const quickSelect = this.container.querySelector('#quick-icon-swap-select');
    if (quickSelect && !quickSelect.dataset.bound) {
      quickSelect.dataset.bound = 'true';
      quickSelect.addEventListener('change', (e) => {
        const selectedId = quickSelect.value;
        const selectedName = quickSelect.options[quickSelect.selectedIndex].text;
        if (!comp.activeProps) comp.activeProps = {};
        comp.activeProps.iconSwap = selectedId;
        comp.activeProps.label = selectedName;
        store.saveComponents();
        bridgeClient.notifyUser(`Selected icon "${selectedName}"`, 'info');
        this.render();
      });
    }

    // If modal is NOT open, nothing more to bind inside modal
    if (!this.iconStudioOpen) return;

    // 2. Modal Close triggers
    const closeBtn = this.container.querySelector('#btn-close-icon-studio');
    const closeFooterBtn = this.container.querySelector('#btn-close-icon-studio-footer');
    const backdrop = this.container.querySelector('#icon-studio-modal-backdrop');

    const closeModal = () => {
      this.iconStudioOpen = false;
      this.render();
    };

    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = 'true';
      closeBtn.addEventListener('click', closeModal);
    }
    if (closeFooterBtn && !closeFooterBtn.dataset.bound) {
      closeFooterBtn.dataset.bound = 'true';
      closeFooterBtn.addEventListener('click', closeModal);
    }
    if (backdrop && !backdrop.dataset.bound) {
      backdrop.dataset.bound = 'true';
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    }

    // 3. Create & Generate Preview trigger
    const genBtn = this.container.querySelector('#btn-generate-icon-preview');
    const promptInput = this.container.querySelector('#custom-icon-prompt');
    if (genBtn && promptInput && !genBtn.dataset.bound) {
      genBtn.dataset.bound = 'true';
      const handleGeneratePreview = (e) => {
        if (e) e.preventDefault();
        const val = promptInput.value.trim();
        if (!val) {
          bridgeClient.notifyUser('Please enter an icon concept (e.g. rocket, target, biometric...)', 'warning');
          return;
        }
        const newIcon = generateIconFromPrompt(val);
        this.lastGeneratedIcon = newIcon;
        this.render();
        bridgeClient.notifyUser(`Generated "${newIcon.name}" preview. Click "Add to Icon Library" to save.`, 'info');
      };
      genBtn.addEventListener('click', handleGeneratePreview);
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleGeneratePreview();
        }
      });
    }

    // 4. Explicit: Add to Icon Library / Component trigger
    const addToLibBtn = this.container.querySelector('#btn-add-to-icon-library');
    const nameInput = this.container.querySelector('#generated-icon-name-input');
    if (addToLibBtn && !addToLibBtn.dataset.bound) {
      addToLibBtn.dataset.bound = 'true';
      addToLibBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.lastGeneratedIcon) return;
        if (nameInput && nameInput.value.trim()) {
          this.lastGeneratedIcon.name = nameInput.value.trim();
        }
        store.addCustomIcon(this.lastGeneratedIcon);
        if (!comp.activeProps) comp.activeProps = {};
        comp.activeProps.iconSwap = this.lastGeneratedIcon.id;
        comp.activeProps.label = this.lastGeneratedIcon.name;
        store.saveComponents();
        bridgeClient.notifyUser(`✓ Added "${this.lastGeneratedIcon.name}" to Icon Library & set as active component!`, 'success');
        this.lastGeneratedIcon = null;
        this.render();
      });
    }

    // 5. Search Filter in library grid
    const searchInput = this.container.querySelector('#icon-library-search');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      const handleSearch = (e) => {
        const q = e.target.value.toLowerCase().trim();
        const grid = this.container.querySelector('#icon-library-grid');
        if (!grid) return;
        const tiles = grid.querySelectorAll('.icon-library-tile');
        let matchCount = 0;
        tiles.forEach(tile => {
          const tName = tile.querySelector('.icon-tile-name')?.textContent?.toLowerCase() || '';
          const tId = (tile.getAttribute('data-icon-id') || '').toLowerCase();
          const tCat = (tile.getAttribute('data-category') || '').toLowerCase();
          const matchesText = !q || tName.includes(q) || tId.includes(q) || tCat.includes(q);
          const currentCat = (this.iconCategoryFilter || 'All').toLowerCase();
          const matchesCat = currentCat === 'all' || tCat === currentCat || (currentCat === 'custom' && tile.dataset.isCustom === 'true');
          const isVisible = matchesText && matchesCat;
          tile.style.display = isVisible ? 'flex' : 'none';
          if (isVisible) matchCount++;
        });
        const countBadge = this.container.querySelector('#icon-library-count');
        if (countBadge) {
          countBadge.textContent = q ? `${matchCount} found` : `${tiles.length} Icons`;
        }
      };
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keyup', handleSearch);
    }

    // 6. Category filter pill buttons
    const catBtns = this.container.querySelectorAll('.icon-cat-filter-btn');
    catBtns.forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => {
          this.iconCategoryFilter = btn.getAttribute('data-category');
          this.render();
        });
      }
    });

    // 7. Click any icon tile to set as active component
    const tiles = this.container.querySelectorAll('.icon-library-tile');
    tiles.forEach(tile => {
      if (!tile.dataset.bound) {
        tile.dataset.bound = 'true';
        tile.addEventListener('click', () => {
          const iconId = tile.getAttribute('data-icon-id');
          const iconName = tile.querySelector('.icon-tile-name')?.textContent || iconId;
          if (!comp.activeProps) comp.activeProps = {};
          comp.activeProps.iconSwap = iconId;
          comp.activeProps.label = iconName;
          store.saveComponents();
          bridgeClient.notifyUser(`Selected icon "${iconName}" as active component`, 'info');
          this.render();
        });
      }
    });
  }

}
