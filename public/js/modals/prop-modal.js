// AI Design System Creator - Exact Match "New / Edit prop" Modal (Image 2 Reference)
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class PropModal {
  constructor() {
    this.modalEl = null;
    this.isEditing = false;
    this.editingPropId = null;
    this.selectedKind = 'state'; // default to state matching screenshot
    this.optionsList = ['Rest', 'Focus', 'Hover', 'Press'];
    this.defaultValue = 'Rest';
    this.existsIn = 'figma_only'; // 'figma_and_code' | 'figma_only' | 'code_only'
    this.inLibraryTag = 'State';
    this.propName = 'Interaction states';
  }

  open(initialKind = 'state', initialName = '', existingProp = null) {
    this.close(); // Clean up if existing
    const comp = store.getActiveComponent();
    if (!comp) return;

    if (existingProp) {
      this.isEditing = true;
      this.editingPropId = existingProp.id;
      this.selectedKind = existingProp.kind || initialKind;
      this.propName = existingProp.name || initialName;
      this.defaultValue = existingProp.defaultValue !== undefined ? existingProp.defaultValue : 'Rest';
      this.optionsList = existingProp.options ? [...existingProp.options] : (existingProp.kind === 'state' ? ['Rest', 'Focus', 'Hover', 'Press'] : []);
      this.existsIn = existingProp.existsIn || (existingProp.kind === 'state' ? 'figma_only' : 'figma_and_code');
      this.inLibraryTag = existingProp.name || 'Property';
    } else {
      this.isEditing = false;
      this.editingPropId = null;
      this.selectedKind = initialKind;
      this.setupDefaultsForKind(initialKind, initialName);
    }

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'adsc-modal-backdrop';
    this.modalEl.innerHTML = this.renderModalContent();

    document.body.appendChild(this.modalEl);
    this.attachEvents(comp);
  }

  setupDefaultsForKind(kind, name) {
    switch (kind) {
      case 'state':
        this.optionsList = ['Rest', 'Focus', 'Hover', 'Press'];
        this.defaultValue = 'Rest';
        this.existsIn = 'figma_only';
        this.inLibraryTag = 'State';
        this.propName = name || 'Interaction states';
        break;
      case 'options':
        this.optionsList = ['Primary', 'Secondary', 'Tertiary'];
        this.defaultValue = 'Primary';
        this.existsIn = 'figma_and_code';
        this.inLibraryTag = 'Variant';
        this.propName = name || 'Variant';
        break;
      case 'on_off':
        this.optionsList = ['true', 'false'];
        this.defaultValue = 'false';
        this.existsIn = 'figma_and_code';
        this.inLibraryTag = 'Toggle';
        this.propName = name || 'Show icon';
        break;
      case 'text':
        this.optionsList = [];
        this.defaultValue = 'Label';
        this.existsIn = 'figma_and_code';
        this.inLibraryTag = 'Text';
        this.propName = name || 'Label';
        break;
      case 'swap':
        this.optionsList = ['circle-alert', 'check', 'star', 'chevron-down'];
        this.defaultValue = 'circle-alert';
        this.existsIn = 'figma_and_code';
        this.inLibraryTag = 'Icon';
        this.propName = name || 'Icon';
        break;
      case 'slot':
        this.optionsList = [];
        this.defaultValue = 'content';
        this.existsIn = 'figma_and_code';
        this.inLibraryTag = 'Slot';
        this.propName = name || 'Content slot';
        break;
      case 'number':
        this.optionsList = [];
        this.defaultValue = '0';
        this.existsIn = 'code_only';
        this.inLibraryTag = 'Count';
        this.propName = name || 'Badge count';
        break;
      case 'event':
        this.optionsList = [];
        this.defaultValue = 'onClick';
        this.existsIn = 'code_only';
        this.inLibraryTag = 'Event';
        this.propName = name || 'Click handler';
        break;
      default:
        this.optionsList = ['Rest', 'Focus', 'Hover', 'Press'];
        this.defaultValue = 'Rest';
        this.existsIn = 'figma_only';
        this.inLibraryTag = 'State';
        this.propName = name || 'Interaction states';
        break;
    }
  }

  renderModalContent() {
    return `
      <div class="new-prop-dialog-card" id="new-prop-dialog">
        <!-- Dialog Header -->
        <div class="new-prop-header">
          <h3 class="new-prop-title">${this.isEditing ? 'Configure property' : 'New prop'}</h3>
          <button class="new-prop-close-btn" id="btn-close-new-prop" title="Close">✕</button>
        </div>

        <!-- Dialog Body -->
        <div class="new-prop-body">
          <!-- Kind Section (8 tiles matching reference Image 2) -->
          <div class="new-prop-section">
            <label class="new-prop-label">Kind</label>
            <div class="new-prop-kinds-grid">
              <button class="np-kind-tile ${this.selectedKind === 'options' ? 'active' : ''}" data-kind="options">
                <span class="np-icon">≡</span>
                <span class="np-title">Options</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'on_off' ? 'active' : ''}" data-kind="on_off">
                <span class="np-icon">◐</span>
                <span class="np-title">On / off</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'text' ? 'active' : ''}" data-kind="text">
                <span class="np-icon">↔</span>
                <span class="np-title">Text</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'swap' ? 'active' : ''}" data-kind="swap">
                <span class="np-icon">↺</span>
                <span class="np-title">Swap</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'slot' ? 'active' : ''}" data-kind="slot">
                <span class="np-icon">□</span>
                <span class="np-title">Slot</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'number' ? 'active' : ''}" data-kind="number">
                <span class="np-icon">#</span>
                <span class="np-title">Number</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'event' ? 'active' : ''}" data-kind="event">
                <span class="np-icon">⚡</span>
                <span class="np-title">Event</span>
              </button>
              <button class="np-kind-tile ${this.selectedKind === 'state' ? 'active' : ''}" data-kind="state">
                <span class="np-icon">✦</span>
                <span class="np-title">Interaction states</span>
              </button>
            </div>
          </div>

          <!-- Name Section -->
          <div class="new-prop-section">
            <label class="new-prop-label">Name</label>
            <input type="text" class="new-prop-input" id="np-name-input" value="${this.propName}" placeholder="Property name" />
          </div>

          <!-- In the library Section -->
          <div class="new-prop-section">
            <label class="new-prop-label">In the library</label>
            <div class="library-tag-pill-wrap">
              <span class="library-tag-pill">${this.inLibraryTag}</span>
            </div>
          </div>

          <!-- Options Section (visible for options/state/swap) -->
          ${(this.selectedKind === 'options' || this.selectedKind === 'state' || this.selectedKind === 'swap') ? `
            <div class="new-prop-section">
              <label class="new-prop-label">Options</label>
              <div class="options-tag-input-box" id="options-tag-box">
                ${this.optionsList.map(opt => `
                  <span class="option-chip" data-opt="${opt}">
                    ${opt} <span class="chip-remove" data-remove="${opt}">×</span>
                  </span>
                `).join('')}
                <input type="text" class="tag-sub-input" id="new-option-input" placeholder="Add another" />
              </div>
            </div>

            <!-- Default Value Section -->
            <div class="new-prop-section">
              <label class="new-prop-label">Default</label>
              <div class="segmented-choice-row" id="default-choice-row">
                ${this.optionsList.map(opt => `
                  <button class="seg-choice-btn ${String(this.defaultValue) === String(opt) ? 'active' : ''}" data-val="${opt}">
                    ${opt}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : `
            <!-- Default text/value input for other types -->
            <div class="new-prop-section">
              <label class="new-prop-label">Default Value</label>
              <input type="text" class="new-prop-input" id="np-default-input" value="${this.defaultValue}" />
            </div>
          `}

          <!-- Exists in Section -->
          <div class="new-prop-section">
            <label class="new-prop-label">Exists in</label>
            <div class="segmented-choice-row">
              <button class="seg-choice-btn ${this.existsIn === 'figma_and_code' ? 'active' : ''}" data-exists="figma_and_code">
                Figma and code
              </button>
              <button class="seg-choice-btn ${this.existsIn === 'figma_only' ? 'active' : ''}" data-exists="figma_only">
                Figma only
              </button>
              <button class="seg-choice-btn ${this.existsIn === 'code_only' ? 'active' : ''}" data-exists="code_only">
                Code only
              </button>
            </div>
          </div>

          <!-- Informational Helper Note matching Image 2 -->
          <div class="new-prop-helper-note">
            ${this.getHelperNoteText()}
          </div>
        </div>

        <!-- Dialog Footer Actions -->
        <div class="new-prop-footer">
          ${this.isEditing ? `
            <button class="adsc-btn btn-danger-ghost compact" id="btn-delete-prop-modal" style="margin-right: auto;">
              Delete
            </button>
          ` : ''}
          <button class="adsc-btn btn-secondary" id="btn-cancel-new-prop">Cancel</button>
          <button class="adsc-btn btn-primary" id="btn-submit-new-prop">
            ${this.isEditing ? 'Save prop' : 'Add prop'}
          </button>
        </div>
      </div>
    `;
  }

  getHelperNoteText() {
    if (this.selectedKind === 'state') {
      return 'Figma draws each state; code uses :hover, :focus and :active.';
    }
    if (this.existsIn === 'figma_only') {
      return 'Stored for Figma component sets and variants.';
    }
    if (this.existsIn === 'code_only') {
      return 'Configured for React TSX component props and event handlers.';
    }
    return 'Synced across Figma component properties and React / TypeScript interfaces.';
  }

  attachEvents(comp) {
    const dialog = this.modalEl.querySelector('#new-prop-dialog');
    if (!dialog) return;

    // Close button
    const closeBtn = dialog.querySelector('#btn-close-new-prop');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Cancel button
    const cancelBtn = dialog.querySelector('#btn-cancel-new-prop');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    // Delete button (when editing)
    const deleteBtn = dialog.querySelector('#btn-delete-prop-modal');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Remove property "${this.propName}" from ${comp.name}?`)) {
          store.removeComponentProp(this.editingPropId);
          this.close();
        }
      });
    }

    // Backdrop click
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Kind tiles click
    const kindTiles = dialog.querySelectorAll('.np-kind-tile');
    kindTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const kind = tile.getAttribute('data-kind');
        const currentName = dialog.querySelector('#np-name-input')?.value || '';
        this.selectedKind = kind;
        if (!this.isEditing) {
          this.setupDefaultsForKind(kind, currentName);
        }
        this.modalEl.innerHTML = this.renderModalContent();
        this.attachEvents(comp);
      });
    });

    // Name input change
    const nameInput = dialog.querySelector('#np-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.propName = e.target.value;
      });
    }

    // Default input change for non-options
    const defaultInput = dialog.querySelector('#np-default-input');
    if (defaultInput) {
      defaultInput.addEventListener('input', (e) => {
        this.defaultValue = e.target.value;
      });
    }

    // Default choice buttons
    const defaultBtns = dialog.querySelectorAll('#default-choice-row .seg-choice-btn');
    defaultBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        defaultBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.defaultValue = btn.getAttribute('data-val');
      });
    });

    // Exists in choice buttons
    const existsBtns = dialog.querySelectorAll('[data-exists]');
    existsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        existsBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.existsIn = btn.getAttribute('data-exists');
        const helper = dialog.querySelector('.new-prop-helper-note');
        if (helper) helper.textContent = this.getHelperNoteText();
      });
    });

    // Option chip remove
    const removeBtns = dialog.querySelectorAll('.chip-remove');
    removeBtns.forEach(rb => {
      rb.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = rb.getAttribute('data-remove');
        this.optionsList = this.optionsList.filter(o => o !== opt);
        if (this.defaultValue === opt && this.optionsList.length > 0) {
          this.defaultValue = this.optionsList[0];
        }
        this.modalEl.innerHTML = this.renderModalContent();
        this.attachEvents(comp);
      });
    });

    // Add option input
    const newOptInput = dialog.querySelector('#new-option-input');
    if (newOptInput) {
      newOptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = newOptInput.value.trim().replace(',', '');
          if (val && !this.optionsList.includes(val)) {
            this.optionsList.push(val);
            newOptInput.value = '';
            this.modalEl.innerHTML = this.renderModalContent();
            this.attachEvents(comp);
          }
        }
      });
    }

    // Submit Add/Save Prop button
    const submitBtn = dialog.querySelector('#btn-submit-new-prop');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const name = this.propName.trim() || 'New Prop';
        const id = this.isEditing ? this.editingPropId : (name.toLowerCase().replace(/[^a-z0-9]/g, '') || `prop_${Date.now()}`);

        const propDef = {
          id: id,
          name: name,
          kind: this.selectedKind,
          defaultValue: this.defaultValue,
          options: this.optionsList.length > 0 ? this.optionsList : undefined,
          existsIn: this.existsIn
        };

        store.addComponentProp(propDef);
        this.close();
      });
    }
  }

  close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
  }
}
