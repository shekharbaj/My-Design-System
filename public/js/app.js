// AI Design System Creator - Main Application Orchestrator
import { store } from './store.js';
import { ICON_SVGS } from './components-data.js';
import { bridgeClient } from './bridge-client.js';
import { EditorView } from './views/editor-view.js';
import { PreviewView } from './views/preview-view.js';
import { MatrixView } from './views/matrix-view.js';
import { CodeView } from './views/code-view.js';
import { FigmaView } from './views/figma-view.js';
import { TokensView } from './views/tokens-view.js';
import { DocsView } from './views/docs-view.js';
import { PropModal } from './modals/prop-modal.js';
import { AnatomyModal } from './modals/anatomy-modal.js';
import { NewComponentModal } from './modals/new-component.js';
import { SandboxModal } from './modals/sandbox-modal.js';
import { ProjectScopeModal } from './modals/project-scope-modal.js';

class App {
  constructor() {
    this.currentViewInstance = null;
    this.sidebarCollapsed = false;
    this.propModal = new PropModal();
    this.anatomyModal = new AnatomyModal();
    this.newCompModal = new NewComponentModal();
    this.sandboxModal = new SandboxModal();
    this.scopeModal = new ProjectScopeModal();

    this.init();
  }

  init() {
    // Parse URL query parameters (as demonstrated in Javier Cuello's video)
    this.parseUrlParameters();

    // Set theme
    document.documentElement.setAttribute('data-theme', store.theme);

    // Render shells
    this.renderTopNav();
    this.renderSidebar();
    this.renderActiveView();

    // Event hooks
    this.bindGlobalEvents();
    this.setupKeyboardShortcuts();
    this.syncUrlState();
  }

  parseUrlParameters() {
    try {
      const params = new URLSearchParams(window.location.search);
      const compParam = params.get('component');
      const tabParam = params.get('tab');
      const viewParam = params.get('view');

      if (compParam) {
        const match = store.components.find(c => 
          c.id.toLowerCase() === compParam.toLowerCase() || 
          c.name.toLowerCase() === compParam.toLowerCase()
        );
        if (match) {
          store.activeComponentId = match.id;
        }
      }

      if (tabParam && ['props', 'anatomy', 'variants'].includes(tabParam.toLowerCase())) {
        store.currentSubTab = tabParam.toLowerCase();
      }

      if (viewParam && ['editor', 'preview', 'matrix', 'code', 'figma', 'tokens'].includes(viewParam.toLowerCase())) {
        store.currentView = viewParam.toLowerCase();
      }
    } catch (e) {
      console.warn('URL parsing failed:', e);
    }
  }

  syncUrlState() {
    try {
      const comp = store.getActiveComponent();
      if (!comp) return;
      const params = new URLSearchParams();
      if (store.currentView === 'editor') {
        params.set('component', comp.name);
        if (store.currentSubTab !== 'props') {
          params.set('tab', store.currentSubTab);
        }
      } else {
        params.set('view', store.currentView);
      }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
      document.title = `${comp.name} • Component Contract Editor`;
    } catch (e) {}
  }

  bindGlobalEvents() {
    store.subscribe('theme:changed', () => this.updateThemeButtons());
    store.subscribe('themeMode:changed', () => this.updateThemeButtons());
    store.subscribe('view:changed', (view) => {
      this.switchView(view);
      this.syncUrlState();
    });
    store.subscribe('subTab:changed', () => {
      this.syncUrlState();
    });
    store.subscribe('filter:changed', () => this.refreshSidebarList());
    store.subscribe('component:selected', () => {
      this.refreshSidebarList();
      if (store.currentView !== 'editor') {
        store.setView('editor');
      }
      this.syncUrlState();
    });
    store.subscribe('component:renamed', () => {
      this.refreshSidebarList();
      this.syncUrlState();
    });
    store.subscribe('component:created', () => {
      this.refreshSidebarList();
      this.syncUrlState();
    });
    store.subscribe('component:deleted', () => {
      this.refreshSidebarList();
      this.syncUrlState();
    });
    store.subscribe('project:scope-changed', () => {
      this.renderTopNav();
      this.refreshSidebarList();
    });
    store.subscribe('bridge:status', () => this.updateBridgeIndicators());
  }

