// AI Design System Creator - Central Reactive State Store & Multi-Design System Architecture
import { INITIAL_COMPONENTS } from './components-data.js';
import { INITIAL_BRAND_TOKENS, generateTonalPalette } from './tokens-data.js';

const memStorage = {};
const safeStorage = {
  getItem: (k) => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(k);
    } catch(e) {}
    return memStorage[k] || null;
  },
  setItem: (k, v) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
    } catch(e) {}
    memStorage[k] = String(v);
  },
  removeItem: (k) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    } catch(e) {}
    delete memStorage[k];
  }
};

// =========================================================
// Default Users (Dummy Credentials for Fast Testing)
// =========================================================
export const DEFAULT_USERS = [
  {
    id: 'user_bimlendu',
    name: 'Bimlendu Bajpayee',
    email: 'bimlendu@designsystem.io',
    password: 'admin123',
    role: 'Design Systems Director',
    company: 'Nexus Design Corp',
    avatar: 'BB'
  },
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    email: 'designer@acme.com',
    password: 'design123',
    role: 'Lead Design Architect',
    company: 'Acme Design Corp',
    avatar: 'AR'
  }
];

// Helper to seed initial isolated design systems for any user
export function createDefaultDesignSystemsForUser(userId) {
  const nexusId = `ds_${userId}_nexus`;
  const auroraId = `ds_${userId}_aurora`;

  const cleanComps = INITIAL_COMPONENTS.filter(c => !c.id.startsWith('graphic-')).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Nexus Enterprise: all 59 enterprise components
  const nexusComps = JSON.parse(JSON.stringify(cleanComps));

  // Aurora Mobile Kit: 18 core mobile components
  const mobileCoreIds = [
    'filter-chip', 'button', 'compact-button', 'chip', 'input-field',
    'checkbox', 'radio-button', 'switch-toggle', 'select', 'badge',
    'avatar', 'card', 'dialog-modal', 'dropdown-menu', 'tab',
    'table', 'toast-notification', 'tooltip'
  ];
  const auroraComps = JSON.parse(JSON.stringify(cleanComps.filter(c => mobileCoreIds.includes(c.id))));

  const auroraTokens = JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS));
  auroraTokens.brand.name = 'Aurora Mobile';
  auroraTokens.brand.primaryColor = '#7C3AED';
  if (typeof generateTonalPalette === 'function') {
    auroraTokens.brand.shades = generateTonalPalette('#7C3AED');
  }

  return [
    {
      id: nexusId,
      name: 'Nexus Enterprise UI',
      description: 'Enterprise B2B multi-tier web application component system with comprehensive contracts.',
      framework: 'React / Web Components',
      brandColor: '#C2410C',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: nexusComps,
      tokens: JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS)),
      includedComponentIds: [
        'filter-chip', 'button', 'compact-button', 'chip', 'input-field',
        'checkbox', 'radio-button', 'switch-toggle', 'select', 'badge',
        'avatar', 'card', 'dialog-modal', 'dropdown-menu', 'tab',
        'table', 'toast-notification', 'tooltip'
      ],
      includedFoundations: ['colors', 'typography', 'spacing', 'radii', 'shadows', 'states'],
      customIcons: [],
      draftComponents: []
    },
    {
      id: auroraId,
      name: 'Aurora Mobile Kit',
      description: 'High-density, touch-optimized design system for iOS & Android companion applications.',
      framework: 'React Native / Flutter',
      brandColor: '#7C3AED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: auroraComps,
      tokens: auroraTokens,
      includedComponentIds: [
        'button', 'compact-button', 'input-field', 'switch-toggle', 'badge', 'avatar', 'card', 'tab'
      ],
      includedFoundations: ['colors', 'typography', 'spacing', 'radii'],
      customIcons: [],
      draftComponents: []
    }
  ];
}

