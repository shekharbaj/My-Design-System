// AI Design System Creator - Exact Match Interactive State Sandbox & Layout Inspector (Image 4 Reference)
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class SandboxModal {
  constructor() {
    this.modalEl = null;
    this.showIcon = true;
    this.activeState = 'Rest';
    this.stateDropdownOpen = false;
    this.direction = 'row';
    this.align = 'center';
    this.justify = 'center';
    this.gap = 4;
    this.paddingX = 12;
    this.paddingY = 8;
    this.widthMode = 'fit';
    this.heightMode = 'fit';
    this.corners = 999;
    this.bgColor = 'Colour/Control/Feedback/Primary';
  }

  open() {
    this.close();
    const comp = store.getActiveComponent();
    if (!comp) return;

    this.showIcon = comp.activeProps?.showIcon !== false;
    this.activeState = comp.activeProps?.state || store.activeState || 'Rest';

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'adsc-modal-backdrop sandbox-modal-backdrop';
    this.modalEl.innerHTML = this.renderContent(comp);

    document.body.appendChild(this.modalEl);
    this.attachEvents(comp);
  }

  renderContent(comp) {
    const states = ['Rest', 'Focus', 'Hover', 'Press'];

    return `
      <div class="sandbox-dialog-card" id="sandbox-dialog">
        <!-- Dialog Header -->
        <div class="sandbox-dialog-header">
          <h3 class="sandbox-title">${comp.name}</h3>
          <button class="sandbox-close-btn" id="btn-close-sandbox" title="Close">✕</button>
        </div>

        <!-- Dialog 3-Column Body -->
        <div class="sandbox-dialog-body">
          <!-- Left Panel: Properties Controls -->
          <aside class="sandbox-left-panel">
            <h4 class="panel-section-title">Properties</h4>

            <div class="sandbox-prop-row">
              <span class="sandbox-prop-name">Show icon</span>
              <label class="adsc-switch">
                <input type="checkbox" id="sandbox-toggle-show-icon" ${this.showIcon ? 'checked' : ''} />
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="sandbox-prop-row relative-dropdown-wrap">
              <span class="sandbox-prop-name">State</span>
              <div class="custom-state-dropdown-trigger" id="sandbox-state-trigger">
                <span>${this.activeState}</span>
                <span class="dropdown-chevron">▼</span>
              </div>

              ${this.stateDropdownOpen ? `
                <div class="custom-state-menu" id="sandbox-state-menu">
                  ${states.map(st => `
                    <div class="state-menu-item ${this.activeState === st ? 'active' : ''}" data-state="${st}">
                      ${st}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </aside>

          <!-- Middle Stage: Visual Canvas with Layout Badges -->
          <main class="sandbox-canvas-panel">
            <div class="canvas-top-bar">
              <div class="fit-zoom-pill">
                <span>Fit</span>
                <span>100%</span>
              </div>
            </div>

            <div class="canvas-stage-viewport" id="sandbox-viewport">
              <span class="canvas-comp-label">${comp.name}</span>

              <!-- Component Box with Spacing Badges -->
              <div class="sandbox-component-box state-${this.activeState.toLowerCase()}" id="sandbox-component-box" style="
                border-radius: ${this.corners}px;
                padding: ${this.paddingY}px ${this.paddingX}px;
                gap: ${this.gap}px;
                flex-direction: ${this.direction};
                align-items: ${this.align};
                justify-content: ${this.justify};
              ">
                <!-- Spacing Badges -->
                <span class="spacing-badge top-badge" title="Top Padding">${this.paddingY}</span>
                <span class="spacing-badge bottom-badge" title="Bottom Padding">${this.paddingY}</span>
                <span class="spacing-badge left-badge" title="Left Padding">${this.paddingX}</span>
                <span class="spacing-badge right-badge" title="Right Padding">${this.paddingX}</span>

                <!-- Selection Outline & Resize Handles -->
                <div class="box-selection-boundary">
                  <span class="resize-handle top-left"></span>
                  <span class="resize-handle top-right"></span>
                  <span class="resize-handle bottom-left"></span>
                  <span class="resize-handle bottom-right"></span>
                </div>

                <!-- Component Contents -->
                ${this.showIcon ? `
                  <div class="chip-icon-wrap" id="chip-icon-box">
                    <span class="chip-symbol">!</span>
                  </div>
                  <!-- Gap Badge between Icon and Label -->
                  <span class="gap-badge" title="Gap">${this.gap}</span>
                ` : ''}

                <span class="chip-text-label" id="chip-text-label">${comp.activeProps?.label || 'Label'}</span>
              </div>
            </div>
          </main>

          <!-- Right Panel: Layout & Styling Properties -->
          <aside class="sandbox-right-panel">
            <!-- Direction -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Direction</label>
              <div class="seg-ctrl-btn-group">
                <button class="seg-ctrl-btn ${this.direction === 'row' ? 'active' : ''}" data-dir="row" title="Horizontal">
                  &rarr;
                </button>
                <button class="seg-ctrl-btn ${this.direction === 'column' ? 'active' : ''}" data-dir="column" title="Vertical">
                  &darr;
                </button>
              </div>
            </div>

            <!-- Align -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Align</label>
              <div class="seg-ctrl-btn-group">
                <button class="seg-ctrl-btn ${this.align === 'flex-start' ? 'active' : ''}" data-align="flex-start" title="Top">⫪</button>
                <button class="seg-ctrl-btn ${this.align === 'center' ? 'active' : ''}" data-align="center" title="Center">⫸</button>
                <button class="seg-ctrl-btn ${this.align === 'flex-end' ? 'active' : ''}" data-align="flex-end" title="Bottom">⫫</button>
              </div>
            </div>

            <!-- Justify -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Justify</label>
              <div class="seg-ctrl-btn-group">
                <button class="seg-ctrl-btn ${this.justify === 'flex-start' ? 'active' : ''}" data-justify="flex-start" title="Left">⇤</button>
                <button class="seg-ctrl-btn ${this.justify === 'center' ? 'active' : ''}" data-justify="center" title="Center">⇋</button>
                <button class="seg-ctrl-btn ${this.justify === 'flex-end' ? 'active' : ''}" data-justify="flex-end" title="Right">⇥</button>
                <button class="seg-ctrl-btn ${this.justify === 'space-between' ? 'active' : ''}" data-justify="space-between" title="Space Between">⇎</button>
              </div>
            </div>

            <!-- Gap -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Gap</label>
              <div class="dropdown-input-pill">
                <span class="token-name">Spacing/4</span>
                <span class="token-val">${this.gap} &times;</span>
                <span class="token-chevron">▼</span>
              </div>
            </div>

            <!-- Padding -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Padding</label>
              <div class="padding-dual-inputs">
                <div class="pad-input-box">
                  <span class="pad-icon">&harr;</span>
                  <input type="number" id="pad-x-input" value="${this.paddingX}" class="pad-num" />
                </div>
                <div class="pad-input-box">
                  <span class="pad-icon">&#8597;</span>
                  <input type="number" id="pad-y-input" value="${this.paddingY}" class="pad-num" />
                </div>
                <button class="link-aspect-btn" title="Link padding values">🔗</button>
              </div>
            </div>

            <!-- Width -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Width</label>
              <div class="seg-ctrl-btn-group">
                <button class="seg-ctrl-btn ${this.widthMode === 'fit' ? 'active' : ''}" data-width="fit">Fit</button>
                <button class="seg-ctrl-btn ${this.widthMode === 'fill' ? 'active' : ''}" data-width="fill">Fill</button>
                <button class="seg-ctrl-btn ${this.widthMode === 'fixed' ? 'active' : ''}" data-width="fixed">Fixed</button>
                <button class="seg-ctrl-btn ${this.widthMode === 'min' ? 'active' : ''}" data-width="min">min</button>
              </div>
            </div>

            <!-- Height -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Height</label>
              <div class="seg-ctrl-btn-group">
                <button class="seg-ctrl-btn ${this.heightMode === 'fit' ? 'active' : ''}" data-height="fit">Fit</button>
                <button class="seg-ctrl-btn ${this.heightMode === 'fill' ? 'active' : ''}" data-height="fill">Fill</button>
                <button class="seg-ctrl-btn ${this.heightMode === 'fixed' ? 'active' : ''}" data-height="fixed">Fixed</button>
                <button class="seg-ctrl-btn ${this.heightMode === 'min' ? 'active' : ''}" data-height="min">min</button>
              </div>
            </div>

            <!-- Background -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Background</label>
              <div class="color-token-pill">
                <span class="color-swatch-circle" style="background-color: #FCEFEA;"></span>
                <span class="color-token-text" title="Colour/Control/Feedback/Primary">Colour/Control/Feedb...</span>
                <span class="token-chevron">▼</span>
              </div>
            </div>

            <!-- Corners -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Corners</label>
              <div class="corners-input-box">
                <span class="corner-glyph">▢</span>
                <input type="number" id="corners-input" value="${this.corners}" class="corner-num" />
              </div>
            </div>

            <!-- Additive Properties -->
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Shadow</label>
              <button class="add-prop-btn" data-add="shadow">Add</button>
            </div>
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Border</label>
              <button class="add-prop-btn" data-add="border">Add</button>
            </div>
            <div class="sandbox-ctrl-row">
              <label class="ctrl-label">Opacity</label>
              <button class="add-prop-btn" data-add="opacity">Add</button>
            </div>
          </aside>
        </div>

        <!-- Dialog Footer -->
        <div class="sandbox-dialog-footer">
          <div class="add-inside-bar">
            <span class="add-inside-label">Add inside</span>
            <button class="add-inside-icon" title="Add Container">◫</button>
            <button class="add-inside-icon" title="Add Text">T</button>
            <button class="add-inside-icon" title="Add Instance">❖</button>
            <button class="add-inside-icon" title="Add Slot">□</button>
            <button class="add-inside-icon" title="Add Shape">⬡</button>
          </div>
          <button class="adsc-btn btn-secondary" id="btn-close-sandbox-footer">Close</button>
        </div>
      </div>
    `;
  }

  attachEvents(comp) {
    const dialog = this.modalEl.querySelector('#sandbox-dialog');
    if (!dialog) return;

    // Close buttons
    const closeBtn = dialog.querySelector('#btn-close-sandbox');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    const closeFooter = dialog.querySelector('#btn-close-sandbox-footer');
    if (closeFooter) closeFooter.addEventListener('click', () => this.close());

    // Backdrop click
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Toggle Show Icon
    const toggleIcon = dialog.querySelector('#sandbox-toggle-show-icon');
    if (toggleIcon) {
      toggleIcon.addEventListener('change', (e) => {
        this.showIcon = e.target.checked;
        store.updateActiveProp('showIcon', this.showIcon);
        this.modalEl.innerHTML = this.renderContent(comp);
        this.attachEvents(comp);
      });
    }

    // State Dropdown
    const stateTrigger = dialog.querySelector('#sandbox-state-trigger');
    if (stateTrigger) {
      stateTrigger.addEventListener('click', () => {
        this.stateDropdownOpen = !this.stateDropdownOpen;
        this.modalEl.innerHTML = this.renderContent(comp);
        this.attachEvents(comp);
      });
    }

    // State Menu Item
    const stateItems = dialog.querySelectorAll('.state-menu-item');
    stateItems.forEach(item => {
      item.addEventListener('click', () => {
        this.activeState = item.getAttribute('data-state');
        this.stateDropdownOpen = false;
        store.setActiveState(this.activeState);
        this.modalEl.innerHTML = this.renderContent(comp);
        this.attachEvents(comp);
      });
    });

    // Direction buttons
    const dirBtns = dialog.querySelectorAll('[data-dir]');
    dirBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.direction = btn.getAttribute('data-dir');
        this.updateComponentBoxStyles();
      });
    });

    // Align buttons
    const alignBtns = dialog.querySelectorAll('[data-align]');
    alignBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        alignBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.align = btn.getAttribute('data-align');
        this.updateComponentBoxStyles();
      });
    });

    // Justify buttons
    const justifyBtns = dialog.querySelectorAll('[data-justify]');
    justifyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        justifyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.justify = btn.getAttribute('data-justify');
        this.updateComponentBoxStyles();
      });
    });

    // Padding inputs
    const padXInput = dialog.querySelector('#pad-x-input');
    if (padXInput) {
      padXInput.addEventListener('input', (e) => {
        this.paddingX = parseInt(e.target.value, 10) || 0;
        this.updateComponentBoxStyles();
        const lBadge = dialog.querySelector('.left-badge');
        const rBadge = dialog.querySelector('.right-badge');
        if (lBadge) lBadge.textContent = this.paddingX;
        if (rBadge) rBadge.textContent = this.paddingX;
      });
    }

    const padYInput = dialog.querySelector('#pad-y-input');
    if (padYInput) {
      padYInput.addEventListener('input', (e) => {
        this.paddingY = parseInt(e.target.value, 10) || 0;
        this.updateComponentBoxStyles();
        const tBadge = dialog.querySelector('.top-badge');
        const bBadge = dialog.querySelector('.bottom-badge');
        if (tBadge) tBadge.textContent = this.paddingY;
        if (bBadge) bBadge.textContent = this.paddingY;
      });
    }

    // Corners input
    const cornersInput = dialog.querySelector('#corners-input');
    if (cornersInput) {
      cornersInput.addEventListener('input', (e) => {
        this.corners = parseInt(e.target.value, 10) || 0;
        this.updateComponentBoxStyles();
      });
    }
  }

  updateComponentBoxStyles() {
    const box = this.modalEl?.querySelector('#sandbox-component-box');
    if (box) {
      box.style.padding = `${this.paddingY}px ${this.paddingX}px`;
      box.style.borderRadius = `${this.corners}px`;
      box.style.gap = `${this.gap}px`;
      box.style.flexDirection = this.direction;
      box.style.alignItems = this.align;
      box.style.justifyContent = this.justify;
    }
  }

  close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
    this.stateDropdownOpen = false;
  }
}
