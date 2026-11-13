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
import { PropModal } from './modals/prop-modal.js';
import { AnatomyModal } from './modals/anatomy-modal.js';
import { NewComponentModal } from './modals/new-component.js';
import { SandboxModal } from './modals/sandbox-modal.js';

class App {
  constructor() {
    this.currentViewInstance = null;
    this.sidebarCollapsed = false;
    this.propModal = new PropModal();
    this.anatomyModal = new AnatomyModal();
    this.newCompModal = new NewComponentModal();
    this.sandboxModal = new SandboxModal();

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
    store.subscribe('bridge:status', () => this.updateBridgeIndicators());
  }

  renderTopNav() {
    const nav = document.getElementById('top-navbar');
    if (!nav) return;

    nav.innerHTML = `
      <!-- Top Nav Left: [ Components ] and [ + New component ] (Popup Trigger) -->
      <div class="top-nav-left">
        <button class="nav-components-btn" id="btn-toggle-sidebar" title="Toggle Component Library">
          <span class="icon">◫</span>
          <span>Components</span>
        </button>
        <button class="nav-new-comp-btn" id="btn-top-new-comp" title="Create New Component (Opens in Popup)">
          <span>+ New component</span>
        </button>
      </div>

      <!-- Top Nav Center: Industry Standard Workflow Steps (Requirement 4) -->
      <div class="top-nav-workflow-pills">
        <button class="workflow-step-pill ${store.currentView === 'tokens' ? 'active' : ''}" id="btn-wf-tokens" title="1. Foundations, Tokens, Color Palettes & Brand Guidelines">
          <span class="wf-step-num">✦ 1.</span>
          <span>Foundation & Tokens</span>
        </button>
        <button class="workflow-step-pill ${store.currentView !== 'tokens' ? 'active' : ''}" id="btn-wf-components" title="2. Component Anatomy, Props & Variant Matrices">
          <span class="wf-step-num">◫ 2.</span>
          <span>Component Contracts</span>
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
    const activeComp = store.getActiveComponent();

    // Drafts item: Filter chip (or active component)
    const draftComp = filtered.find(c => c.id === 'filter-chip') || activeComp;

    // Remaining Library items
    const libraryComps = filtered.filter(c => c.id !== draftComp?.id);

    return `
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

      <!-- Drafts Section -->
      <div class="sidebar-section-group">
        <span class="sidebar-group-title">Drafts</span>
        <div class="sidebar-drafts-list">
          ${draftComp ? `
            <div class="sidebar-item-row ${draftComp.id === store.activeComponentId && store.currentView !== 'tokens' ? 'active-draft' : ''}" data-id="${draftComp.id}">
              <span class="item-name">${draftComp.name}</span>
              <button class="btn-item-clear" title="Clear Draft" data-id="${draftComp.id}">✕</button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Library Section -->
      <div class="sidebar-section-group">
        <span class="sidebar-group-title">Library</span>
        <div class="sidebar-library-list">
          ${libraryComps.map(comp => {
            const isSelected = comp.id === store.activeComponentId && store.currentView !== 'tokens';
            return `
              <div class="library-item-row ${isSelected ? 'selected' : ''}" data-id="${comp.id}" title="${comp.name}">
                ${comp.name}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  bindSidebarClicks() {
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
        bridgeClient.pushComponent();
      }
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
