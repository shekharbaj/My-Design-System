// AI Design System Creator - Live Code & Contract Generator
import { store } from '../store.js';
import { ICON_SVGS } from '../components-data.js';

export class CodeView {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeTab = 'json'; // 'json' | 'react' | 'types' | 'css'
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    store.subscribe('component:selected', () => this.render());
    store.subscribe('component:updated', () => this.updateCode());
    store.subscribe('props:updated', () => this.updateCode());
    store.subscribe('anatomy:updated', () => this.updateCode());
    store.subscribe('styles:updated', () => this.updateCode());
    store.subscribe('prop-schema:updated', () => this.updateCode());
  }

  render() {
    const comp = store.getActiveComponent();
    if (!comp) return;

    this.container.innerHTML = `
      <div class="code-view-layout">
        <!-- Code Header & Navigation -->
        <div class="code-header-bar">
          <div class="code-tabs-nav">
            <button class="code-tab-btn ${this.activeTab === 'json' ? 'active' : ''}" data-tab="json">
              ${ICON_SVGS.code}
              <span>JSON Contract (DTCG)</span>
            </button>
            <button class="code-tab-btn ${this.activeTab === 'react' ? 'active' : ''}" data-tab="react">
              <span>React / JSX</span>
            </button>
            <button class="code-tab-btn ${this.activeTab === 'types' ? 'active' : ''}" data-tab="types">
              <span>TypeScript Interfaces</span>
            </button>
            <button class="code-tab-btn ${this.activeTab === 'css' ? 'active' : ''}" data-tab="css">
              <span>CSS / Tailwind Tokens</span>
            </button>
          </div>

          <div class="code-actions-group">
            <button class="adsc-btn btn-secondary compact" id="btn-copy-code">
              ${ICON_SVGS.copy}
              <span id="copy-btn-text">Copy Code</span>
            </button>
            <button class="adsc-btn btn-primary compact" id="btn-download-code">
              ${ICON_SVGS.download}
              <span>Download File</span>
            </button>
          </div>
        </div>

        <!-- Code Workspace Area -->
        <div class="code-display-container">
          <div class="code-meta-bar">
            <span class="file-path">design-tokens/${comp.id}.${this.getFileExtension()}</span>
            <span class="schema-version">Specification v1.0.0 &bull; Auto-synced live</span>
          </div>

          <pre class="code-pre-block"><code class="code-inner-block" id="code-content">${this.escapeHtml(this.generateActiveCode(comp))}</code></pre>
        </div>
      </div>
    `;

    this.attachListeners(comp);
  }

  updateCode() {
    const comp = store.getActiveComponent();
    const codeBlock = this.container.querySelector('#code-content');
    if (codeBlock && comp) {
      codeBlock.innerHTML = this.escapeHtml(this.generateActiveCode(comp));
    }
  }

  attachListeners(comp) {
    // Tab switching
    const tabs = this.container.querySelectorAll('.code-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabKey = tab.getAttribute('data-tab');
        this.activeTab = tabKey;
        tabs.forEach(t => t.classList.toggle('active', t === tab));
        
        const pathEl = this.container.querySelector('.file-path');
        if (pathEl) pathEl.textContent = `design-tokens/${comp.id}.${this.getFileExtension()}`;
        
        this.updateCode();
      });
    });

    // Copy button
    const copyBtn = this.container.querySelector('#btn-copy-code');
    const copyText = this.container.querySelector('#copy-btn-text');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const currentComp = store.getActiveComponent();
        const code = this.generateActiveCode(currentComp);
        try {
          await navigator.clipboard.writeText(code);
          if (copyText) copyText.textContent = 'Copied!';
          setTimeout(() => {
            if (copyText) copyText.textContent = 'Copy Code';
          }, 2000);
        } catch (e) {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          if (copyText) copyText.textContent = 'Copied!';
          setTimeout(() => {
            if (copyText) copyText.textContent = 'Copy Code';
          }, 2000);
        }
      });
    }

    // Download button
    const dlBtn = this.container.querySelector('#btn-download-code');
    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        const currentComp = store.getActiveComponent();
        const code = this.generateActiveCode(currentComp);
        const filename = `${currentComp.id}.${this.getFileExtension()}`;
        const blob = new Blob([code], { type: this.getMimeType() });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }
  }

  getFileExtension() {
    switch (this.activeTab) {
      case 'json': return 'tokens.json';
      case 'react': return 'tsx';
      case 'types': return 'd.ts';
      case 'css': return 'css';
      default: return 'txt';
    }
  }

  getMimeType() {
    switch (this.activeTab) {
      case 'json': return 'application/json';
      case 'react': return 'text/typescript';
      case 'types': return 'text/typescript';
      case 'css': return 'text/css';
      default: return 'text/plain';
    }
  }

  generateActiveCode(comp) {
    switch (this.activeTab) {
      case 'json': return this.generateJsonContract(comp);
      case 'react': return this.generateReactCode(comp);
      case 'types': return this.generateTypeDefinitions(comp);
      case 'css': return this.generateCssTokens(comp);
      default: return '';
    }
  }

  generateJsonContract(comp) {
    const contract = {
      $schema: "https://design-tokens.github.io/community-group/spec/drafts/tokens.json",
      component: {
        id: comp.id,
        name: comp.name,
        category: comp.category,
        description: comp.description,
        version: "1.0.0",
        lastUpdated: new Date().toISOString()
      },
      anatomy: comp.anatomy,
      properties: comp.props.map(p => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        defaultValue: p.defaultValue,
        options: p.options || undefined,
        description: p.description
      })),
      activeState: {
        props: comp.activeProps,
        state: store.activeState
      },
      tokens: {
        layout: {
          padding: comp.styles?.padding,
          gap: `${comp.styles?.gap ?? 8}px`,
          cornerRadius: `${comp.styles?.cornerRadius ?? 8}px`,
          borderWidth: `${comp.styles?.borderWidth ?? 1}px`,
          alignment: comp.styles?.align || 'center'
        },
        variants: comp.styles?.variants || {},
        sizes: comp.styles?.sizes || {}
      },
      variantMatrix: comp.matrixConfig || {}
    };

    return JSON.stringify(contract, null, 2);
  }

  generateReactCode(comp) {
    const pascalName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
    const propTypes = comp.props.map(p => {
      let t = 'any';
      if (p.kind === 'text') t = 'string';
      if (p.kind === 'on_off') t = 'boolean';
      if (p.kind === 'number') t = 'number';
      if (p.kind === 'event') t = '() => void';
      if (p.kind === 'options' && p.options) t = p.options.map(o => `'${o}'`).join(' | ');
      if (p.kind === 'state') t = `'Rest' | 'Hover' | 'Focus' | 'Press'`;
      if (p.kind === 'slot') t = 'React.ReactNode';
      return `  ${p.id}?: ${t};`;
    }).join('\n');

    return `import React, { useState } from 'react';
import './${comp.id}.css';

export interface ${pascalName}Props {
${propTypes}
  className?: string;
  style?: React.CSSProperties;
}

export const ${pascalName}: React.FC<${pascalName}Props> = ({
${comp.props.map(p => `  ${p.id} = ${JSON.stringify(p.defaultValue)},`).join('\n')}
  className = '',
  style,
  ...restProps
}) => {
  const [internalState, setInternalState] = useState<'Rest' | 'Hover' | 'Focus' | 'Press'>('Rest');

  return (
    <div
      className={\`adsc-${comp.id} variant-\${variant} size-\${size} state-\${internalState} \${className}\`}
      onMouseEnter={() => setInternalState('Hover')}
      onMouseLeave={() => setInternalState('Rest')}
      onMouseDown={() => setInternalState('Press')}
      onMouseUp={() => setInternalState('Hover')}
      onFocus={() => setInternalState('Focus')}
      onBlur={() => setInternalState('Rest')}
      style={style}
      {...restProps}
    >
      {/* Component anatomy rendered according to design tokens */}
      ${comp.anatomy?.children?.map(c => `      <div className="anatomy-${c.id}">{/* ${c.name} */}</div>`).join('\n') || ''}
      <span className="label-text">{label}</span>
    </div>
  );
};

export default ${pascalName};
`;
  }

  generateTypeDefinitions(comp) {
    const pascalName = comp.name.replace(/[^a-zA-Z0-9]/g, '');
    return `// TypeScript Definitions for ${comp.name} Design System Component
export type ${pascalName}Variant = ${comp.styles?.variants ? Object.keys(comp.styles.variants).map(v => `'${v}'`).join(' | ') : 'string'};
export type ${pascalName}State = 'Rest' | 'Hover' | 'Focus' | 'Press';
export type ${pascalName}Size = 'sm' | 'md' | 'lg';

export interface ${pascalName}Schema {
  id: string;
  name: string;
  category: string;
  activeProps: {
${comp.props.map(p => `    ${p.id}: ${typeof p.defaultValue === 'string' ? `'${p.defaultValue}'` : typeof p.defaultValue};`).join('\n')}
  };
  styles: {
    padding: { top: number; right: number; bottom: number; left: number };
    gap: number;
    cornerRadius: number;
    borderWidth: number;
  };
}
`;
  }

  generateCssTokens(comp) {
    const p = comp.styles?.padding || { top: 10, right: 18, bottom: 10, left: 18 };
    return `:root {
  /* ${comp.name} Auto Layout Tokens */
  --${comp.id}-padding-top: ${p.top}px;
  --${comp.id}-padding-right: ${p.right}px;
  --${comp.id}-padding-bottom: ${p.bottom}px;
  --${comp.id}-padding-left: ${p.left}px;
  --${comp.id}-gap: ${comp.styles?.gap ?? 8}px;
  --${comp.id}-radius: ${comp.styles?.cornerRadius ?? 8}px;
  --${comp.id}-border-width: ${comp.styles?.borderWidth ?? 1}px;

  /* Variant Tokens */
${Object.entries(comp.styles?.variants || {}).map(([vName, states]) => {
  return Object.entries(states).map(([sName, s]) => {
    return `  --${comp.id}-${vName}-${sName.toLowerCase()}-bg: ${s.bg};
  --${comp.id}-${vName}-${sName.toLowerCase()}-text: ${s.text};
  --${comp.id}-${vName}-${sName.toLowerCase()}-border: ${s.border};`;
  }).join('\n');
}).join('\n\n')}
}
`;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
