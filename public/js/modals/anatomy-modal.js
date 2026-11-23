// AI Design System Creator - Anatomy Structured Tree View & Hierarchy Manager
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class AnatomyModal {
  constructor() {
    this.modalEl = null;
    this.selectedNodeId = null;
  }

  open() {
    this.close();
    const comp = store.getActiveComponent();
    if (!comp) return;

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'adsc-modal-backdrop';
    this.selectedNodeId = comp.anatomy ? comp.anatomy.id : null;
    this.modalEl.innerHTML = `
      <div class="adsc-modal-card anatomy-manager-card">
        <!-- Header -->
        <div class="adsc-modal-header">
          <div class="modal-title-wrap">
            <h3>Component Anatomy Hierarchy &bull; ${comp.name}</h3>
            <p class="modal-subtitle">Define nested parts (Outer box, Container, Icon, Label, Slots) &amp; layout topology</p>
          </div>
          <button class="adsc-btn-icon modal-close-btn" id="btn-close-anatomy-modal" aria-label="Close">${ICON_SVGS.x || '✕'}</button>
        </div>

        <!-- Body: Tree Structure & Node Inspector -->
        <div class="anatomy-modal-split">
          <!-- Left: Visual Tree -->
          <div class="anatomy-tree-col">
            <div class="col-head">
              <h4>Structured Architecture</h4>
              <button class="adsc-btn btn-secondary compact" id="btn-add-anatomy-part">
                ${ICON_SVGS.plus} <span>Add Part</span>
              </button>
            </div>

            <div class="anatomy-tree-scroll" id="anatomy-tree-root">
              ${this.renderTreeHTML(comp.anatomy)}
            </div>
          </div>

          <!-- Right: Live Node Details & Prop Bindings -->
          <div class="anatomy-node-col">
            <h4>Node Properties</h4>
            <div id="anatomy-node-detail-panel" class="node-detail-content">
              <div class="hint-box">
                Select a node from the anatomy tree on the left to configure layout direction, bindings, or add children.
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="anatomy-modal-footer">
          <span class="anatomy-modal-footer-hint">Hierarchical node updates are automatically saved to your design system contract.</span>
          <button type="button" class="adsc-btn btn-primary compact" id="btn-done-anatomy-modal">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    if (comp.anatomy) {
      this.renderNodeDetails(comp, comp.anatomy);
    }
    this.attachEvents(comp);
  }

  renderTreeHTML(node, depth = 0) {
    if (!node) return '<div class="empty-hint">No anatomy defined</div>';

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = this.selectedNodeId === node.id;

    return `
      <div class="anatomy-tree-node depth-${depth} ${isSelected ? 'selected' : ''}" data-node-id="${node.id}">
        <div class="tree-node-row">
          <span class="tree-connector"></span>
          <span class="tree-node-icon">${this.getTypeIcon(node.type)}</span>
          <span class="tree-node-name">${node.name}</span>
          <span class="tree-type-pill type-${node.type}">${node.type}</span>
          ${node.direction ? `<span class="tree-dir-pill">${node.direction}</span>` : ''}

          <div class="tree-node-hover-actions">
            <button class="node-action-btn btn-add-child" data-parent-id="${node.id}" title="Add Child Node">
              ${ICON_SVGS.plus}
            </button>
            ${node.id !== 'root' ? `
              <button class="node-action-btn btn-delete-node" data-id="${node.id}" title="Delete Node">
                ${ICON_SVGS.trash}
              </button>
            ` : ''}
          </div>
        </div>

        ${hasChildren ? `
          <div class="tree-children-container">
            ${node.children.map(child => this.renderTreeHTML(child, depth + 1)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  getTypeIcon(type) {
    switch (type) {
      case 'frame': return ICON_SVGS.window;
      case 'text': return ICON_SVGS.code;
      case 'icon': return ICON_SVGS.sparkles;
      case 'slot': return ICON_SVGS.layers;
      case 'button': return ICON_SVGS['cursor-click'];
      default: return ICON_SVGS.layers;
    }
  }

  attachEvents(comp) {
    const closeBtn = this.modalEl.querySelector('#btn-close-anatomy-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const doneBtn = this.modalEl.querySelector('#btn-done-anatomy-modal');
    if (doneBtn) doneBtn.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Add root child
    const addPartBtn = this.modalEl.querySelector('#btn-add-anatomy-part');
    if (addPartBtn) {
      addPartBtn.addEventListener('click', () => {
        this.promptAddChild(comp, comp.anatomy.id);
      });
    }

    this.bindTreeClicks(comp);
  }

  bindTreeClicks(comp) {
    const nodeRows = this.modalEl.querySelectorAll('.tree-node-row');
    nodeRows.forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-node-hover-actions')) return;
        const nodeEl = row.closest('.anatomy-tree-node');
        const id = nodeEl.getAttribute('data-node-id');
        this.selectedNodeId = id;

        this.modalEl.querySelectorAll('.anatomy-tree-node').forEach(n => n.classList.remove('selected'));
        nodeEl.classList.add('selected');

        const foundNode = this.findNode(comp.anatomy, id);
        if (foundNode) {
          this.renderNodeDetails(comp, foundNode);
        }
      });
    });

    // Add child buttons
    const addChildBtns = this.modalEl.querySelectorAll('.btn-add-child');
    addChildBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = btn.getAttribute('data-parent-id');
        this.promptAddChild(comp, pId);
      });
    });

    // Delete buttons
    const delBtns = this.modalEl.querySelectorAll('.btn-delete-node');
    delBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm(`Remove anatomy node "${id}"?`)) {
          this.removeNode(comp.anatomy, id);
          store.updateAnatomy(comp.anatomy);
          this.refreshTree(comp);
        }
      });
    });
  }

  renderNodeDetails(comp, node) {
    const detailPanel = this.modalEl.querySelector('#anatomy-node-detail-panel');
    if (!detailPanel) return;

    detailPanel.innerHTML = `
      <form id="node-edit-form" class="prop-config-form">
        <div class="form-group">
          <label>Node Name</label>
          <input type="text" id="edit-node-name" value="${node.name}" class="adsc-input" />
        </div>

        <div class="form-group">
          <label>Node ID</label>
          <input type="text" id="edit-node-id" value="${node.id}" disabled class="adsc-input" />
        </div>

        <div class="form-group">
          <label>Node Element Type</label>
          <select id="edit-node-type" class="adsc-select">
            <option value="frame" ${node.type === 'frame' ? 'selected' : ''}>Frame (Auto Layout Box)</option>
            <option value="text" ${node.type === 'text' ? 'selected' : ''}>Text (Typography Layer)</option>
            <option value="icon" ${node.type === 'icon' ? 'selected' : ''}>Icon (Vector Glyph)</option>
            <option value="slot" ${node.type === 'slot' ? 'selected' : ''}>Slot (Component Composition)</option>
            <option value="button" ${node.type === 'button' ? 'selected' : ''}>Button (Nested Action)</option>
          </select>
        </div>

        ${node.type === 'frame' ? `
          <div class="form-group">
            <label>Layout Direction</label>
            <select id="edit-node-dir" class="adsc-select">
              <option value="row" ${node.direction === 'row' ? 'selected' : ''}>Horizontal (Row)</option>
              <option value="column" ${node.direction === 'column' ? 'selected' : ''}>Vertical (Column)</option>
            </select>
          </div>
        ` : ''}

        ${node.type === 'text' ? `
          <div class="form-group">
            <label>Prop Binding</label>
            <input type="text" id="edit-node-binding" value="${node.propBinding || ''}" placeholder="e.g. label" class="adsc-input" />
          </div>
          <div class="form-group">
            <label>Default Text</label>
            <input type="text" id="edit-node-text" value="${node.defaultText || ''}" class="adsc-input" />
          </div>
        ` : ''}

        ${node.type === 'icon' ? `
          <div class="form-group">
            <label>Default Icon</label>
            <input type="text" id="edit-node-icon" value="${node.iconName || 'sparkles'}" class="adsc-input" />
          </div>
        ` : ''}

        <button type="submit" class="adsc-btn btn-primary mt-12">Update Node</button>
      </form>
    `;

    const form = detailPanel.querySelector('#node-edit-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        node.name = detailPanel.querySelector('#edit-node-name').value;
        node.type = detailPanel.querySelector('#edit-node-type').value;

        const dirSelect = detailPanel.querySelector('#edit-node-dir');
        if (dirSelect) node.direction = dirSelect.value;

        const bindInput = detailPanel.querySelector('#edit-node-binding');
        if (bindInput) node.propBinding = bindInput.value;

        const textInput = detailPanel.querySelector('#edit-node-text');
        if (textInput) node.defaultText = textInput.value;

        const iconInput = detailPanel.querySelector('#edit-node-icon');
        if (iconInput) node.iconName = iconInput.value;

        store.updateAnatomy(comp.anatomy);
        this.refreshTree(comp);
      });
    }
  }

  promptAddChild(comp, parentId) {
    const childName = prompt('Enter child part name (e.g. "Status Indicator", "Trailing Slot"):');
    if (!childName) return;

    const childType = prompt('Enter part type ("frame", "text", "icon", "slot"):', 'frame') || 'frame';
    const childId = childName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newChild = {
      id: childId,
      name: childName,
      type: childType,
      visible: true
    };

    if (childType === 'frame') {
      newChild.direction = 'row';
      newChild.children = [];
    } else if (childType === 'text') {
      newChild.defaultText = childName;
    } else if (childType === 'icon') {
      newChild.iconName = 'check';
    }

    const parent = this.findNode(comp.anatomy, parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(newChild);
      store.updateAnatomy(comp.anatomy);
      this.refreshTree(comp);
    }
  }

  findNode(root, id) {
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  removeNode(root, id) {
    if (!root.children) return false;
    const idx = root.children.findIndex(c => c.id === id);
    if (idx >= 0) {
      root.children.splice(idx, 1);
      return true;
    }
    for (const child of root.children) {
      if (this.removeNode(child, id)) return true;
    }
    return false;
  }

  refreshTree(comp) {
    const root = this.modalEl.querySelector('#anatomy-tree-root');
    if (root) {
      root.innerHTML = this.renderTreeHTML(comp.anatomy);
      this.bindTreeClicks(comp);
    }
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
