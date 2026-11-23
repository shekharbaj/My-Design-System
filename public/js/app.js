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
import { DSHubView } from './views/ds-hub-view.js';
import { AuthView } from './views/auth-view.js';
import { PropModal } from './modals/prop-modal.js';
import { AnatomyModal } from './modals/anatomy-modal.js';
import { NewComponentModal } from './modals/new-component.js';
import { SandboxModal } from './modals/sandbox-modal.js';
import { ProjectScopeModal } from './modals/project-scope-modal.js';
import { LLMModal } from './modals/llm-modal.js';
import { NewDSModal } from './modals/new-ds-modal.js';

class App {
  constructor() {
    window.app = this;
    this.currentViewInstance = null;
    this.sidebarCollapsed = false;
    this.propModal = new PropModal();
    this.anatomyModal = new AnatomyModal();
    this.newCompModal = new NewComponentModal();
    this.sandboxModal = new SandboxModal();
    this.scopeModal = new ProjectScopeModal();
    this.llmModal = new LLMModal();
    this.newDSModal = new NewDSModal();
    this.authView = null;

    this.init();
  }

  init() {
    // 1. Authentication Gate
    if (!store.isAuthenticated()) {
      this.showAuthScreen();
    } else {
      this.showMainApp();
    }

    // Bind auth state events
    store.subscribe('auth:login', () => {
      this.showMainApp();
    });
    store.subscribe('auth:logout', () => {
      this.showAuthScreen();
    });

    // Close open dropdowns on outside click
    document.addEventListener('click', (e) => {
      const switcherWrap = document.getElementById('ds-switcher-wrap');
      const switcherDropdown = document.getElementById('ds-switcher-dropdown');
      if (switcherDropdown && switcherWrap && !switcherWrap.contains(e.target)) {
        switcherDropdown.style.display = 'none';
      }

      const userWrap = document.getElementById('user-profile-wrap');
      const userDropdown = document.getElementById('user-profile-dropdown');
      if (userDropdown && userWrap && !userWrap.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
  }

  showAuthScreen() {
    const authContainer = document.getElementById('app-auth-container');
    const desktopFrame = document.getElementById('app-desktop-frame');

    if (desktopFrame) desktopFrame.style.display = 'none';
    if (authContainer) {
      authContainer.style.display = 'flex';
      this.authView = new AuthView(authContainer, (user) => {
        this.showMainApp();
      });
      this.authView.render();
    }
  }

  showMainApp() {
    const authContainer = document.getElementById('app-auth-container');
    const desktopFrame = document.getElementById('app-desktop-frame');

    if (authContainer) authContainer.style.display = 'none';
    if (desktopFrame) desktopFrame.style.display = 'flex';

    // Parse URL query parameters
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

    // First-time LLM Onboarding (Hybrid Architecture setup)
    if (!store.hasCompletedLLMOnboarding()) {
      setTimeout(() => {
        this.llmModal.open({ isFirstTime: true });
      }, 600);
    }
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

      if (viewParam && ['editor', 'preview', 'matrix', 'code', 'figma', 'tokens', 'docs', 'ds-hub'].includes(viewParam.toLowerCase())) {
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
      this.sidebarCollapsed = false;
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
    store.subscribe('llm:config-changed', () => {
      this.renderTopNav();
    });
    store.subscribe('bridge:status', () => this.updateBridgeIndicators());

    // Design Systems Multi-Tenancy Events
    store.subscribe('ds:switched', () => {
      this.renderTopNav();
      this.refreshSidebarList();
      this.renderActiveView();
    });
    store.subscribe('ds:created', () => {
      this.renderTopNav();
      this.refreshSidebarList();
      this.renderActiveView();
    });
    store.subscribe('ds:deleted', () => {
      this.renderTopNav();
      this.refreshSidebarList();
      this.renderActiveView();
    });
  }

  getLLMModelDisplay() {
    const cfg = store.getLLMConfig();
    const prov = store.getLLMProviderInfo(cfg.provider);
    if (cfg.provider === 'local') return 'Local Engine';
    if (cfg.model) {
      const clean = cfg.model.replace(/^gemini-/, 'Gemini ').replace(/^gpt-/, 'GPT-').replace(/^claude-/, 'Claude ').replace(/^llama-/, 'Llama-');
      return clean.length > 18 ? clean.slice(0, 16) + '...' : clean;
    }
    return prov ? prov.name : 'AI Model';
  }

  renderTopNav() {
    const nav = document.getElementById('top-navbar');
    if (!nav) return;

    const activeDS = store.getActiveDesignSystem();
    const systems = store.getDesignSystems() || [];
    const user = store.getCurrentUser();

    nav.innerHTML = `
      <!-- TOP BAR TIER 1: Brand & Global System Context (Extreme Left: Switcher, Extreme Right: User & Global Settings) -->
      <div class="top-nav-primary-row">
        <!-- Extreme Left: Design System Switcher Dropdown & Workspace Context -->
        <div class="top-nav-primary-left">
          <div class="ds-switcher-container" id="ds-switcher-wrap">
            <button class="nav-ds-switcher-btn" id="btn-ds-switcher" title="Switch Design System Workspace">
              <span class="ds-color-dot" style="background: ${activeDS?.brandColor || '#3B82F6'};"></span>
              <span class="ds-name-label">${activeDS?.name || 'Design System'}</span>
              <span class="ds-chevron">▾</span>
            </button>
            <div class="ds-switcher-dropdown" id="ds-switcher-dropdown" style="display: none;">
              <div class="ds-dropdown-header">
                <span>Your Design Systems (${systems.length})</span>
              </div>
              <div class="ds-dropdown-list">
                ${systems.map(ds => `
                  <div class="ds-switch-item ${ds.id === activeDS?.id ? 'active' : ''}" data-ds-id="${ds.id}">
                    <span class="ds-color-dot" style="background: ${ds.brandColor || '#3B82F6'};"></span>
                    <div class="ds-item-info">
                      <span class="ds-item-name">${ds.name}</span>
                      <span class="ds-item-meta">${ds.components?.length || 0} comps &bull; ${ds.framework || 'React'}</span>
                    </div>
                    ${ds.id === activeDS?.id ? '<span class="ds-item-check">✓</span>' : ''}
                  </div>
                `).join('')}
              </div>
              <div class="ds-dropdown-divider"></div>
              <button class="ds-dropdown-action-btn" id="btn-dropdown-create-ds">
                <span class="action-icon">+</span>
                <span>Create New Design System</span>
              </button>
              <button class="ds-dropdown-action-btn" id="btn-dropdown-all-ds">
                <span class="action-icon">❖</span>
                <span>Design Systems Hub</span>
              </button>
            </div>
          </div>
          <span class="ds-context-pill">${activeDS?.framework || 'React'} &bull; ${store.components.length} Components</span>
        </div>

        <!-- Extreme Right: AI Status Pill, Theme Segmented Toggle, and User Profile -->
        <div class="top-nav-primary-right">
          <!-- AI Model Status & Config Button (Hybrid Architecture) -->
          <button class="nav-ai-model-btn" id="btn-top-ai-model" title="Change AI Model & Credentials (Hybrid Model)">
            <span class="ai-spark-icon">✨</span>
            <span class="ai-model-label">AI: <strong>${this.getLLMModelDisplay()}</strong></span>
            <span class="ai-status-dot ${store.isLLMConfigured() ? 'active' : ''}"></span>
            <span style="font-size: 10px; opacity: 0.6; margin-left: 2px;">▾</span>
          </button>

          <div class="top-nav-divider"></div>

          <!-- System | Light | Dark Segmented Pill -->
          <div class="theme-segmented-pill">
            <button class="theme-seg-btn ${store.themeMode === 'system' ? 'active' : ''}" data-mode="system">System</button>
            <button class="theme-seg-btn ${store.themeMode === 'light' ? 'active' : ''}" data-mode="light">Light</button>
            <button class="theme-seg-btn ${store.themeMode === 'dark' ? 'active' : ''}" data-mode="dark">Dark</button>
          </div>

          <div class="top-nav-divider"></div>

          <!-- User Profile Pill & Dropdown (Extreme Right) -->
          <div class="nav-user-profile-wrap" id="user-profile-wrap">
            <button class="nav-user-btn" id="btn-user-profile" title="User Profile & Account">
              <span class="user-avatar-circle">${user?.avatar || 'BB'}</span>
              <span class="user-name-text">${user?.name ? user.name.split(' ')[0] : 'Bimlendu'}</span>
              <span class="user-chevron">▾</span>
            </button>
            <div class="user-profile-dropdown" id="user-profile-dropdown" style="display: none;">
              <div class="user-dropdown-header">
                <strong>${user?.name || 'Bimlendu Bajpayee'}</strong>
                <span>${user?.email || 'bimlendu@designsystem.io'}</span>
                <span class="user-role-badge">${user?.role || 'Design Systems Director'}</span>
              </div>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item" id="btn-user-hub">
                <span>❖</span>
                <span>Design Systems Hub</span>
              </button>
              <button class="user-dropdown-item" id="btn-user-new-ds">
                <span>+</span>
                <span>New Design System</span>
              </button>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item text-danger" id="btn-user-logout">
                <span>🚪</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TOP BAR TIER 2: Studio Workflow & Tools Navigation Bar -->
      <div class="top-nav-secondary-row">
        <!-- Left: Components Drawer Toggle & New Component Button -->
        <div class="top-nav-secondary-left">
          <button class="nav-components-btn ${store.currentView === 'editor' && !this.sidebarCollapsed ? 'active' : ''}" id="btn-toggle-sidebar" title="Open Components Library">
            <span class="icon">◫</span>
            <span>Components</span>
          </button>
          <button class="nav-new-comp-btn" id="btn-top-new-comp" title="Create New Component (Opens in Popup)">
            <span style="font-size: 15px; font-weight: 700;">+</span>
            <span>New Component</span>
          </button>
        </div>

        <!-- Center: Floating Workflow Step Pills -->
        <div class="top-nav-workflow-pills">
          <button class="workflow-step-pill ${store.currentView === 'tokens' ? 'active' : ''}" id="btn-wf-tokens" title="1. Foundations, Tokens, Color Palettes & Brand Guidelines">
            <span class="wf-step-num">✦ 1.</span>
            <span>Foundation & Tokens</span>
          </button>
          <button class="workflow-step-pill ${store.currentView === 'editor' ? 'active' : ''}" id="btn-wf-components" title="2. Component Anatomy, Props & Variant Matrices">
            <span class="wf-step-num">◫ 2.</span>
            <span>Component Contracts</span>
          </button>
          <button class="workflow-step-pill ${store.currentView === 'docs' ? 'active' : ''}" id="btn-wf-docs" title="3. Design System Documentation Site & Standards">
            <span class="wf-step-num">📖 3.</span>
            <span>Documentation Site</span>
          </button>
        </div>

        <!-- Right: Project Scope & Quick Push to Figma -->
        <div class="top-nav-secondary-right">
          <button class="nav-scope-btn" id="btn-project-scope" title="Configure Foundations & Components included in this Project (Requirement 12)">
            <span class="scope-icon">⚙</span>
            <span>Project Scope <strong class="scope-count-badge">${store.includedComponentIds.size}/${store.components.length}</strong></span>
          </button>
          <button class="nav-quick-push-btn" id="btn-quick-push-scope" title="Push all ${store.includedComponentIds.size} selected components to Figma canvas">
            <span>⚡ Push Scope to Figma</span>
          </button>
        </div>
      </div>
    `;

    // Dropdown Toggles
    const switcherBtn = nav.querySelector('#btn-ds-switcher');
    const switcherDropdown = nav.querySelector('#ds-switcher-dropdown');
    if (switcherBtn && switcherDropdown) {
      switcherBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = switcherDropdown.style.display === 'block';
        switcherDropdown.style.display = isOpen ? 'none' : 'block';
        const userDropdown = nav.querySelector('#user-profile-dropdown');
        if (userDropdown) userDropdown.style.display = 'none';
      });
    }

    const userBtn = nav.querySelector('#btn-user-profile');
    const userDropdown = nav.querySelector('#user-profile-dropdown');
    if (userBtn && userDropdown) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userDropdown.style.display === 'block';
        userDropdown.style.display = isOpen ? 'none' : 'block';
        if (switcherDropdown) switcherDropdown.style.display = 'none';
      });
    }

