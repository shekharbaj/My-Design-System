// AI Design System Creator - Multi-dimensional Variant Matrix View
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';
import { bridgeClient } from '../bridge-client.js';

export class MatrixView {
  constructor(containerEl) {
    this.container = containerEl;
    this.selectedCell = null;
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    store.subscribe('component:selected', () => {
      this.selectedCell = null;
      this.render();
    });
    store.subscribe('component:updated', () => this.render());
    store.subscribe('styles:updated', () => this.render());
  }

  render() {
    const comp = store.getActiveComponent();
    if (!comp) return;

    const matrixConfig = comp.matrixConfig || {
      rowProp: 'variant',
      rowValues: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      colProp: 'state',
      colValues: ['Rest', 'Hover', 'Focus', 'Press'],
      thirdProp: 'size',
      thirdValue: 'md'
    };

    const totalVariants = matrixConfig.rowValues.length * matrixConfig.colValues.length;

    this.container.innerHTML = `
      <div class="matrix-layout">
        <!-- Matrix Top Bar -->
        <div class="matrix-header-bar">
          <div class="matrix-title-area">
            <div class="matrix-badge-row">
              <h2 class="matrix-title">${comp.name} Variant Matrix</h2>
              <span class="matrix-count-badge">${totalVariants} Combinations</span>
            </div>
            <p class="matrix-subtitle">
              Interactive design token grid mapping <strong>${matrixConfig.rowProp}</strong> (${matrixConfig.rowValues.length}) 
              &times; <strong>${matrixConfig.colProp}</strong> (${matrixConfig.colValues.length}) 
              at size <strong>${matrixConfig.thirdValue || 'md'}</strong>
            </p>
          </div>

          <div class="matrix-actions-area">
            <div class="dimension-selector-group">
              <label class="dim-label">Size Context:</label>
              <select id="matrix-size-select" class="adsc-select compact">
                ${['sm', 'md', 'lg'].map(sz => `
                  <option value="${sz}" ${(matrixConfig.thirdValue || 'md') === sz ? 'selected' : ''}>${sz.toUpperCase()}</option>
                `).join('')}
              </select>
            </div>

            <button class="adsc-btn btn-primary" id="btn-push-matrix-figma">
              ${ICON_SVGS.figma}
              <span>Push Matrix to Figma</span>
            </button>
          </div>
        </div>

        <!-- Matrix Scrollable Canvas Table -->
        <div class="matrix-table-container">
          <table class="variant-matrix-table">
            <thead>
              <tr>
                <th class="matrix-corner-header">
                  <div class="corner-split">
                    <span class="corner-col-label">${matrixConfig.colProp.toUpperCase()} &rarr;</span>
                    <span class="corner-row-label">&darr; ${matrixConfig.rowProp.toUpperCase()}</span>
                  </div>
                </th>
                ${matrixConfig.colValues.map(colVal => `
                  <th class="matrix-col-header">
                    <div class="col-header-pill">
                      <span class="state-dot state-dot-${colVal.toLowerCase()}"></span>
                      <span>${colVal}</span>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${matrixConfig.rowValues.map(rowVal => `
                <tr>
                  <th class="matrix-row-header">
                    <div class="row-header-pill">
                      <span class="row-indicator"></span>
                      <span class="row-title">${rowVal}</span>
                    </div>
                  </th>
                  ${matrixConfig.colValues.map(colVal => {
                    const cellData = this.resolveCellData(comp, rowVal, colVal, matrixConfig.thirdValue || 'md');
                    const isSelected = this.selectedCell && 
                      this.selectedCell.row === rowVal && 
                      this.selectedCell.col === colVal;

                    return `
                      <td class="matrix-cell ${isSelected ? 'selected' : ''}" 
                          data-row="${rowVal}" 
                          data-col="${colVal}"
                          data-size="${matrixConfig.thirdValue || 'md'}">
                        <div class="matrix-cell-inner">
                          <!-- Mini preview -->
                          <div class="matrix-cell-preview">
                            ${this.renderCellComponent(comp, cellData)}
                          </div>

                          <!-- Token chips -->
                          <div class="matrix-cell-tokens">
                            <span class="token-color-dot" style="background-color: ${cellData.styles.bg}"></span>
                            <span class="token-hex">${cellData.styles.bg}</span>
                          </div>
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Bottom Drawer / Inspector for Selected Cell -->
        <div class="matrix-inspect-drawer ${this.selectedCell ? 'open' : 'collapsed'}" id="matrix-inspector">
          ${this.selectedCell ? this.renderCellInspector(comp, this.selectedCell) : `
            <div class="inspect-placeholder">
              <span>Click any variant cell in the matrix to inspect its design tokens & payload spec</span>
            </div>
          `}
        </div>
      </div>
    `;

    this.attachListeners(comp, matrixConfig);
  }

  attachListeners(comp, matrixConfig) {
    // Size dropdown change
    const sizeSelect = this.container.querySelector('#matrix-size-select');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        if (!comp.matrixConfig) comp.matrixConfig = {};
        comp.matrixConfig.thirdValue = e.target.value;
        store.saveComponents();
        this.render();
      });
    }

    // Push matrix to figma button
    const pushBtn = this.container.querySelector('#btn-push-matrix-figma');
    if (pushBtn) {
      pushBtn.addEventListener('click', () => {
        bridgeClient.pushComponent(comp);
      });
    }

    // Cell clicks
    const cells = this.container.querySelectorAll('.matrix-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const row = cell.getAttribute('data-row');
        const col = cell.getAttribute('data-col');
        const size = cell.getAttribute('data-size');

        cells.forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');

        this.selectedCell = {
          row,
          col,
          size,
          data: this.resolveCellData(comp, row, col, size)
        };

        const inspector = this.container.querySelector('#matrix-inspector');
        if (inspector) {
          inspector.className = 'matrix-inspect-drawer open';
          inspector.innerHTML = this.renderCellInspector(comp, this.selectedCell);
          this.attachInspectorEvents(comp);
        }
      });
    });
  }

  attachInspectorEvents(comp) {
    const closeBtn = this.container.querySelector('#btn-close-inspect');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectedCell = null;
        this.render();
      });
    }

    const testInSandboxBtn = this.container.querySelector('#btn-test-in-sandbox');
    if (testInSandboxBtn && this.selectedCell) {
      testInSandboxBtn.addEventListener('click', () => {
        store.updateActiveProp('variant', this.selectedCell.row);
        store.updateActiveProp('size', this.selectedCell.size);
        store.setActiveState(this.selectedCell.col);
        store.setView('preview');
      });
    }
  }

  resolveCellData(comp, variantVal, stateVal, sizeVal) {
    let variantStyles = comp.styles?.variants?.[variantVal]?.[stateVal] ||
      comp.styles?.variants?.[variantVal]?.['Rest'] || {
        bg: '#3B82F6',
        text: '#FFFFFF',
        border: '#2563EB',
        shadow: 'none'
      };

    const sizeStyles = comp.styles?.sizes?.[sizeVal] || {
      padding: comp.styles?.padding || { top: 8, right: 14, bottom: 8, left: 14 },
      fontSize: 13,
      iconSize: 14,
      cornerRadius: comp.styles?.cornerRadius || 8
    };

    return {
      variant: variantVal,
      state: stateVal,
      size: sizeVal,
      styles: {
        bg: variantStyles.bg,
        text: variantStyles.text,
        border: variantStyles.border,
        shadow: variantStyles.shadow,
        padding: sizeStyles.padding || comp.styles?.padding,
        gap: comp.styles?.gap ?? 6,
        align: comp.styles?.align || 'center',
        cornerRadius: sizeStyles.cornerRadius !== undefined ? sizeStyles.cornerRadius : (comp.styles?.cornerRadius ?? 8),
        borderWidth: comp.styles?.borderWidth ?? 1,
        fontSize: sizeStyles.fontSize || 13,
        iconSize: sizeStyles.iconSize || 14
      }
    };
  }

  renderCellComponent(comp, cellData) {
    const s = cellData.styles;
    const p = s.padding || { top: 6, right: 12, bottom: 6, left: 12 };

    const styleStr = `
      background-color: ${s.bg};
      color: ${s.text};
      border: ${s.borderWidth}px solid ${s.border};
      border-radius: ${s.cornerRadius >= 9999 ? '9999px' : s.cornerRadius + 'px'};
      padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px;
      gap: ${s.gap}px;
      box-shadow: ${s.shadow};
      font-size: ${s.fontSize}px;
    `;

    if (comp.id === 'button' || comp.id === 'compact-button') {
      return `
        <div class="matrix-rendered-elem button-elem" style="${styleStr}">
          <span class="icon-wrap" style="display:flex;align-items:center;">${ICON_SVGS.sparkles}</span>
          <span style="font-weight:600;">${comp.name}</span>
        </div>
      `;
    }

    if (comp.id.includes('chip') || comp.id.includes('badge') || comp.id.includes('tag')) {
      return `
        <div class="matrix-rendered-elem chip-elem" style="${styleStr}">
          <span class="icon-wrap">${ICON_SVGS.tag}</span>
          <span style="font-weight:500;">${comp.activeProps?.label || comp.name}</span>
        </div>
      `;
    }

    if (comp.id === 'avatar') {
      return `
        <div class="matrix-rendered-elem" style="${styleStr}; width:32px; height:32px; border-radius:50%; font-weight:700;">
          <span>AJ</span>
        </div>
      `;
    }

    if (comp.id === 'checkbox') {
      return `
        <div class="matrix-rendered-elem" style="display:flex; align-items:center; gap:6px;">
          <div style="width:16px; height:16px; border-radius:3px; background-color:${s.bg}; border:${s.borderWidth}px solid ${s.border}; color:${s.text}; display:flex; align-items:center; justify-content:center;">
            ${ICON_SVGS.check}
          </div>
          <span style="font-size:11px; font-weight:500;">Check</span>
        </div>
      `;
    }

    if (comp.id === 'switch-toggle') {
      return `
        <div class="matrix-rendered-elem" style="width:34px; height:18px; border-radius:9999px; background-color:${s.bg}; border:${s.borderWidth}px solid ${s.border}; padding:2px; display:flex; align-items:center; justify-content:flex-end;">
          <div style="width:12px; height:12px; border-radius:50%; background:#fff;"></div>
        </div>
      `;
    }

    if (comp.id.includes('card') || comp.id.includes('modal') || comp.id.includes('dialog')) {
      return `
        <div class="matrix-rendered-elem modal-mini" style="${styleStr}; width:130px; text-align:left;">
          <div style="font-weight:600; font-size:11px; margin-bottom:2px;">${cellData.variant}</div>
          <div style="font-size:9px; opacity:0.8;">${cellData.state}</div>
        </div>
      `;
    }

    if (comp.id.includes('dropdown') || comp.id.includes('select') || comp.id.includes('menu')) {
      return `
        <div class="matrix-rendered-elem dropdown-mini" style="${styleStr}">
          <span style="font-size:11px;">${cellData.variant}</span>
          <span class="icon-wrap">${ICON_SVGS['chevron-down']}</span>
        </div>
      `;
    }

    return `
      <div class="matrix-rendered-elem generic-elem" style="${styleStr}">
        <span class="icon-wrap" style="display:flex;">${ICON_SVGS[comp.icon] || ICON_SVGS.layers}</span>
        <span>${cellData.variant}</span>
      </div>
    `;
  }

  renderCellInspector(comp, cell) {
    const d = cell.data;
    const jsonSpec = JSON.stringify({
      variant: d.variant,
      state: d.col,
      size: d.size,
      tokens: {
        background: d.styles.bg,
        textColor: d.styles.text,
        borderColor: d.styles.border,
        borderWidth: d.styles.borderWidth + 'px',
        borderRadius: d.styles.cornerRadius + 'px',
        boxShadow: d.styles.shadow,
        padding: `${d.styles.padding.top}px ${d.styles.padding.right}px ${d.styles.padding.bottom}px ${d.styles.padding.left}px`,
        gap: d.styles.gap + 'px'
      }
    }, null, 2);

    return `
      <div class="cell-inspector-content">
        <div class="inspect-header-row">
          <div class="inspect-title-meta">
            <h4>Variant Token Contract: <code>${comp.id} [${d.variant} / ${d.col} / ${d.size}]</code></h4>
            <span class="inspect-badge">State: ${d.col}</span>
          </div>
          <div class="inspect-btn-group">
            <button class="adsc-btn btn-secondary compact" id="btn-test-in-sandbox">
              ${ICON_SVGS.eye}
              <span>Open in Sandbox</span>
            </button>
            <button class="adsc-btn-icon" id="btn-close-inspect" title="Close Drawer">
              ${ICON_SVGS.x}
            </button>
          </div>
        </div>

        <div class="inspect-body-split">
          <div class="inspect-tokens-view">
            <div class="token-row">
              <span class="t-name">Surface Fill:</span>
              <div class="t-val-pill">
                <span class="t-color-dot" style="background:${d.styles.bg}"></span>
                <code>${d.styles.bg}</code>
              </div>
            </div>
            <div class="token-row">
              <span class="t-name">Text Ink:</span>
              <div class="t-val-pill">
                <span class="t-color-dot" style="background:${d.styles.text}"></span>
                <code>${d.styles.text}</code>
              </div>
            </div>
            <div class="token-row">
              <span class="t-name">Border Stroke:</span>
              <div class="t-val-pill">
                <span class="t-color-dot" style="background:${d.styles.border}"></span>
                <code>${d.styles.border} (${d.styles.borderWidth}px)</code>
              </div>
            </div>
            <div class="token-row">
              <span class="t-name">Radius / Corner:</span>
              <code>${d.styles.cornerRadius}px</code>
            </div>
          </div>

          <div class="inspect-json-view">
            <pre class="json-code"><code>${jsonSpec}</code></pre>
          </div>
        </div>
      </div>
    `;
  }
}