export const DEFAULT_LLM_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Fast multimodal generation with large context window',
    icon: '✦',
    badge: 'Recommended',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended - Ultra Fast)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Balanced)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Deep Multimodal & PDFs)' }
    ],
    requiresKey: true,
    keyPlaceholder: 'AIzaSy...',
    keyHelpUrl: 'https://aistudio.google.com/app/apikey',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry standard reasoning, coding and structuring',
    icon: '⚡',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cost Effective)' },
      { id: 'gpt-4o', name: 'GPT-4o (Omni Intelligence)' },
      { id: 'o3-mini', name: 'o3-mini (Advanced Reasoning)' }
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-proj-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    defaultBaseUrl: 'https://api.openai.com/v1'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Design system copywriting & accessible microcopy',
    icon: '✻',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' }
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-ant-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    defaultBaseUrl: 'https://api.anthropic.com/v1'
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast LPU)',
    description: 'Sub-second token generation for rapid synthesis',
    icon: '⚡',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
    ],
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
    keyHelpUrl: 'https://console.groq.com/keys',
    defaultBaseUrl: 'https://api.groq.com/openai/v1'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local & Private)',
    description: '100% private models running on your local machine',
    icon: '🦙',
    defaultModel: 'llama3.2',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'deepseek-r1', name: 'DeepSeek R1' },
      { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder' },
      { id: 'mistral', name: 'Mistral' }
    ],
    requiresKey: false,
    keyPlaceholder: 'No API Key required (Local host)',
    defaultBaseUrl: 'http://localhost:11434'
  },
  {
    id: 'local',
    name: 'Local Deterministic (Offline)',
    description: 'Zero network calls, built-in algorithmic generator',
    icon: '💻',
    defaultModel: 'rule-based-engine',
    models: [
      { id: 'rule-based-engine', name: 'Built-in Algorithmic Synthesizer' }
    ],
    requiresKey: false,
    keyPlaceholder: 'No key needed (100% offline mode)'
  }
];

class StateStore {
  constructor() {
    this.listeners = new Map();
    this.theme = safeStorage.getItem('adsc_theme') || 'light';
    this.themeMode = safeStorage.getItem('adsc_theme_mode') || 'light'; // 'system' | 'light' | 'dark'
    this.currentView = 'editor'; // 'editor' | 'preview' | 'matrix' | 'code' | 'figma' | 'tokens' | 'docs' | 'ds-hub'
    this.currentSubTab = 'preview'; // 'preview' (default per Req 21) | 'props' | 'anatomy' | 'variants'
    this.kindsTab = 'kinds'; // 'kinds' | 'library'
    this.searchQuery = '';
    this.selectedCategory = 'All';
    this.activeState = 'Rest'; // 'Rest' | 'Hover' | 'Focus' | 'Press'
    this.canvasTheme = 'neutral'; // 'neutral' | 'light' | 'dark' | 'grid'
    this.bridgeStatus = {
      connected: false,
      clientsCount: 0,
      lastSync: null,
      lastPushedComponent: null,
      pendingCount: 0
    };
    this.history = [];
    this.projectScopeFilter = 'all'; // 'all' | 'in_project'
    this.llmConfig = this.loadLLMConfig();

    // Authentication State
    this.registeredUsers = this.loadRegisteredUsers();
    this.currentUser = this.loadCurrentUser();

    // Design Systems Multi-Tenancy
    this.designSystems = [];
    this.activeDesignSystemId = null;

    if (this.currentUser) {
      this.initUserDesignSystems(this.currentUser.id);
    } else {
      this.initFallbackState();
    }
  }

