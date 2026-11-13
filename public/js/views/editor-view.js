// AI Design System Creator - Exact Reference Editor View (Images 1, 3, 5, 6, 7 References)
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient } from '../bridge-client.js';

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
    const variantsCount = comp.id === 'button' ? 47 : (comp.id === 'filter-chip' ? 1 : 12);

    this.container.innerHTML = `
      <div class="editor-stage-layout">
        <!-- Stage Top Title Row (Line 1) -->
        <div class="editor-stage-header">
          <div class="editor-title-row">
            <input type="text" id="component-name-input" class="component-name-pill" value="${comp.name}" placeholder="Component name" />
          </div>

          <div class="editor-stage-top-right">
            ${comp.id === 'button' ? `
              <button class="stage-ghost-btn" id="btn-edit-draft">Edit as draft</button>
              <button class="stage-ghost-btn" id="btn-docs-link">Docs ↗</button>
            ` : ''}
          </div>
        </div>

        <!-- Sub-tabs Navigation Row (Line 2): Subtabs on Left, Figma/Code/Preview on Extreme Right (Requirement 11) -->
        <div class="editor-subtabs-row">
          <div class="subtabs-left">
            <button class="subtab-btn ${store.currentSubTab === 'props' ? 'active' : ''}" data-subtab="props">
              Props (${propCount})
            </button>
            <button class="subtab-btn ${store.currentSubTab === 'anatomy' ? 'active' : ''}" data-subtab="anatomy">
              Anatomy (${anatomyCount})
            </button>
            <button class="subtab-btn ${store.currentSubTab === 'variants' ? 'active' : ''}" data-subtab="variants">
              Variants ${variantsCount ? `(${variantsCount})` : ''}
            </button>
          </div>

          <!-- Extreme Right: Figma, Code, Preview (Requirement 11) -->
          <div class="subtabs-extreme-right">
            <div class="stage-views-segmented-pill">
              <button class="stage-view-btn figma-btn-trigger ${this.figmaMenuOpen ? 'active' : ''}" id="btn-stage-figma" title="Sync with Figma Desktop Plugin">
                Figma
              </button>
              <button class="stage-view-btn ${this.codePanelOpen ? 'active' : ''}" id="btn-stage-code" title="Toggle Code JSON Contract (3rd right column)">
                Code
              </button>
              <button class="stage-view-btn" id="btn-stage-preview" title="Open Interactive Sandbox Preview Popup">
                Preview
              </button>
            </div>

            <!-- Anchored Figma Dropdown (Images 5 & 6) -->
            ${this.figmaMenuOpen ? `
              <div class="figma-anchored-dropdown" id="figma-dropdown-menu">
                <div class="figma-menu-item disabled">
                  <span class="menu-main-label">Pull from Figma</span>
                  <span class="menu-sub-label">Not one of the library's components</span>
                </div>
                <div class="figma-menu-item active-push" id="btn-menu-push-figma">
                  <span class="menu-main-label">Push to Figma</span>
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

  countAnatomyNodes(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      node.children.forEach(c => { count += this.countAnatomyNodes(c); });
    }
    return count;
  }

  renderSubTabContent(comp) {
    if (store.currentSubTab === 'props') {
      return this.renderPropsView(comp);
    } else if (store.currentSubTab === 'anatomy') {
      return this.renderAnatomyView(comp);
    } else if (store.currentSubTab === 'variants') {
      return this.renderVariantsView(comp);
    }
    return '';
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
                <button class="json-tab-btn active">JSON</button>
                <button class="json-tab-btn" id="btn-preview-from-json">Preview</button>
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
                <button class="json-tab-btn" id="btn-preview-from-anatomy-json">Preview</button>
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
  // SUBTAB 3: VARIANTS MATRIX VIEW (Image 7 Reference)
  // =========================================================
  renderVariantsView(comp) {
    const sizes = ['lg', 'md', 'sm'];
    const variants = [
      { name: 'Primary', tones: ['Neutral', 'Danger'] },
      { name: 'Secondary', tones: ['Neutral', 'Danger'] },
      { name: 'Tertiary', tones: ['Neutral', 'Danger'] }
    ];
    const states = ['Rest', 'Focus', 'Hover', 'Press', 'Loading'];

    return `
      <div class="variants-full-matrix-layout">
        <!-- Left: Full Multi-Dimensional Variant Matrix -->
        <main class="variants-matrix-main">
          <div class="matrix-summary-header">
            <h3 class="combinations-title">360 combinations (144 not drawn)</h3>
            <p class="combinations-subtitle">◆ 116 where values change each other</p>
          </div>

          <div class="matrix-table-scroll-wrap">
            <table class="reference-matrix-table">
              <thead>
                <!-- Super-header: Disabled off vs Disabled on -->
                <tr>
                  <th class="th-stub" colspan="4"></th>
                  <th class="th-super-group" colspan="5">Disabled off</th>
                  <th class="th-super-group" colspan="5">Disabled on</th>
                </tr>
                <!-- Sub-header: States -->
                <tr>
                  <th class="th-stub" colspan="4"></th>
                  ${states.map(st => `<th class="th-state-col ${st === 'Focus' ? 'highlight-focus' : ''}">${st}</th>`).join('')}
                  ${states.map(st => `<th class="th-state-col disabled-mode">${st}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <!-- Group 1: Show icon off -->
                ${this.renderMatrixIconGroup(comp, false, sizes, variants, states)}
                <!-- Group 2: Show icon on -->
                ${this.renderMatrixIconGroup(comp, true, sizes, variants, states)}
              </tbody>
            </table>
          </div>
        </main>

        <!-- Right: Inspection Drawer (Image 7) -->
        <aside class="variants-inspection-drawer">
          <div class="drawer-header-title">
            <h4>Size is ${this.selectedMatrixCell.size}, State is ${this.selectedMatrixCell.state}</h4>
          </div>

          <table class="inspection-delta-table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Default</th>
                <th>Here</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="part-name">Focus ring</td>
                <td class="val-default">Absent</td>
                <td class="val-here ${this.selectedMatrixCell.state === 'Focus' ? 'is-green' : ''}">
                  ${this.selectedMatrixCell.state === 'Focus' ? 'Present' : 'Absent'}
                </td>
              </tr>
              <tr>
                <td class="part-name">Content layout</td>
                <td class="val-default">Gap 8 8<br>Padding 12</td>
                <td class="val-here">
                  ${this.selectedMatrixCell.size === 'sm' ? 'Gap 4 4<br>Padding 8' : (this.selectedMatrixCell.size === 'lg' ? 'Gap 10 10<br>Padding 16' : 'Gap 8 8<br>Padding 12')}
                </td>
              </tr>
              <tr>
                <td class="part-name">Content minHeight</td>
                <td class="val-default">44</td>
                <td class="val-here">
                  ${this.selectedMatrixCell.size === 'sm' ? '36' : (this.selectedMatrixCell.size === 'lg' ? '48' : '44')}
                </td>
              </tr>
              <tr>
                <td class="part-name">Label text style</td>
                <td class="val-default">md-medium</td>
                <td class="val-here">
                  ${this.selectedMatrixCell.size === 'sm' ? 'sm-medium' : (this.selectedMatrixCell.size === 'lg' ? 'lg-medium' : 'md-medium')}
                </td>
              </tr>
            </tbody>
          </table>
        </aside>
      </div>
    `;
  }

  renderMatrixIconGroup(comp, showIcon, sizes, variants, states) {
    const totalGroupRows = sizes.length * variants.reduce((acc, v) => acc + v.tones.length, 0);
    let isFirstRowOfIconGroup = true;

    return sizes.map((sz) => {
      const sizeRowSpan = variants.reduce((acc, v) => acc + v.tones.length, 0);
      let isFirstRowOfSize = true;

      return variants.map((v) => {
        const variantRowSpan = v.tones.length;
        let isFirstRowOfVariant = true;

        return v.tones.map((tone) => {
          const rowHtml = `
            <tr class="matrix-data-row">
              ${isFirstRowOfIconGroup ? `
                <th class="th-icon-group" rowspan="${totalGroupRows}">
                  ${showIcon ? 'Show icon on' : 'Show icon off'}
                </th>
              ` : ''}

              ${isFirstRowOfSize ? `
                <th class="th-size-group" rowspan="${sizeRowSpan}">
                  ${sz}
                </th>
              ` : ''}

              ${isFirstRowOfVariant ? `
                <th class="th-variant-group" rowspan="${variantRowSpan}">
                  ${v.name}
                </th>
              ` : ''}

              <th class="th-tone-group">
                ${tone}
              </th>

              <!-- Cells for Disabled OFF -->
              ${states.map(st => {
                const isSelected = this.selectedMatrixCell.size === sz &&
                  this.selectedMatrixCell.variant === v.name &&
                  this.selectedMatrixCell.tone === tone &&
                  this.selectedMatrixCell.state === st &&
                  this.selectedMatrixCell.disabled === false &&
                  this.selectedMatrixCell.showIcon === showIcon;

                const marker = (st === 'Loading' && tone === 'Danger') ? '✕' : (st === 'Focus' || v.name === 'Primary' ? '◆' : '●');

                return `
                  <td class="cell-marker ${isSelected ? 'is-selected-cell' : ''}" 
                      data-sz="${sz}" data-var="${v.name}" data-tone="${tone}" data-st="${st}" data-dis="false" data-icon="${showIcon}">
                    ${isSelected ? '<span class="selected-cell-ring"></span>' : ''}
                    <span class="marker-glyph marker-${marker === '◆' ? 'diamond' : (marker === '●' ? 'dot' : 'cross')}">${marker}</span>
                  </td>
                `;
              }).join('')}

              <!-- Cells for Disabled ON -->
              ${states.map(st => {
                return `
                  <td class="cell-marker disabled-mode" data-sz="${sz}" data-var="${v.name}" data-tone="${tone}" data-st="${st}" data-dis="true" data-icon="${showIcon}">
                    <span class="marker-glyph marker-cross">✕</span>
                  </td>
                `;
              }).join('')}
            </tr>
          `;

          isFirstRowOfIconGroup = false;
          isFirstRowOfSize = false;
          isFirstRowOfVariant = false;

          return rowHtml;
        }).join('');
      }).join('');
    }).join('');
  }

  // =========================================================
  // LISTENERS & INTERACTIONS
  // =========================================================
  attachListeners(comp) {
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

    // Push to Figma action inside dropdown
    const pushMenuBtn = this.container.querySelector('#btn-menu-push-figma');
    if (pushMenuBtn) {
      pushMenuBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.figmaMenuOpen = false;
        await bridgeClient.pushComponent();
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