  renderTopNav() {
    const nav = document.getElementById('top-navbar');
    if (!nav) return;

    nav.innerHTML = `
      <!-- Top Nav Left: [ Components ] and [ + New component ] and [ Project Scope ] -->
      <div class="top-nav-left">
        <button class="nav-components-btn" id="btn-toggle-sidebar" title="Toggle Component Library">
          <span class="icon">◫</span>
          <span>Components</span>
        </button>
        <button class="nav-new-comp-btn" id="btn-top-new-comp" title="Create New Component (Opens in Popup)">
          <span>+ New component</span>
        </button>
        <button class="nav-scope-btn" id="btn-project-scope" title="Configure Foundations & Components included in this Project (Requirement 12)">
          <span class="scope-icon">⚙</span>
          <span>Project Scope <strong class="scope-count-badge">${store.includedComponentIds.size}/${store.components.length}</strong></span>
        </button>
        <button class="nav-quick-push-btn" id="btn-quick-push-scope" title="Push all ${store.includedComponentIds.size} selected components to Figma canvas">
          <span>⚡ Push Scope to Figma</span>
        </button>
      </div>

      <!-- Top Nav Center: Industry Standard Workflow Steps (Requirement 4) -->
      <div class="top-nav-workflow-pills">
        <button class="workflow-step-pill ${store.currentView === 'tokens' ? 'active' : ''}" id="btn-wf-tokens" title="1. Foundations, Tokens, Color Palettes & Brand Guidelines">
          <span class="wf-step-num">✦ 1.</span>
          <span>Foundation & Tokens</span>
        </button>
        <button class="workflow-step-pill ${store.currentView === 'editor' ? 'active' : ''}" id="btn-wf-components" title="2. Component Anatomy, Props & Variant Matrices">
          <span class="wf-step-num">◫ 2.</span>
          <span>Component Contracts</span>
        </button>
        <button class="workflow-step-pill ${store.currentView === 'docs' ? 'active' : ''}" id="btn-wf-docs" title="3. Design System Documentation Site & Standards (Requirement 25)">
          <span class="wf-step-num">📖 3.</span>
          <span>Documentation Site</span>
        </button>
      </div>

      <!-- Top Nav Right: Theme Pill -->
      <div class="top-nav-right">
        <!-- System | Light | Dark -->
        <div class="theme-segmented-pill">
          <button class="theme-seg-btn ${store.themeMode === 'system' ? 'active' : ''}" data-mode="system">System</button>
          <button class="theme-seg-btn ${store.themeMode === 'light' ? 'active' : ''}" data-mode="light">Light</button>
          <button class="theme-seg-btn ${store.themeMode === 'dark' ? 'active' : ''}" data-mode="dark">Dark</button>
        </div>
      </div>
    `;

    // Sidebar Toggle
    const sidebarBtn = nav.querySelector('#btn-toggle-sidebar');
    if (sidebarBtn) {
      sidebarBtn.addEventListener('click', () => {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        const sidebar = document.getElementById('left-sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
      });
    }

    // New component button - OPENS POPUP (Requirement 10)
    const newCompBtn = nav.querySelector('#btn-top-new-comp');
    if (newCompBtn) {
      newCompBtn.addEventListener('click', () => this.newCompModal.open());
    }

    // Project Scope Button - OPENS POPUP (Requirement 12)
    const scopeBtn = nav.querySelector('#btn-project-scope');
    if (scopeBtn) {
      scopeBtn.addEventListener('click', () => this.scopeModal.open());
    }

    // Quick Push Scope to Figma
    const quickPushBtn = nav.querySelector('#btn-quick-push-scope');
    if (quickPushBtn) {
      quickPushBtn.addEventListener('click', async () => {
        quickPushBtn.disabled = true;
        quickPushBtn.innerHTML = '<span>Syncing...</span>';
        try {
          await bridgeClient.pushProjectScopeComponents();
        } finally {
          setTimeout(() => {
            quickPushBtn.disabled = false;
            quickPushBtn.innerHTML = '<span>⚡ Push Scope to Figma</span>';
          }, 800);
        }
      });
    }

    // Workflow Step 1: Foundation & Tokens
    const wfTokensBtn = nav.querySelector('#btn-wf-tokens');
    if (wfTokensBtn) {
      wfTokensBtn.addEventListener('click', () => {
        store.setView('tokens');
      });
    }

    // Workflow Step 2: Component Contracts
    const wfCompsBtn = nav.querySelector('#btn-wf-components');
    if (wfCompsBtn) {
      wfCompsBtn.addEventListener('click', () => {
        store.setView('editor');
      });
    }

    // Workflow Step 3: Documentation Site (Requirement 25)
    const wfDocsBtn = nav.querySelector('#btn-wf-docs');
    if (wfDocsBtn) {
      wfDocsBtn.addEventListener('click', () => {
        store.setView('docs');
      });
    }

    // Theme mode segmented clicks
    const themeBtns = nav.querySelectorAll('.theme-seg-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        store.setThemeMode(mode);
      });
    });
  }

  renderSidebar() {
    const sidebar = document.getElementById('left-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
      <!-- Search Input -->
      <div class="sidebar-search-header">
        <div class="sidebar-search-box">
          <span class="search-icon">${ICON_SVGS.search}</span>
          <input type="text" id="sidebar-search-input" placeholder="Search..." value="${store.searchQuery}" />
        </div>
      </div>

      <!-- Sections: Drafts & Library -->
      <div class="sidebar-sections-scroll" id="sidebar-scroll-content">
        ${this.renderSidebarContent()}
      </div>
    `;

    const searchInput = sidebar.querySelector('#sidebar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        store.setSearchQuery(e.target.value);
      });
    }

    this.bindSidebarClicks();
  }

  renderSidebarContent() {
    const filtered = store.getFilteredComponents();
    const drafts = store.draftComponents || [];
    const hasDrafts = drafts.length > 0;
    const libraryComps = filtered;

    return `
      <!-- 0. Project Scope Selector (Requirement 12) -->
      <div class="sidebar-scope-selector">
        <div class="sidebar-scope-pills">
          <button class="scope-pill ${store.projectScopeFilter === 'in_project' ? 'active' : ''}" data-filter="in_project" title="Show only components in active project">
            In Project (${store.includedComponentIds.size})
          </button>
          <button class="scope-pill ${store.projectScopeFilter === 'all' ? 'active' : ''}" data-filter="all" title="Show all catalog components">
            All (${store.components.length})
          </button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn-manage-scope" id="btn-sidebar-manage-scope" style="flex: 1;" title="Choose which foundations and components are in your project">⚙ Scope (${store.includedComponentIds.size})</button>
          <button class="btn-manage-scope" id="btn-sidebar-push-scope" style="flex: 1.3; background: #FAF5FF; color: #9333EA; border-color: #DDD6FE; font-weight: 600;" title="Push all ${store.includedComponentIds.size} project components directly to Figma">⚡ Push to Figma</button>
        </div>
      </div>

      <!-- 1. Industry Standard Foundation & Brand Tokens Section (Requirement 4) -->
      <div class="sidebar-foundation-banner">
        <button class="foundation-nav-pill ${store.currentView === 'tokens' ? 'active' : ''}" id="btn-sidebar-tokens" title="1. Design Foundations: Brand Colors, Swatches, Light/Dark Modes & Guidelines">
          <span class="foundation-sparkle-icon">✦</span>
          <div class="foundation-text-group">
            <span class="foundation-step-title">1. Foundation & Tokens</span>
            <span class="foundation-step-desc">Colors, swatches & PDF rules</span>
          </div>
          <span class="foundation-arrow">&rarr;</span>
        </button>
      </div>

      <div class="sidebar-step-divider">
        <span class="step-label">2. COMPONENT SPECS</span>
      </div>

      <!-- Drafts Section: ONLY SHOWN WHEN DRAFTS EXIST (Requirement 24) -->
      ${hasDrafts ? `
        <div class="sidebar-section-group sidebar-drafts-group">
          <div class="sidebar-group-header-row">
            <span class="sidebar-group-title">Drafts (${drafts.length})</span>
            <span class="draft-badge">Unpublished</span>
          </div>
          <div class="sidebar-drafts-list">
            ${drafts.map(draftComp => `
              <div class="sidebar-item-row ${draftComp.id === store.activeComponentId && store.currentView !== 'tokens' ? 'active-draft' : ''}" data-id="${draftComp.id}">
                <span class="item-name">${draftComp.name}</span>
                <button class="btn-item-clear" title="Clear Draft" data-id="${draftComp.id}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Library Section with Clickable Green Tick Toggle (Requirement 22) -->
      <div class="sidebar-section-group">
        <span class="sidebar-group-title">Library (${libraryComps.length})</span>
        <div class="sidebar-library-list">
          ${libraryComps.map(comp => {
            const isSelected = comp.id === store.activeComponentId && store.currentView !== 'tokens';
            const inProject = store.isComponentIncluded(comp.id);
            return `
              <div class="library-item-row ${isSelected ? 'selected' : ''}" data-id="${comp.id}" title="${comp.name}">
                <span class="item-name">${comp.name}</span>
                ${inProject 
                  ? `<button class="btn-quick-toggle-project in-project" data-comp-id="${comp.id}" title="Included in project (click to remove)">✓</button>` 
                  : `<button class="btn-quick-toggle-project not-in-project" data-comp-id="${comp.id}" title="Click to add to project">+</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  bindSidebarClicks() {
    // Project Scope Selector clicks (Requirement 12)
    const scopePills = document.querySelectorAll('.scope-pill');
    scopePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const filter = pill.getAttribute('data-filter');
        store.setProjectScopeFilter(filter);
      });
    });

    const manageScopeBtn = document.getElementById('btn-sidebar-manage-scope');
    if (manageScopeBtn) {
      manageScopeBtn.addEventListener('click', () => this.scopeModal.open());
    }

    const sidebarPushBtn = document.getElementById('btn-sidebar-push-scope');
    if (sidebarPushBtn) {
      sidebarPushBtn.addEventListener('click', async () => {
        sidebarPushBtn.disabled = true;
        sidebarPushBtn.textContent = 'Syncing...';
        try {
          await bridgeClient.pushProjectScopeComponents();
        } finally {
          setTimeout(() => {
            sidebarPushBtn.disabled = false;
            sidebarPushBtn.textContent = '⚡ Push to Figma';
          }, 800);
        }
      });
    }

    // Quick project scope toggle: click green tick to remove, click plus to add (Requirement 22)
    const toggleScopeBtns = document.querySelectorAll('.btn-quick-toggle-project');
    toggleScopeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-comp-id');
        store.toggleComponentInclusion(id);
        this.refreshSidebarList();
        this.updateTopScopeBadge();
      });
    });

    // Clear Drafts button (Requirement 24)
    const clearDraftBtns = document.querySelectorAll('.btn-item-clear');
    clearDraftBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        store.removeDraft(id);
        this.refreshSidebarList();
      });
    });

    // Foundation & Brand Tokens click
    const tokensNavBtn = document.getElementById('btn-sidebar-tokens');
    if (tokensNavBtn) {
      tokensNavBtn.addEventListener('click', () => {
        store.setView('tokens');
      });
    }

    const rows = document.querySelectorAll('.sidebar-item-row, .library-item-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-item-clear')) return;
        const id = row.getAttribute('data-id');
        store.setActiveComponent(id);
      });
    });

    const clearBtns = document.querySelectorAll('.btn-item-clear');
    clearBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm(`Remove "${id}" from Drafts?`)) {
          store.deleteComponent(id);
        }
      });
    });
  }

  refreshSidebarList() {
    const scrollContent = document.getElementById('sidebar-scroll-content');
    if (scrollContent) {
      scrollContent.innerHTML = this.renderSidebarContent();
      this.bindSidebarClicks();
    }
  }

  renderActiveView() {
    const container = document.getElementById('app-view-container');
    if (!container) return;

    container.innerHTML = '';

    switch (store.currentView) {
      case 'editor':
        this.currentViewInstance = new EditorView(container);
        break;
      case 'preview':
        this.currentViewInstance = new PreviewView(container);
        break;
      case 'matrix':
        this.currentViewInstance = new MatrixView(container);
        break;
      case 'code':
        this.currentViewInstance = new CodeView(container);
        break;
      case 'figma':
        this.currentViewInstance = new FigmaView(container);
        break;
      case 'tokens':
        this.currentViewInstance = new TokensView(container);
        break;
      case 'docs':
        this.currentViewInstance = new DocsView(container);
        break;
      default:
        this.currentViewInstance = new EditorView(container);
        break;
    }

    // Update top workflow pills highlight (Requirement 4)
    const wfTokensBtn = document.getElementById('btn-wf-tokens');
    const wfCompsBtn = document.getElementById('btn-wf-components');
    const sidebarTokensBtn = document.getElementById('btn-sidebar-tokens');
    if (wfTokensBtn) wfTokensBtn.classList.toggle('active', store.currentView === 'tokens');
    if (wfCompsBtn) wfCompsBtn.classList.toggle('active', store.currentView !== 'tokens');
    if (sidebarTokensBtn) sidebarTokensBtn.classList.toggle('active', store.currentView === 'tokens');

    // Update view segmented buttons highlight
    const viewBtns = document.querySelectorAll('.view-seg-btn');
    viewBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === store.currentView);
    });
  }

  switchView(view) {
    this.renderActiveView();
  }

  updateThemeButtons() {
    const themeBtns = document.querySelectorAll('.theme-seg-btn');
    themeBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === store.themeMode);
    });
  }

  updateBridgeIndicators() {
    // Optional indicator updates
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        bridgeClient.pushProjectScopeComponents();
      }
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