  // --- Auth & User Management ---
  loadRegisteredUsers() {
    try {
      const saved = safeStorage.getItem('adsc_registered_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  loadCurrentUser() {
    try {
      const saved = safeStorage.getItem('adsc_current_user');
      let user = saved ? JSON.parse(saved) : null;
      if (user && (user.id === 'user_sarah' || (user.name && user.name.toLowerCase().includes('sarah')))) {
        user = DEFAULT_USERS.find(u => u.id === 'user_bimlendu');
        safeStorage.setItem('adsc_current_user', JSON.stringify(user));
      }
      return user;
    } catch (e) {
      return null;
    }
  }

  getAllUsers() {
    return [...DEFAULT_USERS, ...this.registeredUsers];
  }

  isAuthenticated() {
    return Boolean(this.currentUser);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const user = this.getAllUsers().find(u => u.email.toLowerCase() === cleanEmail && u.password === cleanPass);

    if (!user) {
      return {
        success: false,
        error: 'Invalid email or password. Please use the quick demo login buttons above or register.'
      };
    }

    this.currentUser = user;
    try {
      safeStorage.setItem('adsc_current_user', JSON.stringify(user));
    } catch (e) {}

    this.initUserDesignSystems(user.id);
    this.emit('auth:login', user);
    return { success: true, user };
  }

  quickDemoLogin(roleKey = 'designer') {
    const target = roleKey === 'admin' 
      ? DEFAULT_USERS.find(u => u.id === 'user_bimlendu') 
      : DEFAULT_USERS.find(u => u.id === 'user_alex');
    if (target) {
      return this.login(target.email, target.password);
    }
    return { success: false, error: 'Demo user not found' };
  }

  register({ name, email, password, company, role }) {
    if (!name || !name.trim()) return { success: false, error: 'Full name is required' };
    if (!email || !email.trim() || !email.includes('@')) return { success: false, error: 'Valid email is required' };
    if (!password || password.length < 4) return { success: false, error: 'Password must be at least 4 characters' };

    const cleanEmail = email.trim().toLowerCase();
    if (this.getAllUsers().some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'DS';
    const newUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      company: (company || 'Design System Studio').trim(),
      role: (role || 'Design System Architect').trim(),
      avatar: initials
    };

    this.registeredUsers.push(newUser);
    try {
      safeStorage.setItem('adsc_registered_users', JSON.stringify(this.registeredUsers));
    } catch (e) {}

    return this.login(newUser.email, newUser.password);
  }

  logout() {
    this.commitActiveDSToMemory();
    this.saveDesignSystems();
    this.currentUser = null;
    try {
      safeStorage.removeItem('adsc_current_user');
    } catch (e) {}
    this.emit('auth:logout');
  }

  // --- Multi-Design System Architecture ---
  initUserDesignSystems(userId) {
    let systems = [];
    try {
      const saved = safeStorage.getItem(`adsc_design_systems_${userId}`);
      if (saved) {
        systems = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse user design systems:', e);
    }

    if (!systems || !Array.isArray(systems) || systems.length === 0) {
      systems = createDefaultDesignSystemsForUser(userId);
      try {
        safeStorage.setItem(`adsc_design_systems_${userId}`, JSON.stringify(systems));
      } catch (e) {}
    }

    this.designSystems = systems;

    // Active design system preference
    let activeId = safeStorage.getItem(`adsc_active_ds_${userId}`);
    if (!activeId || !this.designSystems.find(ds => ds.id === activeId)) {
      activeId = this.designSystems[0].id;
    }
    this.activeDesignSystemId = activeId;

    const activeDS = this.getActiveDesignSystem();
    this.loadDesignSystemData(activeDS);
  }

  initFallbackState() {
    this.components = this.loadInitialComponents().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const filterChipComp = this.components.find(c => c.id === 'filter-chip');
    this.activeComponentId = filterChipComp ? 'filter-chip' : (this.components[0]?.id || 'button');
    this.includedComponentIds = this.loadIncludedComponents();
    this.includedFoundations = this.loadIncludedFoundations();
    this.customIcons = this.getCustomIcons();
    this.draftComponents = [];
    this.activeTokens = JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS));
  }

  loadDesignSystemData(ds) {
    if (!ds) return;
    this.components = JSON.parse(JSON.stringify(ds.components || [])).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    this.includedComponentIds = new Set(ds.includedComponentIds || []);
    this.includedFoundations = new Set(ds.includedFoundations || ['colors', 'typography', 'spacing', 'radii', 'shadows', 'states']);
    this.customIcons = JSON.parse(JSON.stringify(ds.customIcons || []));
    this.draftComponents = JSON.parse(JSON.stringify(ds.draftComponents || []));
    this.activeTokens = JSON.parse(JSON.stringify(ds.tokens || INITIAL_BRAND_TOKENS));

    // Restore active component if exists, else first
    const match = this.components.find(c => c.id === this.activeComponentId);
    this.activeComponentId = match ? match.id : (this.components[0]?.id || 'button');

    // Sync legacy/global cache keys
    try {
      safeStorage.setItem('adsc_components', JSON.stringify(this.components));
      safeStorage.setItem('adsc_brand_tokens_v2', JSON.stringify(this.activeTokens));
      safeStorage.setItem('adsc_included_components', JSON.stringify(Array.from(this.includedComponentIds)));
      safeStorage.setItem('adsc_custom_icons', JSON.stringify(this.customIcons));
    } catch (e) {}
  }

  commitActiveDSToMemory() {
    if (!this.activeDesignSystemId) return;
    const activeDS = this.designSystems.find(ds => ds.id === this.activeDesignSystemId);
    if (activeDS) {
      activeDS.components = JSON.parse(JSON.stringify(this.components));
      activeDS.includedComponentIds = Array.from(this.includedComponentIds);
      activeDS.includedFoundations = Array.from(this.includedFoundations);
      activeDS.customIcons = JSON.parse(JSON.stringify(this.customIcons || []));
      activeDS.draftComponents = JSON.parse(JSON.stringify(this.draftComponents || []));
      activeDS.tokens = JSON.parse(JSON.stringify(this.activeTokens || INITIAL_BRAND_TOKENS));
      activeDS.updatedAt = new Date().toISOString();
    }
  }

  saveDesignSystems() {
    if (!this.currentUser) return;
    this.commitActiveDSToMemory();
    try {
      safeStorage.setItem(`adsc_design_systems_${this.currentUser.id}`, JSON.stringify(this.designSystems));
      safeStorage.setItem(`adsc_active_ds_${this.currentUser.id}`, this.activeDesignSystemId);
    } catch (e) {
      console.warn('Failed to save design systems:', e);
    }
  }

  getDesignSystems() {
    return this.designSystems;
  }

  getActiveDesignSystem() {
    return this.designSystems.find(ds => ds.id === this.activeDesignSystemId) || this.designSystems[0] || null;
  }

  switchDesignSystem(dsId) {
    if (!dsId || dsId === this.activeDesignSystemId) return true;
    const targetDS = this.designSystems.find(ds => ds.id === dsId);
    if (!targetDS) return false;

    // 1. Commit active DS
    this.commitActiveDSToMemory();
    // 2. Set new active DS
    this.activeDesignSystemId = dsId;
    // 3. Load target DS
    this.loadDesignSystemData(targetDS);
    // 4. Save pointers
    this.saveDesignSystems();

    // 5. Broadcast change
    this.emit('ds:switched', targetDS);
    this.emit('component:selected', this.getActiveComponent());
    this.emit('project:scope-changed', {
      includedCount: this.includedComponentIds.size,
      totalCount: this.components.length
    });
    this.emit('tokens:updated', this.activeTokens);
    this.emit('filter:changed');
    return true;
  }

  createDesignSystem({ name, description, framework, brandColor, template = 'enterprise' }) {
    if (!this.currentUser) return null;
    this.commitActiveDSToMemory();

    const cleanComps = INITIAL_COMPONENTS.filter(c => !c.id.startsWith('graphic-')).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    let comps = [];
    let incIds = [];

    if (template === 'enterprise') {
      comps = JSON.parse(JSON.stringify(cleanComps));
      incIds = [
        'filter-chip', 'button', 'compact-button', 'chip', 'input-field',
        'checkbox', 'radio-button', 'switch-toggle', 'select', 'badge',
        'avatar', 'card', 'dialog-modal', 'dropdown-menu', 'tab',
        'table', 'toast-notification', 'tooltip'
      ];
    } else if (template === 'starter') {
      const coreIds = [
        'filter-chip', 'button', 'compact-button', 'chip', 'input-field',
        'checkbox', 'radio-button', 'switch-toggle', 'select', 'badge',
        'avatar', 'card', 'dialog-modal', 'dropdown-menu', 'tab',
        'table', 'toast-notification', 'tooltip'
      ];
      comps = JSON.parse(JSON.stringify(cleanComps.filter(c => coreIds.includes(c.id))));
      incIds = [...coreIds];
    } else { // 'blank'
      const btn = cleanComps.find(c => c.id === 'button') || cleanComps[0];
      comps = [JSON.parse(JSON.stringify(btn))];
      incIds = [btn.id];
    }

    const newTokens = JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS));
    newTokens.brand.name = (name || 'New Design System').trim();
    if (brandColor) {
      newTokens.brand.primaryColor = brandColor;
      if (typeof generateTonalPalette === 'function') {
        newTokens.brand.shades = generateTonalPalette(brandColor);
      }
    }

