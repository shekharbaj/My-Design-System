// AI Design System Creator - Create New Design System Modal Dialog
import { store } from '../store.js';

export class NewDSModal {
  constructor() {
    this.modalEl = null;
    this.selectedColor = '#0284C7';
    this.selectedTemplate = 'enterprise';
    this.initModal();
  }

  initModal() {
    let existing = document.getElementById('new-ds-modal-backdrop');
    if (existing) existing.remove();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'new-ds-modal-backdrop';
    this.modalEl.className = 'adsc-modal-backdrop';
    this.modalEl.style.display = 'none';

    document.body.appendChild(this.modalEl);
  }

  open() {
    if (!this.modalEl) this.initModal();
    this.selectedColor = '#0284C7';
    this.selectedTemplate = 'enterprise';
    this.render();
    this.modalEl.style.display = 'flex';
  }

  close() {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  render() {
    const PRESET_COLORS = [
      { name: 'Ocean Blue', hex: '#0284C7' },
      { name: 'Vivid Violet', hex: '#7C3AED' },
      { name: 'Terracotta', hex: '#C2410C' },
      { name: 'Emerald', hex: '#10B981' },
      { name: 'Amber', hex: '#F59E0B' },
      { name: 'Crimson', hex: '#DC2626' },
      { name: 'Midnight', hex: '#334155' }
    ];

    this.modalEl.innerHTML = `
      <div class="adsc-modal-card new-ds-modal-card" style="width: 600px; max-width: 95vw;">
        <div class="adsc-modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px; color: #7C3AED;">❖</span>
            <div>
              <h3 style="margin: 0; font-size: 17px; font-weight: 700;">Create New Design System</h3>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-tertiary, #64748B);">Each design system is completely isolated with its own tokens, contracts, and component library.</p>
            </div>
          </div>
          <button class="adsc-modal-close" id="btn-close-new-ds" title="Close dialog">✕</button>
        </div>

        <form id="form-create-ds" class="adsc-modal-body" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Name -->
          <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 12.5px; font-weight: 600;">Design System Name *</label>
            <input 
              type="text" 
              id="new-ds-name" 
              required 
              placeholder="e.g. Solaris FinTech UI" 
              style="padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-frame, #CBD5E1); font-size: 13.5px;"
            />
          </div>

          <!-- Description -->
          <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 12.5px; font-weight: 600;">Description</label>
            <textarea 
              id="new-ds-desc" 
              rows="2" 
              placeholder="Brief overview of target application and audience..."
              style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-frame, #CBD5E1); font-size: 13px; resize: vertical;"
            ></textarea>
          </div>

          <!-- Framework -->
          <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 12.5px; font-weight: 600;">Target Frontend Framework</label>
            <select id="new-ds-framework" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-frame, #CBD5E1); font-size: 13px;">
              <option value="React">React (TypeScript / JSX)</option>
              <option value="Vue 3">Vue 3 (Composition API)</option>
              <option value="Web Components">Web Components (Standard Custom Elements)</option>
              <option value="Angular">Angular (Standalone Components)</option>
              <option value="Svelte">Svelte 5</option>
              <option value="HTML / CSS">HTML5 / Bootstrap CSS</option>
            </select>
          </div>

          <!-- Brand Color -->
          <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 12.5px; font-weight: 600;">Primary Brand Color</label>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <input 
                type="color" 
                id="new-ds-color-picker" 
                value="${this.selectedColor}" 
                style="width: 38px; height: 38px; padding: 2px; border-radius: 8px; border: 1px solid #CBD5E1; cursor: pointer;"
              />
              <input 
                type="text" 
                id="new-ds-color-hex" 
                value="${this.selectedColor}" 
                style="width: 100px; padding: 8px 10px; border-radius: 8px; border: 1px solid #CBD5E1; font-family: monospace; font-size: 13px;"
              />
              <div class="color-presets-row" style="display: flex; gap: 6px; margin-left: auto;">
                ${PRESET_COLORS.map(c => `
                  <button 
                    type="button" 
                    class="color-preset-btn ${this.selectedColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}" 
                    data-hex="${c.hex}" 
                    title="${c.name}" 
                    style="width: 24px; height: 24px; border-radius: 50%; background: ${c.hex}; border: 2px solid ${this.selectedColor.toLowerCase() === c.hex.toLowerCase() ? '#000' : 'transparent'}; cursor: pointer;"
                  ></button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Starter Template -->
          <div class="form-group" style="display: flex; flex-direction: column; gap: 8px;">
            <label style="font-size: 12.5px; font-weight: 600;">Starter Foundation Template</label>
            <div class="template-selection-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div class="template-option-card ${this.selectedTemplate === 'enterprise' ? 'active' : ''}" data-template="enterprise" style="padding: 12px; border-radius: 10px; border: 2px solid ${this.selectedTemplate === 'enterprise' ? '#7C3AED' : '#E2E8F0'}; cursor: pointer;">
                <div style="font-size: 16px; margin-bottom: 4px;">🏢</div>
                <strong style="font-size: 12.5px; display: block; margin-bottom: 2px;">Full Enterprise</strong>
                <span style="font-size: 11px; color: #64748B; display: block;">All 59 components & specs</span>
              </div>
              <div class="template-option-card ${this.selectedTemplate === 'starter' ? 'active' : ''}" data-template="starter" style="padding: 12px; border-radius: 10px; border: 2px solid ${this.selectedTemplate === 'starter' ? '#7C3AED' : '#E2E8F0'}; cursor: pointer;">
                <div style="font-size: 16px; margin-bottom: 4px;">🚀</div>
                <strong style="font-size: 12.5px; display: block; margin-bottom: 2px;">Core Starter</strong>
                <span style="font-size: 11px; color: #64748B; display: block;">18 essential UI primitives</span>
              </div>
              <div class="template-option-card ${this.selectedTemplate === 'blank' ? 'active' : ''}" data-template="blank" style="padding: 12px; border-radius: 10px; border: 2px solid ${this.selectedTemplate === 'blank' ? '#7C3AED' : '#E2E8F0'}; cursor: pointer;">
                <div style="font-size: 16px; margin-bottom: 4px;">✨</div>
                <strong style="font-size: 12.5px; display: block; margin-bottom: 2px;">Blank Canvas</strong>
                <span style="font-size: 11px; color: #64748B; display: block;">Clean slate (1 seed comp)</span>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--border-subtle, #E2E8F0);">
            <button type="button" class="btn-cancel" id="btn-cancel-new-ds" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; cursor: pointer;">Cancel</button>
            <button type="submit" class="btn-submit" style="padding: 8px 18px; border-radius: 8px; background: #7C3AED; color: #fff; font-weight: 600; border: none; cursor: pointer;">Create & Open &rarr;</button>
          </div>
        </form>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Close
    const closeBtn = this.modalEl.querySelector('#btn-close-new-ds');
    const cancelBtn = this.modalEl.querySelector('#btn-cancel-new-ds');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    // Color picker
    const picker = this.modalEl.querySelector('#new-ds-color-picker');
    const hexInput = this.modalEl.querySelector('#new-ds-color-hex');
    if (picker && hexInput) {
      picker.addEventListener('input', (e) => {
        this.selectedColor = e.target.value;
        hexInput.value = e.target.value;
      });
      hexInput.addEventListener('input', (e) => {
        this.selectedColor = e.target.value;
        picker.value = e.target.value;
      });
    }

    // Preset color buttons
    const presetBtns = this.modalEl.querySelectorAll('.color-preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.getAttribute('data-hex');
        this.selectedColor = hex;
        if (picker) picker.value = hex;
        if (hexInput) hexInput.value = hex;
        presetBtns.forEach(b => b.style.border = '2px solid transparent');
        btn.style.border = '2px solid #000';
      });
    });

    // Template selection cards
    const templateCards = this.modalEl.querySelectorAll('.template-option-card');
    templateCards.forEach(card => {
      card.addEventListener('click', () => {
        templateCards.forEach(c => {
          c.classList.remove('active');
          c.style.borderColor = '#E2E8F0';
        });
        card.classList.add('active');
        card.style.borderColor = '#7C3AED';
        this.selectedTemplate = card.getAttribute('data-template');
      });
    });

    // Form submit
    const form = this.modalEl.querySelector('#form-create-ds');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.modalEl.querySelector('#new-ds-name')?.value;
        const description = this.modalEl.querySelector('#new-ds-desc')?.value;
        const framework = this.modalEl.querySelector('#new-ds-framework')?.value;

        const newDS = store.createDesignSystem({
          name,
          description,
          framework,
          brandColor: this.selectedColor,
          template: this.selectedTemplate
        });

        this.close();
        store.setView('editor');
      });
    }
  }
}
