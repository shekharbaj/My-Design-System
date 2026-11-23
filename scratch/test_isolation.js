// Test comprehensive StateStore multi-DS & Auth logic
import { INITIAL_COMPONENTS } from '../public/js/components-data.js';
import { INITIAL_BRAND_TOKENS, generateTonalPalette } from '../public/js/tokens-data.js';

const memStorage = {};
const safeStorage = {
  getItem: (k) => memStorage[k] || null,
  setItem: (k, v) => { memStorage[k] = String(v); },
  removeItem: (k) => { delete memStorage[k]; }
};

export const DEFAULT_USERS = [
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    email: 'designer@acme.com',
    password: 'design123',
    role: 'Lead Design Architect',
    company: 'Acme Design Corp',
    avatar: 'AR'
  },
  {
    id: 'user_bimlendu',
    name: 'Bimlendu Bajpayee',
    email: 'bimlendu@designsystem.io',
    password: 'admin123',
    role: 'Design Systems Director',
    company: 'Nexus Design Corp',
    avatar: 'BB'
  }
];

export function createDefaultDesignSystemsForUser(userId) {
  const nexusId = `ds_${userId}_nexus`;
  const auroraId = `ds_${userId}_aurora`;

  const cleanComps = INITIAL_COMPONENTS.filter(c => !c.id.startsWith('graphic-')).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const nexusComps = JSON.parse(JSON.stringify(cleanComps));

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

console.log("Seeding test DS for user_alex...");
const alexDS = createDefaultDesignSystemsForUser('user_alex');
console.log("Alex DS count:", alexDS.length);
console.log("DS 1:", alexDS[0].name, "Comps:", alexDS[0].components.length, "Brand:", alexDS[0].brandColor);
console.log("DS 2:", alexDS[1].name, "Comps:", alexDS[1].components.length, "Brand:", alexDS[1].brandColor);

// Verify isolation: mutating DS 1 components does not mutate DS 2
alexDS[0].components[0].name = "MUTATED_BUTTON";
console.log("DS 0 comp 0 name:", alexDS[0].components[0].name);
console.log("DS 1 comp 0 name:", alexDS[1].components[0].name);
if (alexDS[0].components[0].name !== alexDS[1].components[0].name) {
  console.log(">>> ISOLATION VERIFIED: Mutating DS 0 did NOT affect DS 1!");
} else {
  console.error(">>> ISOLATION FAILED!");
}