    const newDS = {
      id: `ds_${this.currentUser.id}_${Date.now()}`,
      name: (name || 'New Design System').trim(),
      description: (description || 'Custom multi-platform design system contracts and tokens.').trim(),
      framework: framework || 'React',
      brandColor: brandColor || '#0284C7',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: comps,
      tokens: newTokens,
      includedComponentIds: incIds,
      includedFoundations: ['colors', 'typography', 'spacing', 'radii', 'shadows', 'states'],
      customIcons: [],
      draftComponents: []
    };

    this.designSystems.push(newDS);
    this.switchDesignSystem(newDS.id);
    this.emit('ds:created', newDS);
    return newDS;
  }

  duplicateDesignSystem(dsId) {
    if (!this.currentUser) return null;
    const sourceDS = this.designSystems.find(ds => ds.id === dsId);
    if (!sourceDS) return null;

    if (this.activeDesignSystemId === dsId) {
      this.commitActiveDSToMemory();
    }

    const dup = JSON.parse(JSON.stringify(sourceDS));
    dup.id = `ds_${this.currentUser.id}_${Date.now()}`;
    dup.name = `${sourceDS.name} (Copy)`;
    dup.createdAt = new Date().toISOString();
    dup.updatedAt = new Date().toISOString();

    this.designSystems.push(dup);
    this.saveDesignSystems();
    this.switchDesignSystem(dup.id);
    this.emit('ds:created', dup);
    return dup;
  }

  deleteDesignSystem(dsId) {
    if (!this.currentUser) return false;
    if (this.designSystems.length <= 1) {
      alert('You must have at least one design system in your workspace.');
      return false;
    }
    const idx = this.designSystems.findIndex(ds => ds.id === dsId);
    if (idx === -1) return false;

    this.designSystems.splice(idx, 1);
    if (this.activeDesignSystemId === dsId) {
      const nextDS = this.designSystems[0];
      this.activeDesignSystemId = nextDS.id;
      this.loadDesignSystemData(nextDS);
    }
    this.saveDesignSystems();
    this.emit('ds:deleted', dsId);
    this.emit('ds:switched', this.getActiveDesignSystem());
    this.emit('component:selected', this.getActiveComponent());
    this.emit('project:scope-changed', {
      includedCount: this.includedComponentIds.size,
      totalCount: this.components.length
    });
    this.emit('tokens:updated', this.activeTokens);
    this.emit('filter:changed');
    return true;
  }

  // --- Tokens Management ---
  getActiveTokens() {
    if (this.activeTokens) return this.activeTokens;
    const activeDS = this.getActiveDesignSystem();
    if (activeDS && activeDS.tokens) return activeDS.tokens;
    return JSON.parse(JSON.stringify(INITIAL_BRAND_TOKENS));
  }

  saveActiveTokens(newTokens) {
    this.activeTokens = JSON.parse(JSON.stringify(newTokens));
    safeStorage.setItem('adsc_brand_tokens_v2', JSON.stringify(this.activeTokens));
    const activeDS = this.getActiveDesignSystem();
    if (activeDS) {
      activeDS.tokens = JSON.parse(JSON.stringify(this.activeTokens));
      activeDS.updatedAt = new Date().toISOString();
      this.saveDesignSystems();
    }
    this.emit('tokens:updated', this.activeTokens);
  }

  // --- Project Scope & Foundations ---
  loadIncludedComponents() {
    const saved = safeStorage.getItem('adsc_included_components');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          const clean = arr.filter(id => !id.startsWith('graphic-'));
          return new Set(clean);
        }
      } catch (e) {}
    }
    const defaultCore = [
      'filter-chip', 'button', 'compact-button', 'chip', 'input-field',
      'checkbox', 'radio-button', 'switch-toggle', 'select', 'badge',
      'avatar', 'card', 'dialog-modal', 'dropdown-menu', 'tab',
      'table', 'toast-notification', 'tooltip'
    ];
    return new Set(defaultCore);
  }

  saveIncludedComponents() {
    try {
      safeStorage.setItem('adsc_included_components', JSON.stringify(Array.from(this.includedComponentIds)));
      const activeDS = this.getActiveDesignSystem();
      if (activeDS) {
        activeDS.includedComponentIds = Array.from(this.includedComponentIds);
        activeDS.updatedAt = new Date().toISOString();
        this.saveDesignSystems();
      }
    } catch (e) {}
  }

  loadIncludedFoundations() {
    const saved = safeStorage.getItem('adsc_included_foundations');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) return new Set(arr);
      } catch (e) {}
    }
    return new Set(['colors', 'typography', 'spacing', 'radii', 'shadows', 'states']);
  }

  saveIncludedFoundations() {
    try {
      safeStorage.setItem('adsc_included_foundations', JSON.stringify(Array.from(this.includedFoundations)));
      const activeDS = this.getActiveDesignSystem();
      if (activeDS) {
        activeDS.includedFoundations = Array.from(this.includedFoundations);
        activeDS.updatedAt = new Date().toISOString();
        this.saveDesignSystems();
      }
    } catch (e) {}
  }

  toggleComponentInclusion(id) {
    if (this.includedComponentIds.has(id)) {
      this.includedComponentIds.delete(id);
    } else {
      this.includedComponentIds.add(id);
    }
    this.saveIncludedComponents();
    this.emit('project:scope-changed', {
      includedCount: this.includedComponentIds.size,
      totalCount: this.components.length
    });
  }

  isComponentIncluded(id) {
    return this.includedComponentIds.has(id);
  }

  getIncludedComponents() {
    if (!this.includedComponentIds || this.includedComponentIds.size === 0) {
      return this.components.slice(0, 18);
    }
    return this.components.filter(c => this.includedComponentIds.has(c.id));
  }

  setIncludedComponents(idsArray) {
    this.includedComponentIds = new Set(idsArray);
    this.saveIncludedComponents();
    this.emit('project:scope-changed', {
      includedCount: this.includedComponentIds.size,
      totalCount: this.components.length
    });
  }

  toggleFoundationInclusion(key) {
    if (this.includedFoundations.has(key)) {
      this.includedFoundations.delete(key);
    } else {
      this.includedFoundations.add(key);
    }
    this.saveIncludedFoundations();
    this.emit('project:scope-changed');
  }

  isFoundationIncluded(key) {
    return this.includedFoundations.has(key);
  }

  setProjectScopeFilter(filter) {
    this.projectScopeFilter = filter;
    this.emit('filter:changed');
  }

  loadInitialComponents() {
    const CURRENT_VERSION = '2.5.0';
    const savedVersion = safeStorage.getItem('adsc_components_version');
    if (savedVersion === CURRENT_VERSION) {
      const saved = safeStorage.getItem('adsc_components');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter(c => !c.id.startsWith('graphic-'));
          }
        } catch (e) {
          console.warn('Failed to parse cached components, using defaults', e);
        }
      }
    }
    safeStorage.setItem('adsc_components_version', CURRENT_VERSION);
    const cleanInitial = INITIAL_COMPONENTS.filter(c => !c.id.startsWith('graphic-')).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    safeStorage.setItem('adsc_components', JSON.stringify(cleanInitial));
    return JSON.parse(JSON.stringify(cleanInitial));
  }

  saveComponents() {
    try {
      safeStorage.setItem('adsc_components_version', '2.5.0');
      safeStorage.setItem('adsc_components', JSON.stringify(this.components));
      const activeDS = this.getActiveDesignSystem();
      if (activeDS) {
        activeDS.components = JSON.parse(JSON.stringify(this.components));
        activeDS.updatedAt = new Date().toISOString();
        this.saveDesignSystems();
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // Draft Management (Requirement 24)
  addDraft(component) {
    if (!this.draftComponents.find(d => d.id === component.id)) {
      this.draftComponents.push(JSON.parse(JSON.stringify(component)));
      const activeDS = this.getActiveDesignSystem();
      if (activeDS) {
        activeDS.draftComponents = JSON.parse(JSON.stringify(this.draftComponents));
        this.saveDesignSystems();
      }
      this.emit('draft:updated');
    }
  }

  removeDraft(componentId) {
    this.draftComponents = this.draftComponents.filter(d => d.id !== componentId);
    const activeDS = this.getActiveDesignSystem();
    if (activeDS) {
      activeDS.draftComponents = JSON.parse(JSON.stringify(this.draftComponents));
      this.saveDesignSystems();
    }
    this.emit('draft:updated');
  }

  isDraft(componentId) {
    return this.draftComponents.some(d => d.id === componentId);
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  setTheme(theme) {
    this.theme = theme;
    safeStorage.setItem('adsc_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.emit('theme:changed', theme);
  }

  setThemeMode(mode) {
    this.themeMode = mode;
    safeStorage.setItem('adsc_theme_mode', mode);
    if (mode === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.setTheme(mode);
    }
    this.emit('themeMode:changed', mode);
  }

  setView(view) {
    if (['editor', 'preview', 'matrix', 'code', 'figma', 'tokens', 'docs', 'ds-hub'].includes(view)) {
      this.currentView = view;
      this.emit('view:changed', view);
    }
  }

  setSubTab(subTab) {
    if (['props', 'anatomy', 'variants', 'preview'].includes(subTab)) {
      this.currentSubTab = subTab;
      this.emit('subTab:changed', subTab);
    }
  }

  setKindsTab(tab) {
    this.kindsTab = tab;
    this.emit('kindsTab:changed', tab);
  }

  setCanvasTheme(theme) {
    this.canvasTheme = theme;
    this.emit('canvasTheme:changed', theme);
  }

  setActiveState(state) {
    this.activeState = state;
    this.emit('state:changed', state);
  }

  setActiveComponent(id) {
    const comp = this.components.find(c => c.id === id);
    if (comp) {
      this.activeComponentId = id;
      this.emit('component:selected', comp);
    }
  }

  getActiveComponent() {
    return this.components.find(c => c.id === this.activeComponentId) || this.components[0];
  }

  setSearchQuery(q) {
    this.searchQuery = q.toLowerCase();
    this.emit('filter:changed');
  }

  setSelectedCategory(cat) {
    this.selectedCategory = cat;
    this.emit('filter:changed');
  }

  getFilteredComponents() {
    return this.components.filter(c => {
      const matchesSearch = !this.searchQuery || 
        c.name.toLowerCase().includes(this.searchQuery) ||
        (c.category && c.category.toLowerCase().includes(this.searchQuery));
      const matchesCat = this.selectedCategory === 'All' || c.category === this.selectedCategory;
      const matchesScope = this.projectScopeFilter === 'all' || this.isComponentIncluded(c.id);
      return matchesSearch && matchesCat && matchesScope;
    });
  }

  setComponentProp(propId, value) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    if (!comp.activeProps) comp.activeProps = {};
    comp.activeProps[propId] = value;
    this.saveComponents();
    this.emit('component:updated', comp);
  }

  setComponentStyles(stylesUpdate) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    comp.styles = { ...comp.styles, ...stylesUpdate };
    this.saveComponents();
    this.emit('component:updated', comp);
  }

  setComponentLayout(layoutUpdate) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    comp.layout = { ...comp.layout, ...layoutUpdate };
    this.saveComponents();
    this.emit('component:updated', comp);
  }

  renameComponent(id, newName) {
    const comp = this.components.find(c => c.id === id);
    if (!comp) return;
    comp.name = newName;
    this.saveComponents();
    this.emit('component:renamed', comp);
    this.emit('component:updated', comp);
  }

  updateComponentAnatomy(newAnatomy) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    comp.anatomy = newAnatomy;
    this.saveComponents();
    this.emit('component:updated', comp);
  }

  resetToDefault() {
    const comp = this.getActiveComponent();
    if (!comp) return;
    const initial = INITIAL_COMPONENTS.find(c => c.id === comp.id);
    if (initial) {
      Object.assign(comp, JSON.parse(JSON.stringify(initial)));
      this.saveComponents();
      this.emit('component:updated', comp);
    }
  }

  // --- Custom Icons Registry ---
  addCustomIcon(iconDef) {
    if (!this.customIcons) this.customIcons = [];
    this.customIcons.push(iconDef);
    try {
      safeStorage.setItem('adsc_custom_icons', JSON.stringify(this.customIcons));
      const activeDS = this.getActiveDesignSystem();
      if (activeDS) {
        activeDS.customIcons = JSON.parse(JSON.stringify(this.customIcons));
        activeDS.updatedAt = new Date().toISOString();
        this.saveDesignSystems();
      }
    } catch (e) {}
    this.emit('icons:updated', this.customIcons);
  }

  getCustomIcons() {
    if (!this.customIcons) {
      try {
        const saved = safeStorage.getItem('adsc_custom_icons');
        this.customIcons = saved ? JSON.parse(saved) : [];
      } catch (e) {
        this.customIcons = [];
      }
    }
    return this.customIcons;
  }

  addComponentProp(propDef) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    if (!comp.props) comp.props = [];
    const existingIdx = comp.props.findIndex(p => p.id === propDef.id);
    if (existingIdx >= 0) {
      comp.props[existingIdx] = propDef;
    } else {
      comp.props.push(propDef);
    }
    if (comp.activeProps && comp.activeProps[propDef.id] === undefined) {
      comp.activeProps[propDef.id] = propDef.defaultValue;
    }
    this.saveComponents();
    this.emit('prop-schema:updated', comp);
    this.emit('component:updated', comp);
  }

  removeComponentProp(propId) {
    const comp = this.getActiveComponent();
    if (!comp || !comp.props) return;
    comp.props = comp.props.filter(p => p.id !== propId);
    if (comp.activeProps) {
      delete comp.activeProps[propId];
    }
    this.saveComponents();
    this.emit('prop-schema:updated', comp);
    this.emit('component:updated', comp);
  }

  createNewComponent(newComp) {
    this.components.push(newComp);
    this.activeComponentId = newComp.id;
    this.currentView = 'editor';
    this.currentSubTab = 'props';
    this.saveComponents();
    this.emit('view:changed', 'editor');
    this.emit('component:created', newComp);
    this.emit('component:selected', newComp);
  }

  deleteComponent(id) {
    if (this.components.length <= 1) {
      alert('Cannot delete the only component in the library.');
      return;
    }
    this.components = this.components.filter(c => c.id !== id);
    if (this.activeComponentId === id) {
      this.activeComponentId = this.components[0].id;
    }
    this.saveComponents();
    this.emit('component:deleted', id);
    this.emit('component:selected', this.getActiveComponent());
  }

  setBridgeStatus(statusObj) {
    Object.assign(this.bridgeStatus, statusObj);
    this.emit('bridge:status', this.bridgeStatus);
  }

  // --- Hybrid LLM Configuration & State ---
  loadLLMConfig() {
    try {
      const saved = safeStorage.getItem('adsc_llm_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          provider: parsed.provider || 'gemini',
          model: parsed.model || 'gemini-2.0-flash',
          apiKey: parsed.apiKey || '',
          baseUrl: parsed.baseUrl || '',
          temperature: (parsed.temperature !== undefined) ? parsed.temperature : 0.2,
          mode: 'hybrid'
        };
      }
    } catch (e) {}

    return {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com',
      temperature: 0.2,
      mode: 'hybrid'
    };
  }

  getLLMConfig() {
    return { ...this.llmConfig };
  }

  setLLMConfig(newConfig) {
    this.llmConfig = {
      ...this.llmConfig,
      ...newConfig,
      mode: 'hybrid'
    };
    try {
      safeStorage.setItem('adsc_llm_config', JSON.stringify(this.llmConfig));
    } catch (e) {}
    this.emit('llm:config-changed', this.llmConfig);
  }

  hasCompletedLLMOnboarding() {
    return safeStorage.getItem('adsc_llm_onboarding_done') === 'true';
  }

  setLLMOnboardingCompleted(done = true) {
    safeStorage.setItem('adsc_llm_onboarding_done', String(done));
  }

  isLLMConfigured() {
    if (!this.llmConfig) return false;
    if (this.llmConfig.provider === 'local') return true;
    if (this.llmConfig.provider === 'ollama') return true;
    return Boolean(this.llmConfig.apiKey && this.llmConfig.apiKey.trim().length > 5);
  }

  getLLMProviderInfo(providerId = null) {
    const id = providerId || this.llmConfig.provider;
    return DEFAULT_LLM_PROVIDERS.find(p => p.id === id) || DEFAULT_LLM_PROVIDERS[0];
  }
}

export const store = new StateStore();
