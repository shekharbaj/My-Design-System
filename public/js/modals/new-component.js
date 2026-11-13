// AI Design System Creator - New Component Modal
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class NewComponentModal {
  constructor() {
    this.modalEl = null;
  }

  open() {
    this.close();

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'adsc-modal-backdrop';
    this.modalEl.innerHTML = `
      <div class="adsc-modal-card new-comp-card">
        <!-- Header -->
        <div class="adsc-modal-header">
          <div class="modal-title-wrap">
            <h3>Create New Component</h3>
            <p class="modal-subtitle">Add a new component to your design system token library</p>
          </div>
          <button class="adsc-btn-icon modal-close-btn" id="btn-close-new-comp">${ICON_SVGS.x}</button>
        </div>

        <!-- Body -->
        <form id="new-comp-form" class="new-comp-form">
          <div class="form-group">
            <label>Component Name</label>
            <input type="text" id="new-comp-name" placeholder="e.g. Notification Banner, Card, Tabs" required class="adsc-input" />
          </div>

          <div class="form-group">
            <label>Component Category</label>
            <select id="new-comp-category" class="adsc-select">
              <option value="Actions">Actions & Triggers</option>
              <option value="Overlays & Modals">Overlays & Modals</option>
              <option value="Filters & Selection">Filters & Selection</option>
              <option value="Navigation & Menus">Navigation & Menus</option>
              <option value="Feedback & Status">Feedback & Status</option>
              <option value="Data Display">Data Display</option>
            </select>
          </div>

          <div class="form-group">
            <label>Description</label>
            <input type="text" id="new-comp-desc" placeholder="Component design purpose and usage context" class="adsc-input" />
          </div>

          <div class="form-group">
            <label>Preset Archetype Template</label>
            <div class="archetype-grid">
              <label class="archetype-option active">
                <input type="radio" name="archetype" value="custom" checked />
                <div class="archetype-box">
                  <span class="arch-icon">${ICON_SVGS.layers}</span>
                  <span class="arch-title">Standard Box</span>
                  <span class="arch-desc">Frame with label & icons</span>
                </div>
              </label>

              <label class="archetype-option">
                <input type="radio" name="archetype" value="pill" />
                <div class="archetype-box">
                  <span class="arch-icon">${ICON_SVGS.tag}</span>
                  <span class="arch-title">Pill / Badge</span>
                  <span class="arch-desc">Rounded 9999px status tag</span>
                </div>
              </label>

              <label class="archetype-option">
                <input type="radio" name="archetype" value="card" />
                <div class="archetype-box">
                  <span class="arch-icon">${ICON_SVGS.window}</span>
                  <span class="arch-title">Card Container</span>
                  <span class="arch-desc">Header, body & footer box</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-actions-row mt-16">
            <button type="button" class="adsc-btn btn-secondary" id="btn-cancel-new-comp">Cancel</button>
            <button type="submit" class="adsc-btn btn-primary">${ICON_SVGS.plus} <span>Create Component</span></button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(this.modalEl);
    this.attachEvents();
  }

  attachEvents() {
    const closeBtn = this.modalEl.querySelector('#btn-close-new-comp');
    const cancelBtn = this.modalEl.querySelector('#btn-cancel-new-comp');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Archetype selection toggle
    const radioBoxes = this.modalEl.querySelectorAll('.archetype-option');
    radioBoxes.forEach(rb => {
      rb.addEventListener('click', () => {
        radioBoxes.forEach(b => b.classList.remove('active'));
        rb.classList.add('active');
      });
    });

    const form = this.modalEl.querySelector('#new-comp-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.modalEl.querySelector('#new-comp-name').value.trim();
        const category = this.modalEl.querySelector('#new-comp-category').value;
        const desc = this.modalEl.querySelector('#new-comp-desc').value.trim() || 'Custom design system component.';
        const archetype = this.modalEl.querySelector('input[name="archetype"]:checked')?.value || 'custom';

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const newComp = this.buildComponentTemplate(id, name, category, desc, archetype);
        store.createNewComponent(newComp);
        this.close();
      });
    }
  }

  buildComponentTemplate(id, name, category, desc, archetype) {
    const isPill = archetype === 'pill';
    const isCard = archetype === 'card';

    return {
      id,
      name,
      category,
      description: desc,
      icon: isPill ? 'tag' : isCard ? 'window' : 'layers',
      anatomy: {
        id: 'root',
        name: isCard ? 'Card Outer Frame' : 'Container Box',
        type: 'frame',
        direction: isCard ? 'column' : 'row',
        padding: isCard 
          ? { top: 20, right: 20, bottom: 20, left: 20 }
          : { top: 8, right: 16, bottom: 8, left: 16 },
        gap: 8,
        align: isCard ? 'stretch' : 'center',
        children: [
          {
            id: 'leading-icon',
            name: 'Leading Icon',
            type: 'icon',
            iconName: 'sparkles',
            visible: true
          },
          {
            id: 'content-label',
            name: 'Content Label',
            type: 'text',
            propBinding: 'label',
            defaultText: name,
            typography: { fontSize: 14, fontWeight: '500', lineHeight: 20 }
          }
        ]
      },
      props: [
        {
          id: 'label',
          name: 'Label',
          kind: 'text',
          defaultValue: name,
          description: 'Display text'
        },
        {
          id: 'variant',
          name: 'Variant',
          kind: 'options',
          options: ['primary', 'secondary', 'subtle'],
          defaultValue: 'primary',
          description: 'Appearance styling'
        },
        {
          id: 'size',
          name: 'Size',
          kind: 'options',
          options: ['sm', 'md', 'lg'],
          defaultValue: 'md',
          description: 'Sizing scale'
        },
        {
          id: 'state',
          name: 'Interaction State',
          kind: 'state',
          options: ['Rest', 'Hover', 'Focus', 'Press'],
          defaultValue: 'Rest',
          description: 'State variant'
        }
      ],
      activeProps: {
        label: name,
        variant: 'primary',
        size: 'md',
        state: 'Rest'
      },
      styles: {
        padding: isCard 
          ? { top: 20, right: 20, bottom: 20, left: 20 }
          : { top: 8, right: 16, bottom: 8, left: 16 },
        gap: 8,
        align: isCard ? 'stretch' : 'center',
        cornerRadius: isPill ? 9999 : isCard ? 12 : 8,
        borderWidth: 1,
        variants: {
          primary: {
            Rest: { bg: '#3B82F6', text: '#FFFFFF', border: '#2563EB', shadow: '0 1px 2px rgba(0,0,0,0.05)' },
            Hover: { bg: "#2563EB", text: "#FFFFFF", border: "#1D4ED8", shadow: "0 4px 6px rgba(37,99,235,0.2)" },
            Focus: { bg: "#2563EB", text: "#FFFFFF", border: "#93C5FD", shadow: "0 0 0 3px rgba(59,130,246,0.3)" },
            Press: { bg: "#1D4ED8", text: "#FFFFFF", border: "#1E40AF", shadow: "inset 0 1px 2px rgba(0,0,0,0.15)" }
          },
          secondary: {
            Rest: { bg: '#F3F4F6', text: '#1F2937', border: '#E5E7EB', shadow: 'none' },
            Hover: { bg: '#E5E7EB', text: '#111827', border: '#D1D5DB', shadow: 'none' },
            Focus: { bg: '#E5E7EB', text: '#111827', border: '#9CA3AF', shadow: '0 0 0 2px rgba(156,163,175,0.2)' },
            Press: { bg: '#D1D5DB', text: '#111827', border: '#9CA3AF', shadow: 'none' }
          },
          subtle: {
            Rest: { bg: '#FFFFFF', text: '#374151', border: '#D1D5DB', shadow: 'none' },
            Hover: { bg: '#F9FAFB', text: '#111827', border: '#9CA3AF', shadow: 'none' },
            Focus: { bg: '#FFFFFF', text: '#111827', border: '#3B82F6', shadow: '0 0 0 3px rgba(59,130,246,0.2)' },
            Press: { bg: '#F3F4F6', text: '#111827', border: '#6B7280', shadow: 'none' }
          }
        },
        sizes: {
          sm: { padding: { top: 6, right: 10, bottom: 6, left: 10 }, fontSize: 12, cornerRadius: isPill ? 9999 : 6 },
          md: { padding: { top: 8, right: 16, bottom: 8, left: 16 }, fontSize: 14, cornerRadius: isPill ? 9999 : 8 },
          lg: { padding: { top: 12, right: 22, bottom: 12, left: 22 }, fontSize: 16, cornerRadius: isPill ? 9999 : 10 }
        }
      },
      matrixConfig: {
        rowProp: 'variant',
        rowValues: ['primary', 'secondary', 'subtle'],
        colProp: 'state',
        colValues: ['Rest', 'Hover', 'Focus', 'Press'],
        thirdProp: 'size',
        thirdValue: 'md'
      }
    };
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
