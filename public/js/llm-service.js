// AI Design System Creator - Unified LLM Service (Hybrid Architecture)
import { store, DEFAULT_LLM_PROVIDERS } from './store.js';

class LLMService {
  constructor() {
    this.activeBaseUrl = window.location.origin;
  }

  // Test credentials and connection to chosen LLM provider
  async testConnection(config = null) {
    const cfg = config || store.getLLMConfig();
    if (cfg.provider === 'local') {
      return {
        success: true,
        provider: 'local',
        model: 'rule-based-engine',
        latencyMs: 1,
        message: '✓ Local deterministic engine ready (Offline Hybrid mode)'
      };
    }

    try {
      const res = await fetch(`${this.activeBaseUrl}/api/llm/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: cfg.provider,
          model: cfg.model,
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl
        })
      });

      const data = await res.json();
      return data;
    } catch (err) {
      return {
        success: false,
        error: `Could not reach server bridge: ${err.message}. Ensure start.bat or node server.js is running.`
      };
    }
  }

  // Generic LLM generation request
  async generate({ prompt, systemPrompt, temperature = 0.2 }) {
    const cfg = store.getLLMConfig();

    if (cfg.provider === 'local') {
      return {
        success: true,
        text: `[Local Engine result for: ${prompt.slice(0, 80)}]`
      };
    }

    try {
      const res = await fetch(`${this.activeBaseUrl}/api/llm/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: cfg.provider,
          model: cfg.model,
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          prompt,
          systemPrompt,
          temperature
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status} from LLM service`);
      }
      return data;
    } catch (err) {
      console.warn('[LLMService] Generation error:', err);
      throw err;
    }
  }

  // Synthesize a complete component schema from a natural language prompt
  async synthesizeComponent(userPrompt, category = 'Actions & Triggers') {
    const cfg = store.getLLMConfig();

    // 1. If provider is local or not configured, use local deterministic synthesizer
    if (cfg.provider === 'local' || !store.isLLMConfigured()) {
      return this.synthesizeComponentLocally(userPrompt, category);
    }

    // 2. LLM Prompt-to-Component Generation
    const systemPrompt = `You are a Principal Design System Architect. 
Given a user's natural language component request, produce a clean, valid JSON specification for a design system component.
Output ONLY raw JSON with no Markdown code fences, no backticks, and no preamble.
Schema required:
{
  "name": "Component Name",
  "category": "${category}",
  "description": "Short purpose",
  "archetype": "custom" | "pill" | "card",
  "anatomy": {
    "id": "root",
    "name": "Outer Frame",
    "type": "frame",
    "direction": "row" | "column",
    "children": [
      { "id": "part-1", "name": "Leading Icon", "type": "icon", "iconName": "sparkles" },
      { "id": "part-2", "name": "Label Layer", "type": "text", "propBinding": "label", "defaultText": "Text" }
    ]
  },
  "props": {
    "variant": { "type": "variant", "name": "Variant", "values": ["Primary", "Secondary", "Outline"], "defaultValue": "Primary" },
    "size": { "type": "size", "name": "Size", "values": ["sm", "md", "lg"], "defaultValue": "md" },
    "state": { "type": "state", "name": "State", "values": ["Rest", "Hover", "Disabled"], "defaultValue": "Rest" }
  },
  "defaultStyles": {
    "bg": "#C2410C",
    "text": "#FFFFFF",
    "border": "#9A3412",
    "cornerRadius": 8,
    "padding": { "top": 8, "right": 16, "bottom": 8, "left": 16 },
    "gap": 8
  }
}`;

    try {
      const response = await this.generate({
        prompt: `Create a comprehensive design system component for: "${userPrompt}"`,
        systemPrompt,
        temperature: 0.1
      });

      let jsonStr = (response.text || '').trim();
      // Clean possible Markdown fences
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      const parsed = JSON.parse(jsonStr);
      parsed.id = (parsed.name || userPrompt).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return { success: true, component: parsed, source: 'llm', model: cfg.model };
    } catch (err) {
      console.warn('[LLMService] LLM synthesis failed, falling back to local synthesizer:', err);
      const fallback = this.synthesizeComponentLocally(userPrompt, category);
      fallback.warning = `LLM call failed (${err.message}). Created using built-in deterministic engine.`;
      return fallback;
    }
  }

  // Local fallback component synthesizer (Zero network, 100% deterministic)
  synthesizeComponentLocally(userPrompt, category = 'Actions & Triggers') {
    const cleanName = (userPrompt || 'Custom Component')
      .split(' ')
      .slice(0, 4)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    
    const id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const isPill = userPrompt.toLowerCase().includes('pill') || userPrompt.toLowerCase().includes('badge') || userPrompt.toLowerCase().includes('tag');
    const isCard = userPrompt.toLowerCase().includes('card') || userPrompt.toLowerCase().includes('modal') || userPrompt.toLowerCase().includes('container');

    return {
      success: true,
      source: 'local',
      model: 'rule-based-engine',
      component: {
        id,
        name: cleanName,
        category,
        description: `Synthesized design system component for "${userPrompt}"`,
        archetype: isPill ? 'pill' : (isCard ? 'card' : 'custom'),
        anatomy: {
          id: 'root',
          name: 'Outer Frame',
          type: 'frame',
          direction: isCard ? 'column' : 'row',
          children: [
            { id: 'part-icon', name: 'Leading Icon', type: 'icon', iconName: isPill ? 'tag' : 'sparkles' },
            { id: 'part-label', name: 'Label Layer', type: 'text', propBinding: 'label', defaultText: cleanName }
          ]
        },
        props: {
          variant: { type: 'variant', name: 'Variant', values: ['Primary', 'Secondary', 'Outline'], defaultValue: 'Primary' },
          size: { type: 'size', name: 'Size', values: ['sm', 'md', 'lg'], defaultValue: 'md' },
          state: { type: 'state', name: 'State', values: ['Rest', 'Hover', 'Disabled'], defaultValue: 'Rest' }
        },
        activeProps: {
          variant: 'Primary',
          size: 'md',
          state: 'Rest',
          label: cleanName
        },
        defaultStyles: {
          bg: '#C2410C',
          text: '#FFFFFF',
          border: '#9A3412',
          cornerRadius: isPill ? 999 : 8,
          padding: { top: 8, right: 16, bottom: 8, left: 16 },
          gap: 8
        }
      }
    };
  }

  // Extract brand guidelines tokens (colors, fonts, radii) using LLM
  async extractBrandTokensFromText(guidelineText, fileName = 'Brand Guidelines') {
    const cfg = store.getLLMConfig();

    if (cfg.provider === 'local' || !store.isLLMConfigured()) {
      return null; // Return null so local regex extractor handles it
    }

    const systemPrompt = `You are a Design Tokens Specialist.
Analyze the provided brand guidelines excerpt and extract the brand's core design tokens.
Output ONLY raw JSON with no Markdown code fences, no backticks, and no preamble.
Schema required:
{
  "brandName": "Brand Name",
  "primaryColor": "#Hex",
  "secondaryColor": "#Hex",
  "accentColor": "#Hex",
  "neutralDark": "#Hex",
  "neutralLight": "#Hex",
  "fontPrimary": "Font Family Name",
  "fontSecondary": "Font Family Name",
  "baseRadius": 8,
  "summary": "Short 1-sentence summary of the brand aesthetic"
}`;

    try {
      const response = await this.generate({
        prompt: `Extract design system tokens from this brand manual:\n\n${guidelineText.slice(0, 4000)}`,
        systemPrompt,
        temperature: 0.1
      });

      let jsonStr = (response.text || '').trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      const parsed = JSON.parse(jsonStr);
      return { success: true, tokens: parsed, model: cfg.model };
    } catch (e) {
      console.warn('[LLMService] Brand token extraction via LLM failed:', e);
      return null;
    }
  }

  // Generate Component Documentation (Do's & Don'ts, ARIA accessibility specs)
  async generateComponentDocs(comp) {
    const cfg = store.getLLMConfig();
    const systemPrompt = `You are an Enterprise Design System Documentation Specialist.
Given a UI component contract, write professional design system documentation.
Output ONLY raw JSON with no Markdown code fences:
{
  "summary": "1-2 sentence overview of usage context",
  "whenToUse": ["bullet 1", "bullet 2", "bullet 3"],
  "whenNotToUse": ["bullet 1", "bullet 2"],
  "dos": ["Do: clear instruction", "Do: clear instruction"],
  "donts": ["Don't: clear anti-pattern", "Don't: clear anti-pattern"],
  "accessibility": {
    "ariaRole": "e.g. button, alert, dialog",
    "keyboardNavigation": "Keyboard interaction specifications (Enter, Space, Arrows, Escape)",
    "screenReader": "Screen reader guidance and aria-live announcements"
  }
}`;

    try {
      const response = await this.generate({
        prompt: `Generate complete documentation specs for component: "${comp.name}" (${comp.category || 'General'}) with properties: ${Object.keys(comp.props || {}).join(', ')}`,
        systemPrompt,
        temperature: 0.2
      });

      let jsonStr = (response.text || '').trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      return { success: true, docs: JSON.parse(jsonStr), model: cfg.model };
    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }
}

export const llmService = new LLMService();
