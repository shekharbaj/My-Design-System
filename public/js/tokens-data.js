// AI Design System Creator - Design Tokens, Brand Guidelines & Color Swatch System

// Color utility helpers
export function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

// Generates 11 tonal swatches (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) from base color
export function generateTonalPalette(baseHex) {
  const rgb = hexToRgb(baseHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const steps = [
    { name: '50', l: 96, sOffset: -8 },
    { name: '100', l: 92, sOffset: -5 },
    { name: '200', l: 84, sOffset: -3 },
    { name: '300', l: 74, sOffset: -2 },
    { name: '400', l: 62, sOffset: 0 },
    { name: '500', l: 50, sOffset: 0 }, // base reference
    { name: '600', l: 40, sOffset: 2 },
    { name: '700', l: 30, sOffset: 4 },
    { name: '800', l: 22, sOffset: 6 },
    { name: '900', l: 15, sOffset: 8 },
    { name: '950', l: 8, sOffset: 10 }
  ];

  const palette = {};
  steps.forEach(step => {
    const s = Math.min(100, Math.max(0, hsl.s + step.sOffset));
    const c = hslToRgb(hsl.h, s, step.l);
    palette[step.name] = rgbToHex(c.r, c.g, c.b);
  });

  return palette;
}

// Initial Brand Tokens
export const INITIAL_BRAND_TOKENS = {
  brand: {
    name: "Terracotta Design System",
    description: "Modern, warm terracotta brand guidelines with high-contrast UI tokens",
    primary: {
      name: "Terracotta Primary",
      base: "#8A3816",
      shades: generateTonalPalette("#8A3816")
    },
    secondary: {
      name: "Ocean Secondary",
      base: "#2563EB",
      shades: generateTonalPalette("#2563EB")
    },
    tertiary: {
      name: "Emerald Tertiary",
      base: "#10B981",
      shades: generateTonalPalette("#10B981")
    }
  },
  ui: {
    backgrounds: {
      light: {
        page: "#FAFAF9",
        surface: "#FFFFFF",
        elevated: "#FFFFFF",
        subtle: "#F5F5F4",
        border: "#E7E5E4"
      },
      dark: {
        page: "#121212",
        surface: "#1C1917",
        elevated: "#292524",
        subtle: "#1F1D1B",
        border: "#292524"
      }
    },
    typography: {
      light: {
        heading: "#1C1917",
        body: "#44403C",
        muted: "#78716C",
        inverse: "#FFFFFF"
      },
      dark: {
        heading: "#FAFAF9",
        body: "#E7E5E4",
        muted: "#A8A29E",
        inverse: "#1C1917"
      }
    },
    iconography: {
      primary: "#1C1917",
      secondary: "#78716C",
      brand: "#8A3816",
      darkPrimary: "#FAFAF9",
      darkSecondary: "#A8A29E"
    },
    semantics: {
      error: {
        base: "#EF4444",
        lightBg: "#FEF2F2",
        lightBorder: "#FCA5A5",
        darkBg: "#450A0A",
        shades: generateTonalPalette("#EF4444")
      },
      warning: {
        base: "#F59E0B",
        lightBg: "#FFFBEB",
        lightBorder: "#FDE68A",
        darkBg: "#451A03",
        shades: generateTonalPalette("#F59E0B")
      },
      success: {
        base: "#10B981",
        lightBg: "#ECFDF5",
        lightBorder: "#6EE7B7",
        darkBg: "#064E3B",
        shades: generateTonalPalette("#10B981")
      },
      info: {
        base: "#3B82F6",
        lightBg: "#EFF6FF",
        lightBorder: "#BFDBFE",
        darkBg: "#172554",
        shades: generateTonalPalette("#3B82F6")
      }
    }
  },
  customColors: [
    {
      id: "accent-purple",
      name: "Figma Purple",
      role: "Accent & Integrations",
      base: "#A259FF",
      shades: generateTonalPalette("#A259FF")
    },
    {
      id: "brand-gold",
      name: "Trophy Gold",
      role: "Milestones & Achievements",
      base: "#F59E0B",
      shades: generateTonalPalette("#F59E0B")
    }
  ],
  typographyTokens: {
    fontFamilySans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    scale: [
      { step: 'xs', size: '11px', lineHeight: '16px', weight: '400' },
      { step: 'sm', size: '12px', lineHeight: '18px', weight: '400' },
      { step: 'base', size: '14px', lineHeight: '20px', weight: '400' },
      { step: 'md', size: '16px', lineHeight: '24px', weight: '500' },
      { step: 'lg', size: '18px', lineHeight: '28px', weight: '600' },
      { step: 'xl', size: '22px', lineHeight: '32px', weight: '700' },
      { step: '2xl', size: '28px', lineHeight: '36px', weight: '700' }
    ]
  },
  spacing: [
    { name: "0", val: "0px" },
    { name: "1", val: "4px" },
    { name: "2", val: "8px" },
    { name: "3", val: "12px" },
    { name: "4", val: "16px" },
    { name: "5", val: "20px" },
    { name: "6", val: "24px" },
    { name: "8", val: "32px" },
    { name: "10", val: "40px" },
    { name: "12", val: "48px" },
    { name: "16", val: "64px" }
  ],
  radii: {
    none: "0px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    full: "9999px"
  }
};

// Preset Brand Themes to quickly apply from URLs / Brand archetypes
export const BRAND_PRESETS = [
  {
    name: "Terracotta Studio",
    primary: "#8A3816",
    secondary: "#2563EB",
    tertiary: "#10B981",
    desc: "Warm earth tones with crisp slate neutrals"
  },
  {
    name: "Linear Midnight",
    primary: "#5E6AD2",
    secondary: "#22C55E",
    tertiary: "#F59E0B",
    desc: "Deep indigo with high-tech neon accents"
  },
  {
    name: "Stripe Emerald",
    primary: "#635BFF",
    secondary: "#00D4B2",
    tertiary: "#FF5A5F",
    desc: "Vibrant developer-focused purple and electric teal"
  },
  {
    name: "Nordic Minimal",
    primary: "#0F172A",
    secondary: "#64748B",
    tertiary: "#0EA5E9",
    desc: "High-contrast monochrome with sky blue accents"
  },
  {
    name: "Sunset Orange",
    primary: "#EA580C",
    secondary: "#D946EF",
    tertiary: "#06B6D4",
    desc: "Bold energetic gradient hues with warm surfaces"
  }
];