    // Switcher Dropdown actions
    const switchItems = nav.querySelectorAll('.ds-switch-item');
    switchItems.forEach(item => {
      item.addEventListener('click', () => {
        const dsId = item.getAttribute('data-ds-id');
        this.sidebarCollapsed = false;
        store.switchDesignSystem(dsId);
        if (store.currentView === 'ds-hub') {
          store.setView('editor');
        }
        if (switcherDropdown) switcherDropdown.style.display = 'none';
      });
    });

    const dropdownCreateBtn = nav.querySelector('#btn-dropdown-create-ds');
    if (dropdownCreateBtn) {
      dropdownCreateBtn.addEventListener('click', () => {
        if (switcherDropdown) switcherDropdown.style.display = 'none';
        this.newDSModal.open();
      });
    }

    const dropdownAllBtn = nav.querySelector('#btn-dropdown-all-ds');
    if (dropdownAllBtn) {
      dropdownAllBtn.addEventListener('click', () => {
        if (switcherDropdown) switcherDropdown.style.display = 'none';
        store.setView('ds-hub');
      });
    }

    // User Profile Dropdown actions
    const userHubBtn = nav.querySelector('#btn-user-hub');
    if (userHubBtn) {
      userHubBtn.addEventListener('click', () => {
        if (userDropdown) userDropdown.style.display = 'none';
        store.setView('ds-hub');
      });
    }

