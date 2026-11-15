// AI Design System Creator - Central Reactive State Store
import { INITIAL_COMPONENTS } from './components-data.js';

class StateStore {
  constructor() {
    this.listeners = new Map();
    this.theme = localStorage.getItem('adsc_theme') || 'light';
    this.themeMode = localStorage.getItem('adsc_theme_mode') || 'light'; // 'system' | 'light' | 'dark'
    this.currentView = 'editor'; // 'editor' | 'preview' | 'matrix' | 'code' | 'figma' | 'tokens' | 'docs'
    this.currentSubTab = 'preview'; // 'preview' (default per Req 21) | 'props' | 'anatomy' | 'variants'
    this.kindsTab = 'kinds'; // 'kinds' | 'library'
    this.draftComponents = []; // Active unpublished drafts (Req 24)
    this.components = this.loadInitialComponents();
    // Default to 'filter-chip' to match attachment
    const filterChipComp = this.components.find(c => c.id === 'filter-chip');
    this.activeComponentId = filterChipComp ? 'filter-chip' : (this.components[0]?.id || 'filter-chip');
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
    this.includedComponentIds = this.loadIncludedComponents();
    this.includedFoundations = this.loadIncludedFoundations();
  }

  loadIncludedComponents() {
    const saved = localStorage.getItem('adsc_included_components');
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          const clean = arr.filter(id => !id.startsWith('graphic-'));
          return new Set(clean);
        }
      } catch (e) {}
    }
    // Default core starter set for a new design system project
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
      localStorage.setItem('adsc_included_components', JSON.stringify(Array.from(this.includedComponentIds)));
    } catch (e) {}
  }

  loadIncludedFoundations() {
    const saved = localStorage.getItem('adsc_included_foundations');
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
      localStorage.setItem('adsc_included_foundations', JSON.stringify(Array.from(this.includedFoundations)));
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
    const savedVersion = localStorage.getItem('adsc_components_version');
    if (savedVersion === CURRENT_VERSION) {
      const saved = localStorage.getItem('adsc_components');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            // Filter out old graphics if any
            return parsed.filter(c => !c.id.startsWith('graphic-'));
          }
        } catch (e) {
          console.warn('Failed to parse cached components, using defaults', e);
        }
      }
    }
    // Automatically load fresh design system components without graphics
    localStorage.setItem('adsc_components_version', CURRENT_VERSION);
    const cleanInitial = INITIAL_COMPONENTS.filter(c => !c.id.startsWith('graphic-'));
    localStorage.setItem('adsc_components', JSON.stringify(cleanInitial));
    return JSON.parse(JSON.stringify(cleanInitial));
  }

  saveComponents() {
    try {
      localStorage.setItem('adsc_components_version', '2.5.0');
      localStorage.setItem('adsc_components', JSON.stringify(this.components));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // Draft Management (Requirement 24)
  addDraft(component) {
    if (!this.draftComponents.find(d => d.id === component.id)) {
      this.draftComponents.push(JSON.parse(JSON.stringify(component)));
      this.emit('draft:updated');
    }
  }

  removeDraft(componentId) {
    this.draftComponents = this.draftComponents.filter(d => d.id !== componentId);
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

  // Getters
  getActiveComponent() {
    return this.components.find(c => c.id === this.activeComponentId) || this.components[0];
  }

  getFilteredComponents() {
    return this.components.filter(c => {
      const matchesSearch = !this.searchQuery || 
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'All' || c.category === this.selectedCategory;
      const matchesProjectScope = this.projectScopeFilter !== 'in_project' || this.includedComponentIds.has(c.id);
      return matchesSearch && matchesCategory && matchesProjectScope;
    });
  }

  getCategories() {
    const set = new Set(['All']);
    this.components.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }

  // Actions
  setThemeMode(mode) {
    this.themeMode = mode;
    localStorage.setItem('adsc_theme_mode', mode);
    let resolvedTheme = mode;
    if (mode === 'system') {
      resolvedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    this.setTheme(resolvedTheme);
    this.emit('themeMode:changed', mode);
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('adsc_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.emit('theme:changed', theme);
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  setView(view) {
    if (['editor', 'preview', 'matrix', 'code', 'figma', 'tokens', 'docs'].includes(view)) {
      this.currentView = view;
      this.emit('view:changed', view);
    }
  }

  addPropToActiveComponent(propDef) {
    this.addComponentProp(propDef);
  }

  setSubTab(subTab) {
    if (['preview', 'props', 'anatomy', 'variants'].includes(subTab)) {
      this.currentSubTab = subTab;
      this.emit('subTab:changed', subTab);
    }
  }

  setKindsTab(tab) {
    if (['kinds', 'library'].includes(tab)) {
      this.kindsTab = tab;
      this.emit('kindsTab:changed', tab);
    }
  }

  renameActiveComponent(newName) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    comp.name = newName;
    this.saveComponents();
    this.emit('component:renamed', comp);
    this.emit('component:updated', comp);
  }

  setActiveComponent(id) {
    const comp = this.components.find(c => c.id === id);
    if (comp) {
      this.activeComponentId = id;
      this.currentSubTab = 'preview'; // Show Preview first per Requirement 21
      this.emit('component:selected', comp);
    }
  }

  setSearchQuery(q) {
    this.searchQuery = q;
    this.emit('filter:changed', { query: q, category: this.selectedCategory });
  }

  setSelectedCategory(cat) {
    this.selectedCategory = cat;
    this.emit('filter:changed', { query: this.searchQuery, category: cat });
  }

  setActiveState(state) {
    this.activeState = state;
    const comp = this.getActiveComponent();
    if (comp && comp.activeProps) {
      comp.activeProps.state = state;
    }
    this.emit('state:changed', state);
    this.emit('component:updated', comp);
  }

  updateActiveProp(propId, value) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    if (!comp.activeProps) comp.activeProps = {};
    comp.activeProps[propId] = value;
    if (propId === 'state') {
      this.activeState = value;
    }
    this.saveComponents();
    this.emit('props:updated', { component: comp, propId, value });
    this.emit('component:updated', comp);
  }

  updateLayoutStyles(layoutUpdates) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    if (!comp.styles) comp.styles = {};
    Object.assign(comp.styles, layoutUpdates);
    this.saveComponents();
    this.emit('styles:updated', { component: comp, styles: comp.styles });
    this.emit('component:updated', comp);
  }

  updateVariantStyles(variantName, stateName, styleObj) {
    const comp = this.getActiveComponent();
    if (!comp || !comp.styles || !comp.styles.variants) return;
    if (!comp.styles.variants[variantName]) comp.styles.variants[variantName] = {};
    comp.styles.variants[variantName][stateName] = Object.assign(
      {},
      comp.styles.variants[variantName][stateName] || {},
      styleObj
    );
    this.saveComponents();
    this.emit('styles:updated', { component: comp, styles: comp.styles });
    this.emit('component:updated', comp);
  }

  updateAnatomy(newAnatomy) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    comp.anatomy = newAnatomy;
    this.saveComponents();
    this.emit('anatomy:updated', { component: comp, anatomy: newAnatomy });
    this.emit('component:updated', comp);
  }

  addComponentProp(propDef) {
    const comp = this.getActiveComponent();
    if (!comp) return;
    if (!comp.props) comp.props = [];
    // Check collision
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
}

export const store = new StateStore();
