// AI Design System Creator - Design Systems Hub Dashboard View
import { store } from '../store.js';

export class DSHubView {
  constructor(container) {
    this.container = container;
    this.unsubscribe = null;
    this.render();
    this.setupListeners();
  }

  setupListeners() {
    const onUpdate = () => this.render();
    this.unsubscribe = store.subscribe('ds:switched', onUpdate);
    store.subscribe('ds:created', onUpdate);
    store.subscribe('ds:deleted', onUpdate);
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    if (!this.container) return;

    const user = store.getCurrentUser();
    const systems = store.getDesignSystems() || [];
    const activeDS = store.getActiveDesignSystem();
    const activeId = activeDS?.id;

    this.container.innerHTML = `
      <div class="ds-hub-container">
        <!-- Hub Header -->
        <div class="ds-hub-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 20px; color: #7C3AED;">❖</span>
                <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #7C3AED;">Multi-System Architecture</span>
              </div>
              <h1>Design Systems Hub</h1>
              <p>Manage, switch, or create completely isolated design systems. Each system preserves its own tokens, contracts, and scope.</p>
            </div>
            <div>
              <button class="btn-auth-submit" id="btn-hub-new-ds" style="padding: 10px 20px; font-size: 13.5px; border-radius: 10px; cursor: pointer;">
                <span>+ Create Design System</span>
              </button>
            </div>
          </div>

          <!-- Stats Strip -->
          <div class="ds-hub-stats-strip">
            <div class="hub-stat-card">
              <span class="hub-stat-label">Total Design Systems</span>
              <span class="hub-stat-value">${systems.length}</span>
            </div>
            <div class="hub-stat-card">
              <span class="hub-stat-label">Active Workspace</span>
              <span class="hub-stat-value" style="font-size: 16px; color: #7C3AED; font-weight: 700;">${activeDS?.name || 'None'}</span>
            </div>
            <div class="hub-stat-card">
              <span class="hub-stat-label">Active Components</span>
              <span class="hub-stat-value">${store.components.length}</span>
            </div>
            <div class="hub-stat-card">
              <span class="hub-stat-label">Target Framework</span>
              <span class="hub-stat-value" style="font-size: 15px;">${activeDS?.framework || 'React'}</span>
            </div>
          </div>
        </div>

        <!-- Systems Grid -->
        <div class="ds-hub-grid">
          ${systems.map(ds => {
            const isActive = ds.id === activeId;
            const compCount = ds.components ? ds.components.length : 0;
            const scopeCount = ds.includedComponentIds ? ds.includedComponentIds.length : compCount;
            const updatedDate = ds.updatedAt ? new Date(ds.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

            return `
              <div class="ds-hub-card ${isActive ? 'active' : ''}">
                <div class="ds-card-top-row">
                  <div class="ds-card-title-group">
                    <span class="ds-brand-circle" style="background: ${ds.brandColor || '#3B82F6'};" title="Brand Accent"></span>
                    <div>
                      <h3>${ds.name}</h3>
                      <span style="font-size: 11px; color: var(--text-tertiary, #94A3B8); font-family: monospace;">ID: ${ds.id}</span>
                    </div>
                  </div>
                  ${isActive ? `
                    <span class="ds-active-badge">
                      <span>✓</span>
                      <span>Active</span>
                    </span>
                  ` : ''}
                </div>

                <p class="ds-card-desc">${ds.description || 'Custom multi-tier design system library.'}</p>

                <div class="ds-card-meta-row">
                  <span class="ds-framework-tag">${ds.framework || 'React'}</span>
                  <span class="ds-card-meta-item">◫ <strong>${compCount}</strong> comps</span>
                  <span class="ds-card-meta-item">⚙ <strong>${scopeCount}</strong> in scope</span>
                  <span class="ds-card-meta-item" style="margin-left: auto;">${updatedDate}</span>
                </div>

                <div class="ds-card-actions-row">
                  ${isActive ? `
                    <button class="btn-primary-action" id="btn-open-active-ds" style="background: #E2E8F0; color: #475569; border: 1px solid #CBD5E1; cursor: pointer;">
                      <span>Open Studio &rarr;</span>
                    </button>
                  ` : `
                    <button class="btn-primary-action btn-switch-to-ds" data-id="${ds.id}">
                      <span>Switch to this System</span>
                    </button>
                  `}
                  <button class="btn-secondary-action btn-dup-ds" data-id="${ds.id}" title="Duplicate this design system">
                    Duplicate
                  </button>
                  <button class="btn-secondary-action text-danger btn-del-ds" data-id="${ds.id}" title="Delete design system" ${systems.length <= 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                    Delete
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // New DS Button
    const newBtn = this.container.querySelector('#btn-hub-new-ds');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        if (window.app && window.app.newDSModal) {
          window.app.newDSModal.open();
        }
      });
    }

    // Open Active DS in Editor
    const openActiveBtn = this.container.querySelector('#btn-open-active-ds');
    if (openActiveBtn) {
      openActiveBtn.addEventListener('click', () => {
        if (window.app) window.app.sidebarCollapsed = false;
        const sidebar = document.getElementById('left-sidebar');
        if (sidebar) {
          sidebar.style.display = 'flex';
          sidebar.classList.remove('collapsed');
        }
        store.setView('editor');
      });
    }

    // Switch DS Buttons
    const switchBtns = this.container.querySelectorAll('.btn-switch-to-ds');
    switchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (window.app) window.app.sidebarCollapsed = false;
        const sidebar = document.getElementById('left-sidebar');
        if (sidebar) {
          sidebar.style.display = 'flex';
          sidebar.classList.remove('collapsed');
        }
        store.switchDesignSystem(id);
        store.setView('editor');
      });
    });

    // Duplicate DS Buttons
    const dupBtns = this.container.querySelectorAll('.btn-dup-ds');
    dupBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        store.duplicateDesignSystem(id);
        this.render();
      });
    });

    // Delete DS Buttons
    const delBtns = this.container.querySelectorAll('.btn-del-ds');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const ds = store.getDesignSystems().find(d => d.id === id);
        const name = ds ? ds.name : 'this design system';
        if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
          store.deleteDesignSystem(id);
          this.render();
        }
      });
    });
  }
}
