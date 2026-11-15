// AI Design System Creator - Project Scope & Blueprint Modal (Requirement 12)
// Allows designers to configure foundations and select which components from the catalog belong to their project

import { store } from '../store.js';
import { bridgeClient } from '../bridge-client.js';

export class ProjectScopeModal {
  constructor() {
    this.isOpen = false;
    this.activeCategory = 'All';
    this.searchQuery = '';
    this.tempIncludedIds = new Set();
    this.tempFoundations = new Set();
    this.modalEl = null;

    this.createDom();
  }

  createDom() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'adsc-modal-backdrop project-scope-modal-backdrop';
    this.modalEl.id = 'project-scope-modal';
    this.modalEl.style.display = 'none';

    document.body.appendChild(this.modalEl);

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
  }

  open() {
    this.isOpen = true;
    this.tempIncludedIds = new Set(store.includedComponentIds);
    this.tempFoundations = new Set(store.includedFoundations);
    this.activeCategory = 'All';
    this.searchQuery = '';

    this.render();
    this.modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.modalEl.style.display = 'none';
    document.body.style.overflow = '';
  }

  save() {
    store.setIncludedComponents(Array.from(this.tempIncludedIds));
    this.tempFoundations.forEach(f => {
      if (!store.isFoundationIncluded(f)) store.toggleFoundationInclusion(f);
    });
    // Remove unselected
    const allFoundations = ['colors', 'typography', 'spacing', 'radii', 'shadows', 'states'];
    allFoundations.forEach(f => {
      if (!this.tempFoundations.has(f) && store.isFoundationIncluded(f)) {
        store.toggleFoundationInclusion(f);
      }
    });

    this.close();
    store.emit('filter:changed');
  }

  render() {
    const allComps = store.components;
    const categories = ['All', ...new Set(allComps.map(c => c.category || 'General'))];

    const filteredComps = allComps.filter(c => {
      const matchesSearch = !this.searchQuery || c.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCat = this.activeCategory === 'All' || c.category === this.activeCategory;
      return matchesSearch && matchesCat;
    });

    const includedCount = this.tempIncludedIds.size;
    const totalCount = allComps.length;

    this.modalEl.innerHTML = `
      <div class="adsc-modal-card project-scope-card" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="scope-modal-header">
          <div class="scope-header-left">
            <span class="scope-icon-badge">⚙</span>
            <div>
              <h2 class="scope-title">Design System Project Blueprint</h2>
              <p class="scope-subtitle">Choose the foundations and components that belong to your new design system project.</p>
            </div>
          </div>
          <button class="close-scope-btn" id="btn-close-scope-modal" title="Close">✕</button>
        </div>

        <!-- Body Layout (2 Columns) -->
        <div class="scope-modal-body">
          <!-- Col 1: Foundations Scope -->
          <div class="scope-foundations-col">
            <h3 class="col-section-title">1. Design Foundations</h3>
            <p class="col-section-desc">Select the core design token rules to establish for this project:</p>

            <div class="foundations-checklist">
              <label class="foundation-check-row">
                <input type="checkbox" class="foundation-checkbox" data-key="colors" ${this.tempFoundations.has('colors') ? 'checked' : ''} />
                <div class="f-check-info">
                  <span class="f-name">🎨 Color Systems & Tonal Swatches</span>
                  <span class="f-desc">Primary, secondary, tertiary & light/dark UI roles</span>
                </div>
              </label>

              <label class="foundation-check-row">
                <input type="checkbox" class="foundation-checkbox" data-key="typography" ${this.tempFoundations.has('typography') ? 'checked' : ''} />
                <div class="f-check-info">
                  <span class="f-name">Aa Typography & Type Scale</span>
                  <span class="f-desc">Font family, type scale ratio & line heights</span>
                </div>
              </label>

              <label class="foundation-check-row">
                <input type="checkbox" class="foundation-checkbox" data-key="spacing" ${this.tempFoundations.has('spacing') ? 'checked' : ''} />
                <div class="f-check-info">
                  <span class="f-name">⤧ Spacing & Layout Grid</span>
                  <span class="f-desc">4px/8px base grid and layout padding tokens</span>
                </div>
              </label>

              <label class="foundation-check-row">
                <input type="checkbox" class="foundation-checkbox" data-key="radii" ${this.tempFoundations.has('radii') ? 'checked' : ''} />
                <div class="f-check-info">
                  <span class="f-name">▢ Corner Radii & Borders</span>
                  <span class="f-desc">Border widths and corner curve presets</span>
                </div>
              </label>

              <label class="foundation-check-row">
                <input type="checkbox" class="foundation-checkbox" data-key="shadows" ${this.tempFoundations.has('shadows') ? 'checked' : ''} />
                <div class="f-check-info">
                  <span class="f-name">☁ Elevation & Shadows</span>
                  <span class="f-desc">Layer elevation levels (xs through 2xl)</span>
                </div>
              </label>

              <label class="foundation-check-row">
                <input type="checkbox" class="foundation-checkbox" data-key="states" ${this.tempFoundations.has('states') ? 'checked' : ''} />
                <div class="f-check-info">
                  <span class="f-name">✦ Interaction States</span>
                  <span class="f-desc">Standardized Rest, Focus, Hover & Press matrix</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Col 2: Components Catalog Selection -->
          <div class="scope-components-col">
            <div class="scope-comp-header-bar">
              <div>
                <h3 class="col-section-title">2. Components Included in Project</h3>
                <span class="scope-count-badge">${includedCount} of ${totalCount} components selected</span>
              </div>

              <!-- Quick Presets -->
              <div class="scope-quick-presets">
                <button class="preset-btn" id="btn-preset-core" title="Select standard core components">Core Essentials (18)</button>
                <button class="preset-btn" id="btn-preset-all" title="Select all 65 components">Select All (65)</button>
                <button class="preset-btn" id="btn-preset-clear" title="Clear selection">Clear</button>
              </div>
            </div>

            <!-- Search & Category Filters -->
            <div class="scope-filter-bar">
              <input type="text" id="scope-search-input" placeholder="Search components..." value="${this.searchQuery}" class="scope-search-box" />

              <div class="scope-cat-pills">
                ${categories.slice(0, 6).map(cat => `
                  <button class="cat-pill-btn ${this.activeCategory === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>
                `).join('')}
              </div>
            </div>

            <!-- Components Grid -->
            <div class="scope-components-grid">
              ${filteredComps.map(comp => {
                const isChecked = this.tempIncludedIds.has(comp.id);
                return `
                  <div class="scope-comp-card ${isChecked ? 'is-selected' : ''}" data-comp-id="${comp.id}">
                    <input type="checkbox" class="comp-item-check" data-comp-id="${comp.id}" ${isChecked ? 'checked' : ''} />
                    <div class="comp-card-meta">
                      <span class="comp-card-name">${comp.name}</span>
                      <span class="comp-card-cat">${comp.category || 'General'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="scope-modal-footer">
          <div class="scope-footer-left">
            <span>Active Project Scope: <strong>${includedCount} Components</strong> & <strong>${this.tempFoundations.size} Foundations</strong></span>
          </div>

          <div class="scope-footer-right">
            <button class="adsc-btn btn-secondary" id="btn-cancel-scope">Cancel</button>
            <button class="adsc-btn btn-figma" id="btn-push-scope-to-figma" title="Apply scope and sync all selected components directly to Figma canvas">
              ⚡ Push ${includedCount} Components to Figma
            </button>
            <button class="adsc-btn btn-primary" id="btn-apply-scope">Apply to My Project</button>
          </div>
        </div>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    // Close buttons
    this.modalEl.querySelector('#btn-close-scope-modal')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-cancel-scope')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-apply-scope')?.addEventListener('click', () => this.save());
    this.modalEl.querySelector('#btn-push-scope-to-figma')?.addEventListener('click', async () => {
      this.save();
      await bridgeClient.pushProjectScopeComponents();
    });

    // Foundation checkboxes
    const fChecks = this.modalEl.querySelectorAll('.foundation-checkbox');
    fChecks.forEach(ch => {
      ch.addEventListener('change', (e) => {
        const key = ch.getAttribute('data-key');
        if (e.target.checked) this.tempFoundations.add(key);
        else this.tempFoundations.delete(key);
      });
    });

    // Component checkbox clicks
    const compCards = this.modalEl.querySelectorAll('.scope-comp-card');
    compCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const compId = card.getAttribute('data-comp-id');
        const checkbox = card.querySelector('.comp-item-check');
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        if (checkbox.checked) {
          this.tempIncludedIds.add(compId);
          card.classList.add('is-selected');
        } else {
          this.tempIncludedIds.delete(compId);
          card.classList.remove('is-selected');
        }
        this.updateCountBadge();
      });
    });

    // Category pills
    const catPills = this.modalEl.querySelectorAll('.cat-pill-btn');
    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.activeCategory = pill.getAttribute('data-cat');
        this.render();
      });
    });

    // Search box
    const searchInput = this.modalEl.querySelector('#scope-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Presets
    this.modalEl.querySelector('#btn-preset-core')?.addEventListener('click', () => {
      const defaultCore = [
        'filter-chip', 'button', 'compact-button', 'chip', 'input-field',
        'checkbox', 'radio-button', 'switch-toggle', 'select', 'badge',
        'avatar', 'card', 'dialog-modal', 'dropdown-menu', 'tab',
        'table', 'toast-notification', 'tooltip'
      ];
      this.tempIncludedIds = new Set(defaultCore);
      this.render();
    });

    this.modalEl.querySelector('#btn-preset-all')?.addEventListener('click', () => {
      this.tempIncludedIds = new Set(store.components.map(c => c.id));
      this.render();
    });

    this.modalEl.querySelector('#btn-preset-clear')?.addEventListener('click', () => {
      this.tempIncludedIds = new Set(['filter-chip']); // keep at least 1
      this.render();
    });
  }

  updateCountBadge() {
    const badge = this.modalEl.querySelector('.scope-count-badge');
    if (badge) {
      badge.textContent = `${this.tempIncludedIds.size} of ${store.components.length} components selected`;
    }
    const footerStrong = this.modalEl.querySelector('.scope-footer-left strong');
    if (footerStrong) {
      footerStrong.textContent = `${this.tempIncludedIds.size} Components`;
    }
    const pushScopeBtn = this.modalEl.querySelector('#btn-push-scope-to-figma');
    if (pushScopeBtn) {
      pushScopeBtn.textContent = `⚡ Push ${this.tempIncludedIds.size} Components to Figma`;
    }
  }
}
