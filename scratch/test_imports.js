// Quick test script for store.js Multi-DS & Auth features
import { INITIAL_COMPONENTS } from '../public/js/components-data.js';
import { INITIAL_BRAND_TOKENS, generateTonalPalette } from '../public/js/tokens-data.js';

console.log("INITIAL_COMPONENTS count:", INITIAL_COMPONENTS.length);
console.log("INITIAL_BRAND_TOKENS brand:", INITIAL_BRAND_TOKENS.brand.name);
console.log("generateTonalPalette:", typeof generateTonalPalette);