    const userNewDsBtn = nav.querySelector('#btn-user-new-ds');
    if (userNewDsBtn) {
      userNewDsBtn.addEventListener('click', () => {
        if (userDropdown) userDropdown.style.display = 'none';
        this.newDSModal.open();
      });
    }

    const userLogoutBtn = nav.querySelector('#btn-user-logout');
    if (userLogoutBtn) {
      userLogoutBtn.addEventListener('click', () => {
        if (userDropdown) userDropdown.style.display = 'none';
        store.logout();
      });
    }

    // Sidebar Toggle
    const sidebarBtn = nav.querySelector('#btn-toggle-sidebar');
    if (sidebarBtn) {
      sidebarBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('left-sidebar');
        if (store.currentView !== 'editor') {
          this.sidebarCollapsed = false;
          store.setView('editor');
        } else {
          this.sidebarCollapsed = !this.sidebarCollapsed;
        }
        if (sidebar) {
          sidebar.style.display = 'flex';
          sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        }
        sidebarBtn.classList.toggle('active', !this.sidebarCollapsed && store.currentView === 'editor');
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
        this.sidebarCollapsed = false;
        const sidebar = document.getElementById('left-sidebar');
        if (sidebar) {
          sidebar.style.display = 'flex';
          sidebar.classList.remove('collapsed');
        }
        if (sidebarBtn) sidebarBtn.classList.add('active');
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

    // AI Model Selector Pill Click
    const aiModelBtn = nav.querySelector('#btn-top-ai-model');
    if (aiModelBtn) {
      aiModelBtn.addEventListener('click', () => {
        this.llmModal.open({ isFirstTime: false });
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

  getTokensForComponent(comp) {
    if (!comp) return [];
    const s = comp.styles || {};
    const compType = (comp.id || '').toLowerCase();
    const isBtn = compType.includes('button');
    const surfaceVal = s.hasFill === false ? 'transparent' : (s.bg || (isBtn ? '#C2410C' : '#FFFFFF'));
    const textVal = s.textColor || (isBtn ? '#FFFFFF' : '#1F2937');
    const borderVal = s.hasBorder === false ? 'transparent' : (s.borderColor || '#D1D5DB');
    const radiusVal = (s.cornerRadius >= 9999 ? '999px' : (s.cornerRadius !== undefined ? s.cornerRadius + 'px' : '8px'));
    const padY = s.padding?.top !== undefined ? s.padding.top + 'px' : '8px';
    const padX = s.padding?.right !== undefined ? s.padding.right + 'px' : '14px';
    const fontSz = s.fontSize !== undefined ? s.fontSize + 'px' : '14px';

    return [
      { name: '--color-surface', val: surfaceVal, color: surfaceVal !== 'transparent', desc: 'Component surface background token' },
      { name: '--color-text', val: textVal, color: true, desc: 'Foreground text token' },
      { name: '--color-border', val: borderVal, color: borderVal !== 'transparent', desc: 'Border token' },
      { name: '--radius-component', val: radiusVal, desc: 'Corner radius token' },
      { name: '--spacing-padding-y', val: padY, desc: 'Vertical padding token' },
      { name: '--spacing-padding-x', val: padX, desc: 'Horizontal padding token' },
      { name: '--font-size-base', val: fontSz, desc: 'Typography font size token' }
    ];
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
    ? `<button class="btn-quick-toggle-project in-project" data-comp-id="${comp.id}" title="Included in project (click to remove)">
        <span class="icon-indicator-check">✓</span>
        <span class="icon-indicator-remove">✕</span>
       </button>` 
                  : `<button class="btn-quick-toggle-project not-in-project" data-comp-id="${comp.id}" title="Click to add to project">+</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 3. Active Component Tokens Submenu (Requirement 36) -->
      ${(() => {
        const activeComp = store.getActiveComponent();
        if (!activeComp || store.currentView === 'tokens' || store.currentView === 'ds-hub') return '';
        const tokens = this.getTokensForComponent(activeComp);
        return `
          <div class="sidebar-section-group sidebar-tokens-group">
            <div class="sidebar-group-header-row">
              <div class="sidebar-tokens-title-wrap">
                <span class="sparkle-icon">✦</span>
                <span class="sidebar-group-title">Active Tokens (<strong>${activeComp.name}</strong>)</span>
              </div>
              <button class="btn-copy-sidebar-tokens" id="btn-copy-sidebar-tokens" title="Copy CSS Tokens">📋 Copy</button>
            </div>
            <div class="sidebar-tokens-list">
              ${tokens.map(t => `
                <div class="sidebar-token-row" title="${t.desc}">
                  <span class="sidebar-token-name">${t.name}</span>
                  <span class="sidebar-token-val" style="${t.color ? 'background:' + t.val + '; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4);' : ''}">${t.val}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      })()}
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
  }

  updateTopScopeBadge() {
    const badge = document.querySelector('.scope-count-badge');
    if (badge) {
      badge.textContent = `${store.includedComponentIds.size}/${store.components.length}`;
    }
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

    if (this.currentViewInstance && typeof this.currentViewInstance.destroy === 'function') {
      this.currentViewInstance.destroy();
    }
    container.innerHTML = '';

    const sidebar = document.getElementById('left-sidebar');
    const sidebarToggleBtn = document.getElementById('btn-toggle-sidebar');
    if (sidebar) {
      // If we are in ds-hub view, we can collapse or show sidebar cleanly
      if (store.currentView === 'ds-hub') {
        sidebar.style.display = 'none';
      } else {
        sidebar.style.display = 'flex';
        sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
      }
    }
    if (sidebarToggleBtn) {
      sidebarToggleBtn.classList.toggle('active', store.currentView === 'editor' && !this.sidebarCollapsed);
    }

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
      case 'ds-hub':
        this.currentViewInstance = new DSHubView(container);
        break;
      default:
        this.currentViewInstance = new EditorView(container);
        break;
    }

    // Update top workflow pills highlight
    const wfTokensBtn = document.getElementById('btn-wf-tokens');
    const wfCompsBtn = document.getElementById('btn-wf-components');
    const wfDocsBtn = document.getElementById('btn-wf-docs');
    const sidebarTokensBtn = document.getElementById('btn-sidebar-tokens');
    if (wfTokensBtn) wfTokensBtn.classList.toggle('active', store.currentView === 'tokens');
    if (wfCompsBtn) wfCompsBtn.classList.toggle('active', store.currentView === 'editor');
    if (wfDocsBtn) wfDocsBtn.classList.toggle('active', store.currentView === 'docs');
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
    // Bridge indicators if any
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
