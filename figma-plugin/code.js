// =========================================================================
// AI Design System Creator - Figma Companion Plugin Canvas Engine
// Version: 2.5.0 - Updated Nov 22, 2026
// Generates Native Figma Component Sets, Color Styles, Variables & Variant Matrices
// =========================================================================

figma.showUI(__html__, { width: 380, height: 540, themeColors: true });

// Helper: Hex string to Figma RGBA (0-1)
function hexToFigmaColor(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0.23, g: 0.51, b: 0.96 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0.23, g: 0.51, b: 0.96 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}

// Helper: Create or update a native Figma PaintStyle (Color Style)
function getOrCreatePaintStyle(stylePath, hexColor, description = '') {
  if (!hexColor || typeof hexColor !== 'string') return null;
  try {
    const existingStyles = figma.getLocalPaintStyles();
    let style = existingStyles.find(s => s.name === stylePath);
    if (!style) {
      style = figma.createPaintStyle();
      style.name = stylePath;
    }
    const color = hexToFigmaColor(hexColor);
    style.paints = [{
      type: 'SOLID',
      color: color
    }];
    if (description) {
      style.description = description;
    }
    return style;
  } catch (e) {
    console.warn('PaintStyle creation failed for ' + stylePath, e);
    return null;
  }
}

// Helper: Create or update Figma Color Variable (Local Variables)
function getOrCreateColorVariable(collection, modeId, varName, hexColor, description = '') {
  if (!collection || !modeId || !figma.variables || typeof figma.variables.createVariable !== 'function') {
    return null;
  }
  try {
    const existingVars = figma.variables.getLocalVariables("COLOR");
    let variable = existingVars.find(v => v.name === varName && v.variableCollectionId === collection.id);
    if (!variable) {
      variable = figma.variables.createVariable(varName, collection, "COLOR");
    }
    const color = hexToFigmaColor(hexColor);
    variable.setValueForMode(modeId, { r: color.r, g: color.g, b: color.b, a: 1 });
    if (description && variable.description !== undefined) {
      variable.description = description;
    }
    return variable;
  } catch (e) {
    return null;
  }
}

// Preload standard fonts upfront once to eliminate async microtask yielding inside loops
let isFontPreloaded = false;
async function preloadStandardFonts() {
  if (isFontPreloaded) return;
  const standardFonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Bold" },
    { family: "Roboto", style: "Regular" },
    { family: "Roboto Mono", style: "Regular" },
    { family: "Arial", style: "Regular" }
  ];
  for (const font of standardFonts) {
    try {
      await figma.loadFontAsync(font);
    } catch (e) {}
  }
  isFontPreloaded = true;
}

// Synchronous safe character setter (fonts already preloaded into memory)

// Safe child appender (guards against removed/invalid nodes)
function safeAppend(parent, child) {
  if (!parent || !child) return;
  try {
    if (!parent.removed && !child.removed) {
      parent.appendChild(child);
    }
  } catch (e) {
    console.warn("safeAppend caught:", e.message);
  }
}

function safeSetCharacters(textNode, str) {
  try {
    textNode.characters = String(str ?? '');
  } catch (e) {
    try {
      textNode.fontName = { family: "Inter", style: "Regular" };
      textNode.characters = String(str ?? '');
    } catch (e2) {}
  }
}

// Global canvas placement cursor
let nextCanvasX = 0;
let nextCanvasY = 0;

// Helper: Build a single variant component node with auto-layout, fills, strokes, icons & labels

// Detect authentic component type from payload or name
function detectComponentType(compName, v) {
  if (v && v.compType) return v.compType;
  if (v && v.properties && v.properties.compType) return v.properties.compType;
  const n = (compName || '').toLowerCase();
  if (n.includes('footer')) return 'footer';
  if (n.includes('header')) return 'header';
  if (n.includes('stepper')) return 'stepper';
  if (n.includes('pagination')) return 'pagination';
  if (n.includes('slider')) return 'slider';
  if (n.includes('link')) return 'link';
  if (n.includes('upload')) return 'file-upload';
  if (n.includes('checkbox')) return 'checkbox';
  if (n.includes('switch') || n.includes('toggle')) return 'switch';
  if (n.includes('radio')) return 'radio';
  if (n.includes('input') || n.includes('textarea') || n.includes('date')) return 'input';
  if (n.includes('drawer')) return 'drawer';
  if (n.includes('modal') || n.includes('dialog')) return 'modal';
  if (n.includes('table')) return 'table';
  if (n.includes('avatar')) return 'avatar';
  if (n.includes('badge')) return 'badge';
  if (n.includes('tab')) return 'tab';
  if (n.includes('toast') || n.includes('notification')) return 'toast';
  if (n.includes('card')) return 'card';
  if (n.includes('chip')) return 'chip';
  if (n.includes('dropdown') || n.includes('select') || n.includes('menu')) return 'dropdown';
  if (n.includes('icon')) return 'icon';
  if (n.includes('accordion')) return 'accordion';
  if (n.includes('breadcrumb')) return 'breadcrumb';
  if (n.includes('progress')) return 'progress-bar';
  if (n.includes('feedback') || n.includes('alert')) return 'feedback-message';
  if (n.includes('skeleton')) return 'skeleton-loader';
  if (n.includes('empty')) return 'empty-state';
  if (n.includes('rating')) return 'rating';
  if (n.includes('popover')) return 'popover';
  if (n.includes('tooltip')) return 'tooltip';
  if (n.includes('carousel')) return 'carousel';
  if (n.includes('list') || n.includes('item')) return 'list';
  if (n.includes('tag') || n.includes('pill')) return 'tag-pill';
  if (n.includes('divider')) return 'divider';
  if (n.includes('label')) return 'label';
  return 'button';
}

// Helper: Build an authentic native Figma variant component node
function createVariantComponentNode(v, compName, targetParent) {
  const parent = targetParent || figma.currentPage;
  const compType = detectComponentType(compName, v);
  const compNode = figma.createComponent();
  compNode.name = v.name || 'Variant';

  // Icon component (Requirement 35)
  if (compType === 'icon') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    const szName = v.properties?.size || 'md';
    const dim = szName === 'sm' ? 24 : (szName === 'lg' ? 36 : 30);
    compNode.resize(dim, dim);
    compNode.fills = [];
    compNode.strokes = [];

    const iconText = figma.createText();
    safeSetCharacters(iconText, "✦");
    iconText.fontSize = szName === 'sm' ? 14 : (szName === 'lg' ? 20 : 16);
    const colName = v.properties?.color || 'Primary';
    const rgb = colName === 'Primary' ? { r: 0.76, g: 0.25, b: 0.05 } : (colName === 'Success' ? { r: 0.08, g: 0.5, b: 0.24 } : { r: 0.12, g: 0.16, b: 0.22 });
    iconText.fills = [{ type: 'SOLID', color: rgb }];
    compNode.appendChild(iconText);
    parent.appendChild(compNode);
    return compNode;
  }

  // Footer (Requirement 29: Real footer layout, NOT a solid button!)
  if (compType === 'footer') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 10;
    compNode.paddingTop = 14;
    compNode.paddingBottom = 14;
    compNode.paddingLeft = 18;
    compNode.paddingRight = 18;
    compNode.resize(340, 72);
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    compNode.strokeWeight = 1;

    const topRow = figma.createFrame();
    topRow.layoutMode = "HORIZONTAL";
    topRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    topRow.resize(304, 16);
    topRow.fills = [];

    const logo = figma.createText();
    safeSetCharacters(logo, "✦ Design System");
    logo.fontSize = 11;
    logo.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    topRow.appendChild(logo);
    compNode.appendChild(topRow);

    const copy = figma.createText();
    safeSetCharacters(copy, v.properties?.label || "© 2026 Design System");
    copy.fontSize = 10;
    copy.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    compNode.appendChild(copy);

    parent.appendChild(compNode);
    return compNode;
  }

  // Header
  if (compType === 'header') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "SPACE_BETWEEN";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.paddingLeft = 16;
    compNode.paddingRight = 16;
    compNode.paddingTop = 10;
    compNode.paddingBottom = 10;
    compNode.resize(340, 44);
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    compNode.strokeWeight = 1;

    const brand = figma.createText();
    safeSetCharacters(brand, "✦ Logo");
    brand.fontSize = 12;
    compNode.appendChild(brand);

    parent.appendChild(compNode);
    return compNode;
  }

  // Stepper
  if (compType === 'stepper') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 8;
    compNode.paddingLeft = 10;
    compNode.paddingRight = 10;
    compNode.paddingTop = 6;
    compNode.paddingBottom = 6;
    compNode.fills = [];

    const s1 = figma.createFrame();
    s1.resize(18, 18);
    s1.cornerRadius = 9;
    s1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    compNode.appendChild(s1);

    const line = figma.createFrame();
    line.resize(20, 2);
    line.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
    compNode.appendChild(line);

    const s2 = figma.createFrame();
    s2.resize(18, 18);
    s2.cornerRadius = 9;
    s2.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    compNode.appendChild(s2);

    parent.appendChild(compNode);
    return compNode;
  }

  // Pagination
  if (compType === 'pagination') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 4;
    compNode.paddingLeft = 6;
    compNode.paddingRight = 6;
    compNode.paddingTop = 4;
    compNode.paddingBottom = 4;
    compNode.fills = [];

    const pText = figma.createText();
    safeSetCharacters(pText, "‹ 1 [2] 3 ›");
    pText.fontSize = 12;
    compNode.appendChild(pText);

    parent.appendChild(compNode);
    return compNode;
  }

  // Slider
  if (compType === 'slider') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 4;
    compNode.resize(160, 32);
    compNode.paddingLeft = 6;
    compNode.paddingRight = 6;
    compNode.paddingTop = 6;
    compNode.paddingBottom = 6;
    compNode.fills = [];

    const track = figma.createFrame();
    track.resize(148, 6);
    track.cornerRadius = 3;
    track.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.92 } }];
    compNode.appendChild(track);

    parent.appendChild(compNode);
    return compNode;
  }

  // Link
  if (compType === 'link') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 4;
    compNode.paddingLeft = 4;
    compNode.paddingRight = 4;
    compNode.paddingTop = 4;
    compNode.paddingBottom = 4;
    compNode.fills = [];

    const lText = figma.createText();
    safeSetCharacters(lText, (v.properties?.label || "Link text") + " →");
    lText.fontSize = 13;
    lText.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    compNode.appendChild(lText);

    parent.appendChild(compNode);
    return compNode;
  }

  // File Upload
  if (compType === 'file-upload') {
    compNode.layoutMode = "VERTICAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.resize(200, 72);
    compNode.cornerRadius = 8;
    compNode.paddingLeft = 12;
    compNode.paddingRight = 12;
    compNode.paddingTop = 12;
    compNode.paddingBottom = 12;
    compNode.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    compNode.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    compNode.strokeWeight = 1.5;

    const uText = figma.createText();
    safeSetCharacters(uText, "☁ Upload file");
    uText.fontSize = 12;
    compNode.appendChild(uText);

    parent.appendChild(compNode);
    return compNode;
  }

  // 1. Checkbox
  if (compType === 'checkbox') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 8;
    compNode.paddingTop = 6;
    compNode.paddingBottom = 6;
    compNode.paddingLeft = 8;
    compNode.paddingRight = 8;
    compNode.fills = [];

    const isChecked = v.properties?.checked === true || v.properties?.Checked === 'true';
    const isIndeterminate = v.properties?.checked === 'indeterminate' || v.properties?.Checked === 'indeterminate';

    // Checkbox Box
    const box = figma.createFrame();
    box.name = "Box";
    box.resize(18, 18);
    box.cornerRadius = 4;
    box.layoutMode = "HORIZONTAL";
    box.primaryAxisAlignItems = "CENTER";
    box.counterAxisAlignItems = "CENTER";

    if (isChecked || isIndeterminate) {
      box.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#C2410C') }];
      box.strokes = [];
      const checkText = figma.createText();
      checkText.name = "Checkmark";
      safeSetCharacters(checkText, isIndeterminate ? "−" : "✓");
      checkText.fontSize = 12;
      checkText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      box.appendChild(checkText);
    } else {
      box.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      box.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.border || '#D1D5DB') }];
      box.strokeWeight = 1.5;
    }
    compNode.appendChild(box);

    // Label Text
    const label = figma.createText();
    label.name = "Label";
    safeSetCharacters(label, v.properties?.label || "Checkbox");
    label.fontSize = 13;
    label.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#1F2937') }];
    compNode.appendChild(label);

    parent.appendChild(compNode);
    return compNode;
  }

  // 2. Switch / Toggle
  if (compType === 'switch') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 10;
    compNode.paddingTop = 4;
    compNode.paddingBottom = 4;
    compNode.paddingLeft = 6;
    compNode.paddingRight = 6;
    compNode.fills = [];

    const isChecked = v.properties?.checked === true || v.properties?.Checked === 'true';

    // Track frame
    const track = figma.createFrame();
    track.name = "Track";
    track.resize(38, 22);
    track.cornerRadius = 11;
    track.layoutMode = "HORIZONTAL";
    track.counterAxisAlignItems = "CENTER";
    track.primaryAxisAlignItems = isChecked ? "MAX" : "MIN";
    track.paddingLeft = 2;
    track.paddingRight = 2;
    track.fills = [{ type: 'SOLID', color: hexToFigmaColor(isChecked ? (v.styles?.bg || '#C2410C') : '#D1D5DB') }];

    // Thumb circle
    const thumb = figma.createFrame();
    thumb.name = "Thumb";
    thumb.resize(18, 18);
    thumb.cornerRadius = 9;
    thumb.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    track.appendChild(thumb);
    compNode.appendChild(track);

    // Label
    const label = figma.createText();
    label.name = "Label";
    safeSetCharacters(label, v.properties?.label || "Switch");
    label.fontSize = 13;
    label.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.16, b: 0.22 } }];
    compNode.appendChild(label);

    parent.appendChild(compNode);
    return compNode;
  }

  // 3. Radio
  if (compType === 'radio') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 8;
    compNode.paddingTop = 4;
    compNode.paddingBottom = 4;
    compNode.paddingLeft = 6;
    compNode.paddingRight = 6;
    compNode.fills = [];

    const isSelected = v.properties?.selected === true || v.properties?.Selected === 'true';

    const circle = figma.createFrame();
    circle.name = "RadioOuter";
    circle.resize(18, 18);
    circle.cornerRadius = 9;
    circle.layoutMode = "HORIZONTAL";
    circle.primaryAxisAlignItems = "CENTER";
    circle.counterAxisAlignItems = "CENTER";
    circle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    circle.strokes = [{ type: 'SOLID', color: hexToFigmaColor(isSelected ? '#C2410C' : '#D1D5DB') }];
    circle.strokeWeight = 1.5;

    if (isSelected) {
      const innerDot = figma.createFrame();
      innerDot.name = "RadioDot";
      innerDot.resize(8, 8);
      innerDot.cornerRadius = 4;
      innerDot.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
      circle.appendChild(innerDot);
    }
    compNode.appendChild(circle);

    const label = figma.createText();
    label.name = "Label";
    safeSetCharacters(label, v.properties?.label || "Radio option");
    label.fontSize = 13;
    label.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.16, b: 0.22 } }];
    compNode.appendChild(label);

    parent.appendChild(compNode);
    return compNode;
  }

  // 4. Input Field / Textarea
  if (compType === 'input') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 6;
    compNode.paddingTop = 6;
    compNode.paddingBottom = 6;
    compNode.paddingLeft = 8;
    compNode.paddingRight = 8;
    compNode.fills = [];

    const label = figma.createText();
    label.name = "FieldLabel";
    safeSetCharacters(label, v.properties?.label || compName);
    label.fontSize = 11;
    label.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.45, b: 0.52 } }];
    compNode.appendChild(label);

    const inputFrame = figma.createFrame();
    inputFrame.name = "InputBox";
    inputFrame.resize(190, 36);
    inputFrame.cornerRadius = v.styles?.cornerRadius || 6;
    inputFrame.layoutMode = "HORIZONTAL";
    inputFrame.counterAxisAlignItems = "CENTER";
    inputFrame.paddingLeft = 10;
    inputFrame.paddingRight = 10;
    inputFrame.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#FFFFFF') }];
    inputFrame.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.border || '#D1D5DB') }];
    inputFrame.strokeWeight = 1;

    const placeholder = figma.createText();
    placeholder.name = "Text";
    safeSetCharacters(placeholder, v.properties?.placeholder || "Enter value...");
    placeholder.fontSize = 13;
    placeholder.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.properties?.state === 'Filled' ? '#111827' : '#9CA3AF') }];
    inputFrame.appendChild(placeholder);
    compNode.appendChild(inputFrame);

    parent.appendChild(compNode);
    return compNode;
  }

  // 5. Modal / Dialog
  if (compType === 'modal') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 10;
    compNode.paddingTop = 14;
    compNode.paddingBottom = 14;
    compNode.paddingLeft = 14;
    compNode.paddingRight = 14;
    compNode.resize(220, 130);
    compNode.cornerRadius = 10;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.92 } }];
    compNode.strokeWeight = 1;

    // Header row
    const header = figma.createFrame();
    header.name = "ModalHeader";
    header.layoutMode = "HORIZONTAL";
    header.primaryAxisAlignItems = "SPACE_BETWEEN";
    header.counterAxisAlignItems = "CENTER";
    header.resize(192, 20);
    header.fills = [];

    const title = figma.createText();
    title.name = "ModalTitle";
    safeSetCharacters(title, v.properties?.title || "Dialog Title");
    title.fontSize = 13;
    title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    header.appendChild(title);
    compNode.appendChild(header);

    // Body
    const body = figma.createText();
    body.name = "ModalBody";
    safeSetCharacters(body, "Dialog action description.");
    body.fontSize = 11;
    body.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
    compNode.appendChild(body);

    // Footer actions
    const footer = figma.createFrame();
    footer.name = "ModalFooter";
    footer.layoutMode = "HORIZONTAL";
    footer.primaryAxisAlignItems = "MAX";
    footer.counterAxisAlignItems = "CENTER";
    footer.itemSpacing = 6;
    footer.resize(192, 28);
    footer.fills = [];

    const cancelBtn = figma.createFrame();
    cancelBtn.name = "BtnCancel";
    cancelBtn.resize(50, 24);
    cancelBtn.cornerRadius = 4;
    cancelBtn.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
    cancelBtn.fills = [];
    footer.appendChild(cancelBtn);

    const confirmBtn = figma.createFrame();
    confirmBtn.name = "BtnConfirm";
    confirmBtn.resize(60, 24);
    confirmBtn.cornerRadius = 4;
    confirmBtn.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.properties?.type === 'Destructive' ? '#DC2626' : '#C2410C') }];
    footer.appendChild(confirmBtn);

    compNode.appendChild(footer);
    parent.appendChild(compNode);
    return compNode;
  }

  // 6. Table
  if (compType === 'table') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 0;
    compNode.resize(220, 70);
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.92 } }];
    compNode.strokeWeight = 1;

    // Header
    const th = figma.createFrame();
    th.name = "TableHeader";
    th.layoutMode = "HORIZONTAL";
    th.primaryAxisAlignItems = "SPACE_BETWEEN";
    th.paddingLeft = 8;
    th.paddingRight = 8;
    th.paddingTop = 6;
    th.paddingBottom = 6;
    th.resize(220, 26);
    th.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];

    const h1 = figma.createText();
    safeSetCharacters(h1, "Item");
    h1.fontSize = 11;
    th.appendChild(h1);
    compNode.appendChild(th);

    // Row
    const tr = figma.createFrame();
    tr.name = "TableRow";
    tr.layoutMode = "HORIZONTAL";
    tr.primaryAxisAlignItems = "SPACE_BETWEEN";
    tr.paddingLeft = 8;
    tr.paddingRight = 8;
    tr.paddingTop = 6;
    tr.paddingBottom = 6;
    tr.resize(220, 28);
    tr.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const c1 = figma.createText();
    safeSetCharacters(c1, "Data value");
    c1.fontSize = 11;
    tr.appendChild(c1);
    compNode.appendChild(tr);

    parent.appendChild(compNode);
    return compNode;
  }

  // 7. Avatar
  if (compType === 'avatar') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.resize(36, 36);
    compNode.cornerRadius = 18;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#C2410C') }];
    compNode.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokeWeight = 2;

    const initials = figma.createText();
    initials.name = "Initials";
    safeSetCharacters(initials, v.properties?.initials || "AJ");
    initials.fontSize = 12;
    initials.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.appendChild(initials);

    parent.appendChild(compNode);
    return compNode;
  }

  // 8. Badge
  if (compType === 'badge') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.paddingLeft = 8;
    compNode.paddingRight = 8;
    compNode.paddingTop = 3;
    compNode.paddingBottom = 3;
    compNode.cornerRadius = 999;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#FFEDD5') }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.border || '#FDBA74') }];
    compNode.strokeWeight = 1;

    const label = figma.createText();
    label.name = "BadgeText";
    safeSetCharacters(label, v.properties?.label || v.properties?.variant || "Badge");
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#9A3412') }];
    compNode.appendChild(label);

    parent.appendChild(compNode);
    return compNode;
  }

  // 9. Toast / Notification
  if (compType === 'toast') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "SPACE_BETWEEN";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.paddingLeft = 10;
    compNode.paddingRight = 10;
    compNode.paddingTop = 8;
    compNode.paddingBottom = 8;
    compNode.resize(190, 36);
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#EFF6FF') }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.border || '#BFDBFE') }];
    compNode.strokeWeight = 1;

    const msg = figma.createText();
    msg.name = "ToastMessage";
    safeSetCharacters(msg, v.properties?.message || "Notification alert");
    msg.fontSize = 11;
    msg.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#1D4ED8') }];
    compNode.appendChild(msg);

    parent.appendChild(compNode);
    return compNode;
  }

  // 10. Tab
  if (compType === 'tab') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.paddingLeft = 12;
    compNode.paddingRight = 12;
    compNode.paddingTop = 8;
    compNode.paddingBottom = 8;
    compNode.fills = [];

    const isActive = v.properties?.active === true || v.properties?.Active === 'True';
    if (isActive) {
      compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
      compNode.strokeWeight = 2;
    }

    const label = figma.createText();
    label.name = "TabLabel";
    safeSetCharacters(label, v.properties?.label || "Tab");
    label.fontSize = 13;
    label.fills = [{ type: 'SOLID', color: hexToFigmaColor(isActive ? '#C2410C' : '#6B7280') }];
    compNode.appendChild(label);

    parent.appendChild(compNode);
    return compNode;
  }

  // 11. Card
  if (compType === 'card') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 8;
    compNode.paddingLeft = 12;
    compNode.paddingRight = 12;
    compNode.paddingTop = 12;
    compNode.paddingBottom = 12;
    compNode.resize(180, 90);
    compNode.cornerRadius = 8;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#FFFFFF') }];
    if (v.styles?.border && v.styles.border !== 'transparent') {
      compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles.border) }];
      compNode.strokeWeight = 1;
    }

    const title = figma.createText();
    title.name = "CardTitle";
    safeSetCharacters(title, v.properties?.title || "Card Title");
    title.fontSize = 12;
    title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    compNode.appendChild(title);

    const desc = figma.createText();
    desc.name = "CardDesc";
    safeSetCharacters(desc, "Card body container");
    desc.fontSize = 10;
    desc.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    compNode.appendChild(desc);

    parent.appendChild(compNode);
    return compNode;
  }

  // Accordion (Bootstrap 5 Standard)
  if (compType === 'accordion') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 0;
    compNode.resize(260, 84);
    compNode.cornerRadius = 8;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.strokeWeight = 1;

    // Header 1 (Active)
    const h1 = figma.createFrame();
    h1.name = "AccordionHeaderActive";
    h1.layoutMode = "HORIZONTAL";
    h1.primaryAxisAlignItems = "SPACE_BETWEEN";
    h1.counterAxisAlignItems = "CENTER";
    h1.resize(260, 32);
    h1.paddingLeft = 12;
    h1.paddingRight = 12;
    h1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#FFF7ED') }];
    h1.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#FED7AA') }];
    h1.strokeWeight = 1;

    const t1 = figma.createText();
    safeSetCharacters(t1, "✦ " + (v.properties?.label || "Accordion Item #1"));
    t1.fontSize = 11;
    t1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    h1.appendChild(t1);

    const ch1 = figma.createText();
    safeSetCharacters(ch1, "▲");
    ch1.fontSize = 9;
    ch1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    h1.appendChild(ch1);
    compNode.appendChild(h1);

    // Body 1
    const b1 = figma.createFrame();
    b1.name = "AccordionBody";
    b1.layoutMode = "HORIZONTAL";
    b1.counterAxisAlignItems = "CENTER";
    b1.resize(260, 26);
    b1.paddingLeft = 12;
    b1.paddingRight = 12;
    b1.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    const bt1 = figma.createText();
    safeSetCharacters(bt1, "Collapsible content body panel.");
    bt1.fontSize = 10;
    bt1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#4B5563') }];
    b1.appendChild(bt1);
    compNode.appendChild(b1);

    // Header 2 (Collapsed)
    const h2 = figma.createFrame();
    h2.name = "AccordionHeaderCollapsed";
    h2.layoutMode = "HORIZONTAL";
    h2.primaryAxisAlignItems = "SPACE_BETWEEN";
    h2.counterAxisAlignItems = "CENTER";
    h2.resize(260, 26);
    h2.paddingLeft = 12;
    h2.paddingRight = 12;
    h2.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    h2.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    h2.strokeWeight = 1;

    const t2 = figma.createText();
    safeSetCharacters(t2, "• Item #2 (Collapsed)");
    t2.fontSize = 10;
    t2.fills = [{ type: 'SOLID', color: hexToFigmaColor('#1F2937') }];
    h2.appendChild(t2);

    const ch2 = figma.createText();
    safeSetCharacters(ch2, "▼");
    ch2.fontSize = 8;
    ch2.fills = [{ type: 'SOLID', color: hexToFigmaColor('#6B7280') }];
    h2.appendChild(ch2);
    compNode.appendChild(h2);

    parent.appendChild(compNode);
    return compNode;
  }

  // Breadcrumb (Bootstrap 5 Standard)
  if (compType === 'breadcrumb') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 6;
    compNode.paddingLeft = 12;
    compNode.paddingRight = 12;
    compNode.paddingTop = 6;
    compNode.paddingBottom = 6;
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.strokeWeight = 1;

    const home = figma.createText();
    safeSetCharacters(home, "Home");
    home.fontSize = 11;
    home.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    compNode.appendChild(home);

    const d1 = figma.createText();
    safeSetCharacters(d1, v.properties?.dividerChar || "/");
    d1.fontSize = 10;
    d1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#9CA3AF') }];
    compNode.appendChild(d1);

    const lib = figma.createText();
    safeSetCharacters(lib, "Library");
    lib.fontSize = 11;
    lib.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    compNode.appendChild(lib);

    const d2 = figma.createText();
    safeSetCharacters(d2, v.properties?.dividerChar || "/");
    d2.fontSize = 10;
    d2.fills = [{ type: 'SOLID', color: hexToFigmaColor('#9CA3AF') }];
    compNode.appendChild(d2);

    const curr = figma.createText();
    safeSetCharacters(curr, v.properties?.label || "Data");
    curr.fontSize = 11;
    curr.fills = [{ type: 'SOLID', color: hexToFigmaColor('#6B7280') }];
    compNode.appendChild(curr);

    parent.appendChild(compNode);
    return compNode;
  }

  // Progress Bar (Bootstrap 5 Standard)
  if (compType === 'progress-bar') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 4;
    compNode.resize(220, 32);
    compNode.fills = [];

    const topRow = figma.createFrame();
    topRow.layoutMode = "HORIZONTAL";
    topRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    topRow.resize(220, 14);
    topRow.fills = [];

    const lbl = figma.createText();
    safeSetCharacters(lbl, v.properties?.label || "Progress");
    lbl.fontSize = 10;
    lbl.fills = [{ type: 'SOLID', color: hexToFigmaColor('#1F2937') }];
    topRow.appendChild(lbl);

    const pct = figma.createText();
    safeSetCharacters(pct, (v.properties?.progress || "68%"));
    pct.fontSize = 10;
    pct.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    topRow.appendChild(pct);
    compNode.appendChild(topRow);

    const track = figma.createFrame();
    track.resize(220, 8);
    track.cornerRadius = 4;
    track.fills = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];

    const fillWidth = Math.round(220 * ((v.properties?.percent || 68) / 100));
    const fillBar = figma.createFrame();
    fillBar.resize(Math.max(12, fillWidth), 8);
    fillBar.cornerRadius = 4;
    fillBar.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    track.appendChild(fillBar);
    compNode.appendChild(track);

    parent.appendChild(compNode);
    return compNode;
  }

  // Feedback Message / Alert (Bootstrap 5 Standard)
  if (compType === 'feedback-message') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "SPACE_BETWEEN";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.paddingLeft = 12;
    compNode.paddingRight = 12;
    compNode.paddingTop = 8;
    compNode.paddingBottom = 8;
    compNode.resize(250, 42);
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#FFF7ED') }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.border || '#FDBA74') }];
    compNode.strokeWeight = 1;

    const leftGroup = figma.createFrame();
    leftGroup.layoutMode = "HORIZONTAL";
    leftGroup.counterAxisAlignItems = "CENTER";
    leftGroup.itemSpacing = 8;
    leftGroup.fills = [];

    const icon = figma.createText();
    safeSetCharacters(icon, "⚠");
    icon.fontSize = 12;
    icon.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#9A3412') }];
    leftGroup.appendChild(icon);

    const txt = figma.createText();
    safeSetCharacters(txt, v.properties?.label || "Attention Required");
    txt.fontSize = 11;
    txt.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#9A3412') }];
    leftGroup.appendChild(txt);
    compNode.appendChild(leftGroup);

    const closeBtn = figma.createText();
    safeSetCharacters(closeBtn, "✕");
    closeBtn.fontSize = 10;
    closeBtn.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#9A3412') }];
    compNode.appendChild(closeBtn);

    parent.appendChild(compNode);
    return compNode;
  }

  // Skeleton Loader (Bootstrap 5 Standard)
  if (compType === 'skeleton-loader') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 10;
    compNode.paddingLeft = 10;
    compNode.paddingRight = 10;
    compNode.paddingTop = 10;
    compNode.paddingBottom = 10;
    compNode.resize(200, 48);
    compNode.cornerRadius = 8;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.strokeWeight = 1;

    const av = figma.createFrame();
    av.resize(28, 28);
    av.cornerRadius = 14;
    av.fills = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.appendChild(av);

    const lines = figma.createFrame();
    lines.layoutMode = "VERTICAL";
    lines.itemSpacing = 5;
    lines.fills = [];

    const l1 = figma.createFrame();
    l1.resize(110, 8);
    l1.cornerRadius = 3;
    l1.fills = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    lines.appendChild(l1);

    const l2 = figma.createFrame();
    l2.resize(70, 6);
    l2.cornerRadius = 3;
    l2.fills = [{ type: 'SOLID', color: hexToFigmaColor('#F3F4F6') }];
    lines.appendChild(l2);
    compNode.appendChild(lines);

    parent.appendChild(compNode);
    return compNode;
  }

  // Rating
  if (compType === 'rating') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 6;
    compNode.paddingLeft = 8;
    compNode.paddingRight = 8;
    compNode.paddingTop = 4;
    compNode.paddingBottom = 4;
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.strokeWeight = 1;

    const stars = figma.createText();
    safeSetCharacters(stars, "★ ★ ★ ★ ☆");
    stars.fontSize = 12;
    stars.fills = [{ type: 'SOLID', color: hexToFigmaColor('#F59E0B') }];
    compNode.appendChild(stars);

    const score = figma.createText();
    safeSetCharacters(score, "4.8");
    score.fontSize = 11;
    score.fills = [{ type: 'SOLID', color: hexToFigmaColor('#1F2937') }];
    compNode.appendChild(score);

    parent.appendChild(compNode);
    return compNode;
  }

  // Tooltip & Popover
  if (compType === 'tooltip') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.paddingLeft = 8;
    compNode.paddingRight = 8;
    compNode.paddingTop = 4;
    compNode.paddingBottom = 4;
    compNode.cornerRadius = 4;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor('#1F2937') }];

    const t = figma.createText();
    safeSetCharacters(t, v.properties?.label || "Tooltip guidance");
    t.fontSize = 10;
    t.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.appendChild(t);

    parent.appendChild(compNode);
    return compNode;
  }

  if (compType === 'popover') {
    compNode.layoutMode = "VERTICAL";
    compNode.itemSpacing = 6;
    compNode.paddingLeft = 10;
    compNode.paddingRight = 10;
    compNode.paddingTop = 8;
    compNode.paddingBottom = 8;
    compNode.resize(180, 60);
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.strokeWeight = 1;

    const h = figma.createText();
    safeSetCharacters(h, v.properties?.label || "Popover Header");
    h.fontSize = 11;
    h.fills = [{ type: 'SOLID', color: hexToFigmaColor('#111827') }];
    compNode.appendChild(h);

    const b = figma.createText();
    safeSetCharacters(b, "Contextual popover details.");
    b.fontSize = 9;
    b.fills = [{ type: 'SOLID', color: hexToFigmaColor('#6B7280') }];
    compNode.appendChild(b);

    parent.appendChild(compNode);
    return compNode;
  }

  // List / Added item
  if (compType === 'list') {
    compNode.layoutMode = "VERTICAL";
    compNode.resize(220, 64);
    compNode.cornerRadius = 6;
    compNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
    compNode.strokeWeight = 1;

    const r1 = figma.createFrame();
    r1.layoutMode = "HORIZONTAL";
    r1.primaryAxisAlignItems = "SPACE_BETWEEN";
    r1.counterAxisAlignItems = "CENTER";
    r1.resize(220, 32);
    r1.paddingLeft = 10;
    r1.paddingRight = 10;
    r1.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.properties?.state === 'Active' ? '#FFF7ED' : '#FFFFFF') }];

    const t1 = figma.createText();
    safeSetCharacters(t1, "✦ " + (v.properties?.label || "Active List Item"));
    t1.fontSize = 10;
    t1.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.properties?.state === 'Active' ? '#C2410C' : '#111827') }];
    r1.appendChild(t1);
    compNode.appendChild(r1);

    const r2 = figma.createFrame();
    r2.layoutMode = "HORIZONTAL";
    r2.primaryAxisAlignItems = "SPACE_BETWEEN";
    r2.counterAxisAlignItems = "CENTER";
    r2.resize(220, 32);
    r2.paddingLeft = 10;
    r2.paddingRight = 10;
    r2.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

    const t2 = figma.createText();
    safeSetCharacters(t2, "• Secondary List Item");
    t2.fontSize = 10;
    t2.fills = [{ type: 'SOLID', color: hexToFigmaColor('#4B5563') }];
    r2.appendChild(t2);
    compNode.appendChild(r2);

    parent.appendChild(compNode);
    return compNode;
  }

  // Carousel
  if (compType === 'carousel') {
    compNode.layoutMode = "VERTICAL";
    compNode.primaryAxisAlignItems = "SPACE_BETWEEN";
    compNode.paddingLeft = 12;
    compNode.paddingRight = 12;
    compNode.paddingTop = 10;
    compNode.paddingBottom = 10;
    compNode.resize(240, 80);
    compNode.cornerRadius = 8;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor('#FFF7ED') }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#FED7AA') }];
    compNode.strokeWeight = 1;

    const title = figma.createText();
    safeSetCharacters(title, v.properties?.label || "Featured Carousel Banner");
    title.fontSize = 12;
    title.fills = [{ type: 'SOLID', color: hexToFigmaColor('#9A3412') }];
    compNode.appendChild(title);

    const bottomRow = figma.createFrame();
    bottomRow.layoutMode = "HORIZONTAL";
    bottomRow.primaryAxisAlignItems = "SPACE_BETWEEN";
    bottomRow.resize(216, 14);
    bottomRow.fills = [];

    const dots = figma.createText();
    safeSetCharacters(dots, "● ○ ○");
    dots.fontSize = 8;
    dots.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    bottomRow.appendChild(dots);

    const arrows = figma.createText();
    safeSetCharacters(arrows, "‹ ›");
    arrows.fontSize = 10;
    arrows.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
    bottomRow.appendChild(arrows);
    compNode.appendChild(bottomRow);

    parent.appendChild(compNode);
    return compNode;
  }

  // Chip
  if (compType === 'chip') {
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";
    compNode.itemSpacing = 6;
    compNode.paddingLeft = 10;
    compNode.paddingRight = 10;
    compNode.paddingTop = 5;
    compNode.paddingBottom = 5;
    compNode.cornerRadius = 999;
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.bg || '#F3F4F6') }];
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.border || '#E5E7EB') }];
    compNode.strokeWeight = 1;

    const lbl = figma.createText();
    safeSetCharacters(lbl, v.properties?.label || "Filter chip");
    lbl.fontSize = 11;
    lbl.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#374151') }];
    compNode.appendChild(lbl);

    const x = figma.createText();
    safeSetCharacters(x, "✕");
    x.fontSize = 9;
    x.fills = [{ type: 'SOLID', color: hexToFigmaColor('#9CA3AF') }];
    compNode.appendChild(x);

    parent.appendChild(compNode);
    return compNode;
  }

    // 12. Button / Compact button / Chip / Default interactive
  compNode.layoutMode = "HORIZONTAL";
  compNode.primaryAxisAlignItems = "CENTER";
  compNode.counterAxisAlignItems = "CENTER";

  // Resizing Sizing Modes (Requirement 32: Button height HUG by default approx 36px, NOT 100px!)
  if (v.styles?.widthMode === 'fixed' && v.styles?.customWidth) {
    compNode.primaryAxisSizingMode = "FIXED";
    compNode.resize(v.styles.customWidth, compNode.height);
  } else {
    compNode.primaryAxisSizingMode = "AUTO"; // Hug width
  }

  if (v.styles?.heightMode === 'fixed' && v.styles?.customHeight) {
    compNode.counterAxisSizingMode = "FIXED";
    compNode.resize(compNode.width, v.styles.customHeight);
  } else {
    compNode.counterAxisSizingMode = "AUTO"; // Hug height -> ~36px instead of default 100px!
  }

  const p = v.styles?.padding || { top: 8, right: 14, bottom: 8, left: 14 };
  compNode.paddingTop = typeof p === 'number' ? p : (p.top ?? 8);
  compNode.paddingRight = typeof p === 'number' ? p : (p.right ?? 12);
  compNode.paddingBottom = typeof p === 'number' ? p : (p.bottom ?? 8);
  compNode.paddingLeft = typeof p === 'number' ? p : (p.left ?? 12);
  compNode.itemSpacing = v.styles?.gap ?? 6;

  // Fills (Respects Fill Toggle in Inspector - Requirement 29)
  if (v.styles?.hasFill === false || v.styles?.bg === 'transparent') {
    compNode.fills = [];
  } else if (v.styles?.bg) {
    compNode.fills = [{
      type: 'SOLID',
      color: hexToFigmaColor(v.styles.bg),
      opacity: (v.styles.bgOpacity ?? 100) / 100
    }];
  } else {
    compNode.fills = [];
  }

  // Strokes & Dashed Borders (Requirement: Matches template in Screenshot)
  const isDashed = (v.properties?.variant?.toLowerCase() === 'dashed' || 
                    v.properties?.type?.toLowerCase() === 'dashed' || 
                    v.styles?.borderStyle === 'dashed');

  const isLink = (v.properties?.variant?.toLowerCase() === 'link' || 
                  v.properties?.type?.toLowerCase() === 'link');

  const isDanger = (v.properties?.state?.toLowerCase().includes('danger') || 
                    v.properties?.state?.toLowerCase().includes('error') || 
                    v.properties?.variant?.toLowerCase().includes('danger') ||
                    v.properties?.type?.toLowerCase().includes('danger'));

  if (isLink) {
    compNode.fills = [];
    compNode.strokes = [];
  } else if (v.styles?.hasBorder === false || v.styles?.borderWidth === 0) {
    if (isDashed) {
      const strokeCol = isDanger ? '#EF4444' : (v.styles?.border || '#D1D5DB');
      compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(strokeCol) }];
      compNode.strokeWeight = 1;
      compNode.dashPattern = [4, 3];
    } else {
      compNode.strokes = [];
    }
  } else if (v.styles?.border && v.styles.border !== 'transparent') {
    const strokeCol = isDanger ? '#EF4444' : v.styles.border;
    compNode.strokes = [{
      type: 'SOLID',
      color: hexToFigmaColor(strokeCol)
    }];
    compNode.strokeWeight = v.styles.borderWidth || 1;
    if (isDashed) compNode.dashPattern = [4, 3];
  } else if (isDashed) {
    const strokeCol = isDanger ? '#EF4444' : '#D1D5DB';
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(strokeCol) }];
    compNode.strokeWeight = 1;
    compNode.dashPattern = [4, 3];
  } else {
    compNode.strokes = [];
  }

  // Danger fill overrides
  if (isDanger && !isLink) {
    if (v.styles?.hasFill !== false && v.styles?.bg && v.styles.bg !== 'transparent') {
      compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor('#EF4444') }];
    }
  }

  const cornerRadius = v.styles?.cornerRadius >= 9999 ? 999 : (v.styles?.cornerRadius ?? 8);
  compNode.cornerRadius = cornerRadius;

  // Leading Icon
  const shouldShowLeadingIcon = v.properties?.showIcon === true || 
                                v.properties?.['Show icon'] === true || 
                                v.properties?.hasLeftIcon === true;

  if (shouldShowLeadingIcon) {
    const iconNode = figma.createFrame();
    iconNode.name = "Icon";
    const iconSz = 12;
    iconNode.resize(iconSz, iconSz);
    iconNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#1E293B') }];
    iconNode.cornerRadius = 999;
    compNode.appendChild(iconNode);
  }

  // Text label layer (Requirement 32: typography font size & text color)
  const textNode = figma.createText();
  textNode.name = "Label";
  const labelText = v.properties?.label || v.properties?.Label || compName;
  safeSetCharacters(textNode, labelText);
  if (v.styles?.fontSize) textNode.fontSize = parseInt(v.styles.fontSize, 10);
  
  let resolvedTextColor = v.styles?.textColor || v.styles?.text;
  if (isLink) {
    resolvedTextColor = isDanger ? '#EF4444' : '#2563EB';
  } else if (isDanger && (v.styles?.hasFill === false || v.styles?.bg === 'transparent' || isDashed)) {
    resolvedTextColor = '#EF4444';
  } else if (!resolvedTextColor) {
    resolvedTextColor = (v.styles?.hasFill === false ? '#C2410C' : '#FFFFFF');
  }
  textNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(resolvedTextColor) }];
  safeAppend(compNode, textNode);

  parent.appendChild(compNode);
  return compNode;
}

// Main Canvas Generator for a Single Component Set

// ============================================================================
// NATIVE FIGMA ICON COMPONENTS GENERATOR (Each Icon = Individual Component)
// ============================================================================
const FALLBACK_STANDARD_ICONS = [
  {
    "id": "home",
    "name": "Home",
    "category": "Navigation",
    "svg": "<path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/>"
  },
  {
    "id": "search",
    "name": "Search",
    "category": "Navigation",
    "svg": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"/>"
  },
  {
    "id": "settings",
    "name": "Settings",
    "category": "System",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z\"/>"
  },
  {
    "id": "user",
    "name": "User",
    "category": "User",
    "svg": "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>"
  },
  {
    "id": "users",
    "name": "Users",
    "category": "User",
    "svg": "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>"
  },
  {
    "id": "bell",
    "name": "Bell / Alert",
    "category": "System",
    "svg": "<path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"/><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"/>"
  },
  {
    "id": "check",
    "name": "Check",
    "category": "Actions",
    "svg": "<polyline points=\"20 6 9 17 4 12\"/>"
  },
  {
    "id": "check-circle",
    "name": "Check Circle",
    "category": "Actions",
    "svg": "<path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/>"
  },
  {
    "id": "x",
    "name": "Close",
    "category": "Actions",
    "svg": "<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>"
  },
  {
    "id": "x-circle",
    "name": "Close Circle",
    "category": "Actions",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/>"
  },
  {
    "id": "plus",
    "name": "Plus",
    "category": "Actions",
    "svg": "<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>"
  },
  {
    "id": "minus",
    "name": "Minus",
    "category": "Actions",
    "svg": "<line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>"
  },
  {
    "id": "edit",
    "name": "Edit",
    "category": "Actions",
    "svg": "<path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/>"
  },
  {
    "id": "trash",
    "name": "Trash",
    "category": "Actions",
    "svg": "<polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>"
  },
  {
    "id": "cloud",
    "name": "Cloud",
    "category": "Media",
    "svg": "<path d=\"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z\"/>"
  },
  {
    "id": "upload",
    "name": "Upload",
    "category": "Actions",
    "svg": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"17 8 12 3 7 8\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"15\"/>"
  },
  {
    "id": "download",
    "name": "Download",
    "category": "Actions",
    "svg": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/>"
  },
  {
    "id": "calendar",
    "name": "Calendar",
    "category": "Media",
    "svg": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/>"
  },
  {
    "id": "clock",
    "name": "Clock",
    "category": "Media",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>"
  },
  {
    "id": "star",
    "name": "Star",
    "category": "Media",
    "svg": "<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>"
  },
  {
    "id": "heart",
    "name": "Heart",
    "category": "Media",
    "svg": "<path d=\"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z\"/>"
  },
  {
    "id": "mail",
    "name": "Mail",
    "category": "Communication",
    "svg": "<path d=\"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z\"/><polyline points=\"22,6 12,13 2,6\"/>"
  },
  {
    "id": "message-square",
    "name": "Message",
    "category": "Communication",
    "svg": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>"
  },
  {
    "id": "phone",
    "name": "Phone",
    "category": "Communication",
    "svg": "<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"/>"
  },
  {
    "id": "lock",
    "name": "Lock",
    "category": "Security",
    "svg": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>"
  },
  {
    "id": "unlock",
    "name": "Unlock",
    "category": "Security",
    "svg": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 9.9-1\"/>"
  },
  {
    "id": "shield",
    "name": "Shield",
    "category": "Security",
    "svg": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/>"
  },
  {
    "id": "eye",
    "name": "Eye / View",
    "category": "Media",
    "svg": "<path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>"
  },
  {
    "id": "eye-off",
    "name": "Eye Off",
    "category": "Media",
    "svg": "<path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/>"
  },
  {
    "id": "folder",
    "name": "Folder",
    "category": "Files",
    "svg": "<path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z\"/>"
  },
  {
    "id": "file",
    "name": "File",
    "category": "Files",
    "svg": "<path d=\"M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><polyline points=\"13 2 13 9 20 9\"/>"
  },
  {
    "id": "file-text",
    "name": "Document",
    "category": "Files",
    "svg": "<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/><polyline points=\"10 9 9 9 8 9\"/>"
  },
  {
    "id": "copy",
    "name": "Copy",
    "category": "Actions",
    "svg": "<rect x=\"9\" y=\"9\" width=\"13\" height=\"13\" rx=\"2\" ry=\"2\"/><path d=\"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\"/>"
  },
  {
    "id": "link",
    "name": "Link",
    "category": "Actions",
    "svg": "<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/>"
  },
  {
    "id": "external-link",
    "name": "External Link",
    "category": "Actions",
    "svg": "<path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/><polyline points=\"15 3 21 3 21 9\"/><line x1=\"10\" y1=\"14\" x2=\"21\" y2=\"3\"/>"
  },
  {
    "id": "filter",
    "name": "Filter",
    "category": "Navigation",
    "svg": "<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\"/>"
  },
  {
    "id": "sliders",
    "name": "Sliders / Tuner",
    "category": "Navigation",
    "svg": "<line x1=\"4\" y1=\"21\" x2=\"4\" y2=\"14\"/><line x1=\"4\" y1=\"10\" x2=\"4\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"3\"/><line x1=\"20\" y1=\"21\" x2=\"20\" y2=\"16\"/><line x1=\"20\" y1=\"12\" x2=\"20\" y2=\"3\"/><line x1=\"1\" y1=\"14\" x2=\"7\" y2=\"14\"/><line x1=\"9\" y1=\"8\" x2=\"15\" y2=\"8\"/><line x1=\"17\" y1=\"16\" x2=\"23\" y2=\"16\"/>"
  },
  {
    "id": "grid",
    "name": "Grid",
    "category": "Navigation",
    "svg": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/>"
  },
  {
    "id": "list",
    "name": "List",
    "category": "Navigation",
    "svg": "<line x1=\"8\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"8\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"8\" y1=\"18\" x2=\"21\" y2=\"18\"/><line x1=\"3\" y1=\"6\" x2=\"3.01\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"3.01\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"3.01\" y2=\"18\"/>"
  },
  {
    "id": "shopping-cart",
    "name": "Shopping Cart",
    "category": "Commerce",
    "svg": "<circle cx=\"9\" cy=\"21\" r=\"1\"/><circle cx=\"20\" cy=\"21\" r=\"1\"/><path d=\"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6\"/>"
  },
  {
    "id": "shopping-bag",
    "name": "Shopping Bag",
    "category": "Commerce",
    "svg": "<path d=\"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z\"/><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><path d=\"M16 10a4 4 0 0 1-8 0\"/>"
  },
  {
    "id": "credit-card",
    "name": "Credit Card",
    "category": "Commerce",
    "svg": "<rect x=\"1\" y=\"4\" width=\"22\" height=\"16\" rx=\"2\" ry=\"2\"/><line x1=\"1\" y1=\"10\" x2=\"23\" y2=\"10\"/>"
  },
  {
    "id": "dollar-sign",
    "name": "Currency Dollar",
    "category": "Commerce",
    "svg": "<line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"23\"/><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/>"
  },
  {
    "id": "coffee",
    "name": "Coffee",
    "category": "Media",
    "svg": "<path d=\"M18 8h1a4 4 0 0 1 0 8h-1\"/><path d=\"M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z\"/><line x1=\"6\" y1=\"1\" x2=\"6\" y2=\"4\"/><line x1=\"10\" y1=\"1\" x2=\"10\" y2=\"4\"/><line x1=\"14\" y1=\"1\" x2=\"14\" y2=\"4\"/>"
  },
  {
    "id": "crown",
    "name": "Crown / VIP",
    "category": "Commerce",
    "svg": "<path d=\"M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5z\"/>"
  },
  {
    "id": "wifi",
    "name": "WiFi",
    "category": "Devices",
    "svg": "<path d=\"M5 12.55a11 11 0 0 1 14.08 0\"/><path d=\"M1.42 9a16 16 0 0 1 21.16 0\"/><path d=\"M8.53 16.11a6 6 0 0 1 6.95 0\"/><line x1=\"12\" y1=\"20\" x2=\"12.01\" y2=\"20\"/>"
  },
  {
    "id": "monitor",
    "name": "Monitor",
    "category": "Devices",
    "svg": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"/><line x1=\"8\" y1=\"21\" x2=\"16\" y2=\"21\"/><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"21\"/>"
  },
  {
    "id": "smartphone",
    "name": "Smartphone",
    "category": "Devices",
    "svg": "<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"2\" ry=\"2\"/><line x1=\"12\" y1=\"18\" x2=\"12.01\" y2=\"18\"/>"
  },
  {
    "id": "database",
    "name": "Database",
    "category": "Devices",
    "svg": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M21 12c0 1.66-4 3-9 3s-9-1.34-9-3\"/><path d=\"M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5\"/>"
  },
  {
    "id": "cpu",
    "name": "CPU / Chip",
    "category": "Devices",
    "svg": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\"/><line x1=\"9\" y1=\"1\" x2=\"9\" y2=\"4\"/><line x1=\"15\" y1=\"1\" x2=\"15\" y2=\"4\"/><line x1=\"9\" y1=\"20\" x2=\"9\" y2=\"23\"/><line x1=\"15\" y1=\"20\" x2=\"15\" y2=\"23\"/><line x1=\"20\" y1=\"9\" x2=\"23\" y2=\"9\"/><line x1=\"20\" y1=\"14\" x2=\"23\" y2=\"14\"/><line x1=\"1\" y1=\"9\" x2=\"4\" y2=\"9\"/><line x1=\"1\" y1=\"14\" x2=\"4\" y2=\"14\"/>"
  },
  {
    "id": "zap",
    "name": "Lightning / Zap",
    "category": "Actions",
    "svg": "<polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/>"
  },
  {
    "id": "sun",
    "name": "Sun / Light",
    "category": "Media",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/>"
  },
  {
    "id": "moon",
    "name": "Moon / Dark",
    "category": "Media",
    "svg": "<path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/>"
  },
  {
    "id": "activity",
    "name": "Activity / Pulse",
    "category": "Status",
    "svg": "<polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/>"
  },
  {
    "id": "pie-chart",
    "name": "Pie Chart",
    "category": "Media",
    "svg": "<path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"/><path d=\"M22 12A10 10 0 0 0 12 2v10z\"/>"
  },
  {
    "id": "bar-chart",
    "name": "Bar Chart",
    "category": "Media",
    "svg": "<line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"10\"/><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"4\"/><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"16\"/>"
  },
  {
    "id": "tag",
    "name": "Tag",
    "category": "Navigation",
    "svg": "<path d=\"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z\"/><line x1=\"7\" y1=\"7\" x2=\"7.01\" y2=\"7\"/>"
  },
  {
    "id": "pin",
    "name": "Pin",
    "category": "Navigation",
    "svg": "<path d=\"M16 11V3a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8l-2 3v2h6.5v6l1 1 1-1v-6H20v-2l-2-3z\"/>"
  },
  {
    "id": "share",
    "name": "Share",
    "category": "Actions",
    "svg": "<circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><line x1=\"8.59\" y1=\"13.51\" x2=\"15.42\" y2=\"17.49\"/><line x1=\"15.41\" y1=\"6.51\" x2=\"8.59\" y2=\"10.49\"/>"
  },
  {
    "id": "printer",
    "name": "Printer",
    "category": "Devices",
    "svg": "<polyline points=\"6 9 6 2 18 2 18 9\"/><path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\"/>"
  },
  {
    "id": "qr-code",
    "name": "QR Code",
    "category": "Devices",
    "svg": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"5\" y=\"5\" width=\"3\" height=\"3\"/><rect x=\"16\" y=\"5\" width=\"3\" height=\"3\"/><rect x=\"5\" y=\"16\" width=\"3\" height=\"3\"/><path d=\"M14 14h3v3h-3z\"/><path d=\"M17 17h3v3h-3z\"/><path d=\"M14 19h2v2h-2z\"/>"
  },
  {
    "id": "refresh",
    "name": "Refresh Sync",
    "category": "Actions",
    "svg": "<polyline points=\"23 4 23 10 17 10\"/><polyline points=\"1 20 1 14 7 14\"/><path d=\"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15\"/>"
  },
  {
    "id": "gift",
    "name": "Gift / Reward",
    "category": "Commerce",
    "svg": "<polyline points=\"20 12 20 22 4 22 4 12\"/><rect x=\"2\" y=\"7\" width=\"20\" height=\"5\"/><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"7\"/><path d=\"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z\"/><path d=\"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z\"/>"
  },
  {
    "id": "arrow-left",
    "name": "Arrow Left",
    "category": "Navigation",
    "svg": "<line x1=\"19\" y1=\"12\" x2=\"5\" y2=\"12\"/><polyline points=\"12 19 5 12 12 5\"/>"
  },
  {
    "id": "arrow-right",
    "name": "Arrow Right",
    "category": "Navigation",
    "svg": "<line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/><polyline points=\"12 5 19 12 12 19\"/>"
  },
  {
    "id": "arrow-up",
    "name": "Arrow Up",
    "category": "Navigation",
    "svg": "<line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"5\"/><polyline points=\"5 12 12 5 19 12\"/>"
  },
  {
    "id": "arrow-down",
    "name": "Arrow Down",
    "category": "Navigation",
    "svg": "<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><polyline points=\"19 12 12 19 5 12\"/>"
  },
  {
    "id": "chevron-left",
    "name": "Chevron Left",
    "category": "Navigation",
    "svg": "<polyline points=\"15 18 9 12 15 6\"/>"
  },
  {
    "id": "chevron-right",
    "name": "Chevron Right",
    "category": "Navigation",
    "svg": "<polyline points=\"9 18 15 12 9 6\"/>"
  },
  {
    "id": "chevron-down",
    "name": "Chevron Down",
    "category": "Navigation",
    "svg": "<polyline points=\"6 9 12 15 18 9\"/>"
  },
  {
    "id": "chevron-up",
    "name": "Chevron Up",
    "category": "Navigation",
    "svg": "<polyline points=\"18 15 12 9 6 15\"/>"
  },
  {
    "id": "thumbs-up",
    "name": "Thumbs Up",
    "category": "Actions",
    "svg": "<path d=\"M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3\"/>"
  },
  {
    "id": "thumbs-down",
    "name": "Thumbs Down",
    "category": "Actions",
    "svg": "<path d=\"M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3\"/>"
  },
  {
    "id": "globe",
    "name": "Globe",
    "category": "System",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"/><path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"/>"
  },
  {
    "id": "compass",
    "name": "Compass",
    "category": "Navigation",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polygon points=\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\"/>"
  },
  {
    "id": "flag",
    "name": "Flag",
    "category": "Actions",
    "svg": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" y1=\"22\" x2=\"4\" y2=\"15\"/>"
  },
  {
    "id": "key",
    "name": "Key",
    "category": "Security",
    "svg": "<path d=\"M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5-1.5 1.5-1.5-1.5L8 9m0 0a5 5 0 1 0-7 7 5 5 0 0 0 7-7z\"/>"
  },
  {
    "id": "music",
    "name": "Music",
    "category": "Media",
    "svg": "<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>"
  },
  {
    "id": "video",
    "name": "Video",
    "category": "Media",
    "svg": "<polygon points=\"23 7 16 12 23 17 23 7\"/><rect x=\"1\" y=\"5\" width=\"15\" height=\"14\" rx=\"2\" ry=\"2\"/>"
  },
  {
    "id": "camera",
    "name": "Camera",
    "category": "Media",
    "svg": "<path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>"
  },
  {
    "id": "map-pin",
    "name": "Location Map",
    "category": "Navigation",
    "svg": "<path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>"
  },
  {
    "id": "terminal",
    "name": "Terminal Code",
    "category": "Devices",
    "svg": "<polyline points=\"4 17 10 11 4 5\"/><line x1=\"12\" y1=\"19\" x2=\"20\" y2=\"19\"/>"
  },
  {
    "id": "git-branch",
    "name": "Git Branch",
    "category": "Devices",
    "svg": "<line x1=\"6\" y1=\"3\" x2=\"6\" y2=\"15\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M18 9a9 9 0 0 1-9 9\"/>"
  },
  {
    "id": "package",
    "name": "Box / Package",
    "category": "Commerce",
    "svg": "<line x1=\"16.5\" y1=\"9.4\" x2=\"7.5\" y2=\"4.21\"/><path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"/><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"/><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"/>"
  },
  {
    "id": "bookmark",
    "name": "Bookmark",
    "category": "Actions",
    "svg": "<path d=\"M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z\"/>"
  },
  {
    "id": "mic",
    "name": "Microphone",
    "category": "Media",
    "svg": "<path d=\"M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z\"/><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"/><line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"23\"/><line x1=\"8\" y1=\"23\" x2=\"16\" y2=\"23\"/>"
  },
  {
    "id": "volume",
    "name": "Volume Audio",
    "category": "Media",
    "svg": "<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"/><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"/>"
  },
  {
    "id": "award",
    "name": "Award / Badge",
    "category": "Status",
    "svg": "<circle cx=\"12\" cy=\"8\" r=\"7\"/><polyline points=\"8.21 13.89 7 23 12 20 17 23 15.79 13.88\"/>"
  },
  {
    "id": "check-square",
    "name": "Check Square",
    "category": "Actions",
    "svg": "<polyline points=\"9 11 12 14 22 4\"/><path d=\"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11\"/>"
  },
  {
    "id": "square",
    "name": "Square Box",
    "category": "Actions",
    "svg": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/>"
  },
  {
    "id": "user-plus",
    "name": "User Add",
    "category": "User",
    "svg": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"8.5\" cy=\"7\" r=\"4\"/><line x1=\"20\" y1=\"8\" x2=\"20\" y2=\"14\"/><line x1=\"23\" y1=\"11\" x2=\"17\" y2=\"11\"/>"
  },
  {
    "id": "user-check",
    "name": "User Verified",
    "category": "User",
    "svg": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><circle cx=\"8.5\" cy=\"7\" r=\"4\"/><polyline points=\"17 11 19 13 23 9\"/>"
  },
  {
    "id": "sparkles-alt",
    "name": "Magic Sparkles",
    "category": "System",
    "svg": "<path d=\"m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z\"/>"
  },
  {
    "id": "shield-check",
    "name": "Shield Verified",
    "category": "Security",
    "svg": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><polyline points=\"9 12 11 14 15 10\"/>"
  },
  {
    "id": "battery",
    "name": "Battery",
    "category": "Devices",
    "svg": "<rect x=\"1\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\"/><line x1=\"23\" y1=\"11\" x2=\"23\" y2=\"13\"/>"
  },
  {
    "id": "bluetooth",
    "name": "Bluetooth",
    "category": "Devices",
    "svg": "<polyline points=\"6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5\"/>"
  },
  {
    "id": "cast",
    "name": "Cast Screen",
    "category": "Devices",
    "svg": "<path d=\"M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6\"/><line x1=\"2\" y1=\"20\" x2=\"2.01\" y2=\"20\"/>"
  },
  {
    "id": "feather",
    "name": "Feather / Design",
    "category": "Media",
    "svg": "<path d=\"M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z\"/><line x1=\"16\" y1=\"8\" x2=\"2\" y2=\"22\"/><line x1=\"17.5\" y1=\"15\" x2=\"9\" y2=\"15\"/>"
  },
  {
    "id": "help-circle",
    "name": "Help",
    "category": "System",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/>"
  },
  {
    "id": "info",
    "name": "Information",
    "category": "System",
    "svg": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"8\" x2=\"12.01\" y2=\"8\"/>"
  }
];

async function generateIconLibraryOnCanvas(compData) {
  const compName = 'Icon';
  // 1. Dedicated "Icon" Page (Requirement 33)
  let compPage = figma.root.children.find(p => p.name.trim().toLowerCase() === 'icon');
  if (!compPage) {
    compPage = figma.createPage();
    compPage.name = 'Icon';
  }
  try {
    if (typeof figma.setCurrentPageAsync === 'function') {
      await figma.setCurrentPageAsync(compPage);
    } else {
      figma.currentPage = compPage;
    }
  } catch (e) {
    figma.currentPage = compPage;
  }

  // 2. Remove existing Icon nodes on this page for clean in-place update
  const existingNodes = compPage.children.filter(node => {
    return node.name === compName || 
           node.name.startsWith('Icon /') || 
           node.name.startsWith('Icon -') || 
           node.name.includes('Icon Library') || 
           node.name.includes('Iconography') ||
           node.getPluginData('adsc_component_id') === 'icon';
  });
  for (const oldNode of existingNodes) {
    try { oldNode.remove(); } catch (e) {}
  }

  // 3. Icons list (Payload custom library or fallback 100 standard icons)
  const iconsList = (compData && compData.iconLibrary && compData.iconLibrary.length > 0)
    ? compData.iconLibrary
    : FALLBACK_STANDARD_ICONS;

  // 4. Create an organized Container Frame for all individual icon components
  const containerFrame = figma.createFrame();
  containerFrame.name = "Iconography Library";
  containerFrame.setPluginData('adsc_component_id', 'icon');
  containerFrame.layoutMode = "HORIZONTAL";
  containerFrame.layoutWrap = "WRAP";
  containerFrame.itemSpacing = 20;
  containerFrame.counterAxisSpacing = 20;
  containerFrame.paddingTop = 32;
  containerFrame.paddingRight = 32;
  containerFrame.paddingBottom = 32;
  containerFrame.paddingLeft = 32;
  containerFrame.resize(1100, 600);
  containerFrame.fills = [{ type: 'SOLID', color: hexToFigmaColor('#FAFAFA') }];
  containerFrame.strokes = [{ type: 'SOLID', color: hexToFigmaColor('#E5E7EB') }];
  containerFrame.strokeWeight = 1;
  containerFrame.cornerRadius = 16;
  containerFrame.x = 80;
  containerFrame.y = 80;

  // 5. Create each icon as an individual native Figma ComponentNode
  let createdCount = 0;
  for (const icon of iconsList) {
    try {
      const iconComp = figma.createComponent();
      iconComp.name = "Icon / " + (icon.name || icon.id);
      iconComp.resize(24, 24);
      iconComp.fills = [];
      iconComp.strokes = [];

      const svgString = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' + (icon.svg || '') + '</svg>';
      let svgFrame = null;
      if (typeof figma.createNodeFromSvg === 'function') {
        try {
          svgFrame = figma.createNodeFromSvg(svgString);
        } catch (errSvg) {
          console.warn('SVG parse error for ' + icon.name + ':', errSvg);
        }
      }

      if (svgFrame) {
        const children = [...svgFrame.children];
        for (const child of children) {
          iconComp.appendChild(child);
        }
        try { svgFrame.remove(); } catch (e) {}
      } else {
        const fallback = figma.createFrame();
        fallback.resize(16, 16);
        fallback.cornerRadius = 3;
        fallback.fills = [{ type: 'SOLID', color: hexToFigmaColor('#C2410C') }];
        iconComp.appendChild(fallback);
      }

      containerFrame.appendChild(iconComp);
      createdCount++;
    } catch (errComp) {
      console.warn('Error creating icon component ' + icon.name + ':', errComp);
    }
  }

  compPage.appendChild(containerFrame);
  try {
    figma.currentPage.selection = [containerFrame];
    figma.viewport.scrollAndZoomIntoView([containerFrame]);
  } catch (e) {}

  figma.notify('✓ Created ' + createdCount + ' native Icon components on "Icon" page!');
  try {
    figma.ui.postMessage({
      type: 'FIGMA_SYNC_SUCCESS',
      componentName: 'Icon',
      variantCount: createdCount
    });
  } catch (e) {}
  return containerFrame;
}

// --- Figma Variant Matrix Layout Template (Image 1 Specification) ---
function analyzeVariantAxes(variantsList) {
  if (!variantsList || !variantsList.length) {
    return { colProp: 'Variant', rowProp: 'Size', groupProp: 'State', cols: ['Default'], groups: ['Default'], rows: ['Default'] };
  }
  const propKeys = new Set();
  variantsList.forEach(v => {
    const props = v.properties || {};
    Object.keys(props).forEach(k => {
      const kl = k.toLowerCase();
      if (!['label', 'comptype', 'name'].includes(kl)) {
        propKeys.add(k);
      }
    });
  });

  const colCandidates = ['type', 'variant', 'kind', 'status', 'color', 'style'];
  let colProp = Array.from(propKeys).find(k => colCandidates.includes(k.toLowerCase()));
  if (!colProp && propKeys.size > 0) colProp = Array.from(propKeys)[0];

  const groupCandidates = ['state', 'tone', 'status', 'theme'];
  let groupProp = Array.from(propKeys).find(k => k.toLowerCase() !== colProp?.toLowerCase() && groupCandidates.includes(k.toLowerCase()));

  const rowCandidates = ['size', 'density', 'layout', 'direction'];
  let rowProp = Array.from(propKeys).find(k => k.toLowerCase() !== colProp?.toLowerCase() && k.toLowerCase() !== groupProp?.toLowerCase() && rowCandidates.includes(k.toLowerCase()));
  if (!rowProp) {
    rowProp = Array.from(propKeys).find(k => k.toLowerCase() !== colProp?.toLowerCase() && k.toLowerCase() !== groupProp?.toLowerCase());
  }

  const colOrder = ['primary', 'default', 'secondary', 'dashed', 'outline', 'text', 'link', 'ghost', 'danger', 'success', 'warning', 'info', 'neutral'];
  const sizeOrder = ['default', 'large', 'small', 'md', 'lg', 'sm', 'xl', 'xs'];
  const stateOrder = ['default', 'rest', 'hover', 'active', 'focus', 'pressed', 'disabled', 'danger'];

  function getDistinct(prop, prefOrder) {
    if (!prop) return [];
    const set = new Set();
    variantsList.forEach(v => {
      const val = v.properties?.[prop] ?? v.properties?.[prop.toLowerCase()];
      if (val !== undefined && val !== null && String(val).trim()) {
        set.add(String(val).trim());
      }
    });
    const arr = Array.from(set);
    if (prefOrder && prefOrder.length) {
      arr.sort((a, b) => {
        let ia = prefOrder.indexOf(a.toLowerCase());
        let ib = prefOrder.indexOf(b.toLowerCase());
        if (ia === -1) ia = 999;
        if (ib === -1) ib = 999;
        return ia - ib;
      });
    }
    return arr;
  }

  let cols = getDistinct(colProp, colOrder);
  let groups = getDistinct(groupProp, stateOrder);
  let rows = getDistinct(rowProp, sizeOrder);

  if (cols.length === 0) cols = ['Default'];
  if (groups.length === 0) groups = ['Default'];
  if (rows.length === 0) rows = ['Default'];

  return { colProp, groupProp, rowProp, cols, groups, rows };
}

function formatDisplayName(val) {
  if (!val) return '';
  const s = String(val).trim();
  const sl = s.toLowerCase();
  if (sl === 'md') return 'Default';
  if (sl === 'lg') return 'Large';
  if (sl === 'sm') return 'Small';
  if (sl === 'rest') return 'Default';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function applyFigmaMatrixLayout(containerNode, createdVariants, variantsList, compName, compData, targetPage, targetX, targetY) {
  // 1. Remove previous matrix labels for this component
  const oldLabels = targetPage.children.filter(n => {
    return (n.type === "TEXT" || n.type === "FRAME") &&
           (n.getPluginData('adsc_component_id') === (compData.id || compName) || n.getPluginData('adsc_matrix_label') === 'true');
  });
  for (const oldLabel of oldLabels) {
    try { oldLabel.remove(); } catch (e) {}
  }

  const { colProp, groupProp, rowProp, cols, groups, rows } = analyzeVariantAxes(variantsList);

  let maxW = 80;
  let maxH = 36;
  for (const vNode of createdVariants) {
    if (vNode.width && vNode.width > maxW) maxW = vNode.width;
    if (vNode.height && vNode.height > maxH) maxH = vNode.height;
  }

  const colWidth = Math.max(Math.ceil(maxW + 36), 110);
  const rowHeight = Math.max(Math.ceil(maxH + 20), 44);
  const groupGap = 36;
  const padLeft = 32;
  const padTop = 32;
  const padRight = 32;
  const padBottom = 32;

  try {
    containerNode.layoutMode = "NONE";
  } catch(e) {}

  let currentY = padTop;
  const rowPositions = [];

  for (let g = 0; g < groups.length; g++) {
    const groupVal = groups[g];
    for (let r = 0; r < rows.length; r++) {
      const rowVal = rows[r];
      const rowY = currentY;
      rowPositions.push({
        groupName: groupVal,
        isFirstInGroup: (r === 0),
        rowName: rowVal,
        y: rowY,
        height: rowHeight
      });

      for (let c = 0; c < cols.length; c++) {
        const colVal = cols[c];
        const colX = padLeft + c * colWidth;

        const vMatch = createdVariants.find(vNode => {
          if (vNode._placed) return false;
          const vData = variantsList.find(vl => vl.name === vNode.name);
          if (!vData) return false;
          const p = vData.properties || {};
          const matchCol = !colProp || String(p[colProp] || p[colProp?.toLowerCase()] || '').toLowerCase() === colVal.toLowerCase();
          const matchGroup = !groupProp || String(p[groupProp] || p[groupProp?.toLowerCase()] || '').toLowerCase() === groupVal.toLowerCase();
          const matchRow = !rowProp || String(p[rowProp] || p[rowProp?.toLowerCase()] || '').toLowerCase() === rowVal.toLowerCase();
          return matchCol && matchGroup && matchRow;
        });

        if (vMatch) {
          vMatch.x = colX;
          vMatch.y = rowY;
          vMatch._placed = true;
        }
      }
      currentY += rowHeight;
    }
    if (g < groups.length - 1) {
      currentY += groupGap;
    }
  }

  let leftoverIdx = 0;
  for (const vNode of createdVariants) {
    if (!vNode._placed) {
      const c = leftoverIdx % cols.length;
      const r = Math.floor(leftoverIdx / cols.length);
      vNode.x = padLeft + c * colWidth;
      vNode.y = currentY + r * rowHeight;
      leftoverIdx++;
    }
  }
  if (leftoverIdx > 0) {
    currentY += Math.ceil(leftoverIdx / cols.length) * rowHeight;
  }

  const totalWidth = padLeft + cols.length * colWidth + padRight;
  const totalHeight = currentY + padBottom;

  try {
    containerNode.resize(Math.max(totalWidth, 320), Math.max(totalHeight, 160));
  } catch(e) {}

  const setX = (targetX || 80) + 160;
  const setY = (targetY || 80) + 60;
  containerNode.x = setX;
  containerNode.y = setY;

  containerNode.strokes = [{
    type: 'SOLID',
    color: { r: 0.49, g: 0.23, b: 0.93 }
  }];
  containerNode.strokeWeight = 1.5;
  containerNode.dashPattern = [6, 4];
  containerNode.cornerRadius = 8;
  try {
    containerNode.fills = [];
  } catch(e) {}

  // Top Column Headers (Monospace labels matching Template in Screenshot)
  for (let c = 0; c < cols.length; c++) {
    const colVal = cols[c];
    try {
      const colText = figma.createText();
      try {
        colText.fontName = { family: "Roboto Mono", style: "Regular" };
      } catch(e) {}
      colText.fontSize = 13;
      colText.fills = [{ type: 'SOLID', color: { r: 0.49, g: 0.23, b: 0.93 } }];
      colText.setPluginData('adsc_component_id', compData.id || compName);
      colText.setPluginData('adsc_matrix_label', 'true');

      if (c === 0) {
        safeSetCharacters(colText, `${formatDisplayName(colVal)}\n❖ *${compName}*`);
        try { colText.lineHeight = { value: 18, unit: 'PIXELS' }; } catch(e) {}
      } else {
        safeSetCharacters(colText, formatDisplayName(colVal));
      }
      targetPage.appendChild(colText);
      colText.x = setX + padLeft + c * colWidth;
      colText.y = setY - (c === 0 ? 46 : 28);
    } catch(errCol) {
      console.warn('Error creating column header:', errCol);
    }
  }

  // Left Row Labels
  for (const pos of rowPositions) {
    try {
      if (pos.isFirstInGroup && groups.length > 1) {
        const stateLabel = figma.createText();
        try {
          stateLabel.fontName = { family: "Roboto Mono", style: "Regular" };
        } catch(e) {}
        stateLabel.fontSize = 13;
        const isDanger = pos.groupName.toLowerCase().includes('danger') || pos.groupName.toLowerCase().includes('error');
        stateLabel.fills = [{ type: 'SOLID', color: isDanger ? { r: 0.94, g: 0.27, b: 0.27 } : { r: 0.49, g: 0.23, b: 0.93 } }];
        stateLabel.setPluginData('adsc_component_id', compData.id || compName);
        stateLabel.setPluginData('adsc_matrix_label', 'true');
        safeSetCharacters(stateLabel, formatDisplayName(pos.groupName));
        targetPage.appendChild(stateLabel);
        stateLabel.x = setX - 145;
        stateLabel.y = setY + pos.y + Math.max(0, (pos.height - 18) / 2);
      }

      if (rows.length > 1 || pos.rowName !== 'Default') {
        const sizeLabel = figma.createText();
        try {
          sizeLabel.fontName = { family: "Roboto Mono", style: "Regular" };
        } catch(e) {}
        sizeLabel.fontSize = 12;
        sizeLabel.fills = [{ type: 'SOLID', color: { r: 0.49, g: 0.23, b: 0.93 } }];
        sizeLabel.setPluginData('adsc_component_id', compData.id || compName);
        sizeLabel.setPluginData('adsc_matrix_label', 'true');
        safeSetCharacters(sizeLabel, formatDisplayName(pos.rowName));
        targetPage.appendChild(sizeLabel);
        sizeLabel.x = setX - 68;
        sizeLabel.y = setY + pos.y + Math.max(0, (pos.height - 16) / 2);
      }
    } catch(errRow) {
      console.warn('Error creating row label:', errRow);
    }
  }
}

async function generateComponentSetOnCanvas(payload) {
  await preloadStandardFonts();
  const compData = payload.component || payload;
  const compName = compData.name || 'Component';
  if (compName.trim().toLowerCase() === 'icon' || compData.id === 'icon' || compData.iconLibrary) {
    return await generateIconLibraryOnCanvas(compData);
  }
  const variantsList = compData.variantsList || [];

  if (variantsList.length === 0) {
    figma.notify(`Warning: No variants received for ${compName}`);
    return;
  }

  // 1. Create or navigate to dedicated Page for this component (Requirement 33)
  let targetPage = figma.root.children.find(p => p.name.trim().toLowerCase() === compName.trim().toLowerCase());
  if (!targetPage) {
    targetPage = figma.createPage();
    targetPage.name = compName;
  }
  try {
    if (typeof figma.setCurrentPageAsync === 'function') {
      await figma.setCurrentPageAsync(targetPage);
    } else {
      figma.currentPage = targetPage;
    }
  } catch (e) {
    figma.currentPage = targetPage;
  }

  // Look for any existing component set, components or frames on canvas to update in-place FIRST (Requirement 16)
  let targetX = 0;
  let targetY = 0;
  let isExistingUpdate = false;

  // Match ONLY top-level children on the current page to prevent dangling child node errors (Requirement 16)
  const existingNodes = figma.currentPage.children.filter(node => {
    return (node.type === "COMPONENT_SET" || node.type === "COMPONENT" || node.type === "FRAME") &&
           (node.name === compName || 
            node.name.startsWith(`${compName} `) ||
            node.name.startsWith(`${compName} /`) ||
            node.name.startsWith(`${compName} -`) ||
            node.getPluginData('adsc_component_id') === (compData.id || compName));
  });

  if (existingNodes.length > 0) {
    targetX = existingNodes[0].x || 80;
    targetY = existingNodes[0].y || 80;
    isExistingUpdate = true;
    for (const oldNode of existingNodes) {
      try { oldNode.remove(); } catch (e) {}
    }
  } else {
    targetX = 80;
    targetY = 80;
  }

  const createdVariants = [];
  for (let i = 0; i < variantsList.length; i++) {
    try {
      const node = createVariantComponentNode(variantsList[i], compName, targetPage);
      if (node) createdVariants.push(node);
    } catch (errVar) {
      console.warn(`Error creating variant ${i} for ${compName}:`, errVar);
    }
  }

  if (createdVariants.length === 0) {
    figma.notify(`Error: Failed to create variants for ${compName}`, { error: true });
    return;
  }

  // Combine variants into a native Figma ComponentSetNode if >= 2, else single component
  try {
    if (createdVariants.length >= 2) {
      const componentSet = figma.combineAsVariants(createdVariants, targetPage);
      componentSet.name = compName;
      componentSet.setPluginData('adsc_component_id', compData.id || compName);

      applyFigmaMatrixLayout(componentSet, createdVariants, variantsList, compName, compData, targetPage, targetX, targetY);

      figma.currentPage.selection = [componentSet];
      figma.viewport.scrollAndZoomIntoView([componentSet]);
      const statusMsg = isExistingUpdate 
        ? `✓ Updated existing "${compName}" (${createdVariants.length} variants) on canvas!`
        : `✓ Synced "${compName}" (${createdVariants.length} variants) to Figma canvas!`;
      figma.notify(statusMsg);

      figma.ui.postMessage({
        type: 'FIGMA_SYNC_SUCCESS',
        componentName: compName,
        variantCount: createdVariants.length
      });
    } else {
      const single = createdVariants[0];
      single.name = compName;
      single.setPluginData('adsc_component_id', compData.id || compName);
      applyFigmaMatrixLayout(single, createdVariants, variantsList, compName, compData, targetPage, targetX, targetY);

      figma.currentPage.selection = [single];
      figma.viewport.scrollAndZoomIntoView([single]);
      const statusMsg = isExistingUpdate 
        ? `✓ Updated existing "${compName}" on canvas!`
        : `✓ Synced "${compName}" to Figma canvas!`;
      figma.notify(statusMsg);

      figma.ui.postMessage({
        type: 'FIGMA_SYNC_SUCCESS',
        componentName: compName,
        variantCount: 1
      });
    }
  } catch (err) {
    console.error("Error creating component set, activating visual fallback frame:", err);
    try {
      const fallbackFrame = figma.createFrame();
      fallbackFrame.name = compName;
      for (const vNode of createdVariants) {
        if (!vNode.removed) fallbackFrame.appendChild(vNode);
      }
      targetPage.appendChild(fallbackFrame);
      applyFigmaMatrixLayout(fallbackFrame, createdVariants, variantsList, compName, compData, targetPage, targetX, targetY);
      figma.currentPage.selection = [fallbackFrame];
      figma.viewport.scrollAndZoomIntoView([fallbackFrame]);

      figma.notify(`✓ Synced "${compName}" (${createdVariants.length} variants) in component frame!`);
      figma.ui.postMessage({
        type: 'FIGMA_SYNC_SUCCESS',
        componentName: compName,
        variantCount: createdVariants.length
      });
    } catch (errFallback) {
      figma.notify(`Error creating variants: ${err.message}`, { error: true });
      figma.ui.postMessage({
        type: 'FIGMA_SYNC_ERROR',
        error: err.message
      });
    }
  }
}

// Main Canvas Generator for Batch of Components (e.g. all Project Scope Components)
async function generateBatchComponentsOnCanvas(batchPayload) {
  await preloadStandardFonts();
  const comps = batchPayload.components || [];
  if (!comps.length) {
    figma.notify('Warning: No components found in project scope payload');
    return;
  }

  let createdCount = 0;
  let updatedCount = 0;
  const createdSets = [];

  for (let idx = 0; idx < comps.length; idx++) {
    const compData = comps[idx];
    const compName = compData.name || `Component ${idx + 1}`;
    const variantsList = compData.variantsList || [];
    if (!variantsList.length) continue;

    // 1. Create or navigate to dedicated Page for each component (Requirement 33)
    let compPage = figma.root.children.find(p => p.name.trim().toLowerCase() === compName.trim().toLowerCase());
    if (!compPage) {
      compPage = figma.createPage();
      compPage.name = compName;
    }

    try {
      if (typeof figma.setCurrentPageAsync === 'function') {
        await figma.setCurrentPageAsync(compPage);
      } else {
        figma.currentPage = compPage;
      }
    } catch (e) {
      figma.currentPage = compPage;
    }

    // 2. Remove any old versions of this component on this page
    const existingNodes = compPage.children.filter(node => {
      return (node.type === "COMPONENT_SET" || node.type === "COMPONENT" || node.type === "FRAME") &&
             (node.name === compName || 
              node.name.startsWith(`${compName} `) ||
              node.name.startsWith(`${compName} /`) ||
              node.name.startsWith(`${compName} -`) ||
              node.getPluginData('adsc_component_id') === (compData.id || compName));
    });

    let targetX = 80;
    let targetY = 80;
    let isExisting = false;

    if (existingNodes.length > 0) {
      targetX = existingNodes[0].x || 80;
      targetY = existingNodes[0].y || 80;
      isExisting = true;
      for (const oldNode of existingNodes) {
        try { oldNode.remove(); } catch (e) {}
      }
      updatedCount++;
    } else {
      createdCount++;
    }

    // 3. Create all variant nodes and attach directly to compPage
    const createdVariants = [];
    for (let i = 0; i < variantsList.length; i++) {
      try {
        const node = createVariantComponentNode(variantsList[i], compName, compPage);
        if (node) createdVariants.push(node);
      } catch (errVar) {
        console.warn(`Error creating variant ${i} for ${compName}:`, errVar);
      }
    }

    if (createdVariants.length === 0) continue;

    // 4. Combine as variants on compPage
    try {
      if (createdVariants.length >= 2) {
        const componentSet = figma.combineAsVariants(createdVariants, compPage);
        componentSet.name = compName;
        componentSet.setPluginData('adsc_component_id', compData.id || compName);

        applyFigmaMatrixLayout(componentSet, createdVariants, variantsList, compName, compData, compPage, targetX, targetY);

        createdSets.push(componentSet);
      } else if (createdVariants.length === 1) {
        const single = createdVariants[0];
        single.name = compName;
        single.setPluginData('adsc_component_id', compData.id || compName);
        applyFigmaMatrixLayout(single, createdVariants, variantsList, compName, compData, compPage, targetX, targetY);
        createdSets.push(single);
      }
    } catch (err) {
      console.warn(`combineAsVariants fallback for ${compName}:`, err);
      // Fallback: Wrap loose variants in an Auto-Layout Frame on compPage so components are NEVER missing!
      try {
        const fallbackFrame = figma.createFrame();
        fallbackFrame.name = compName;
        for (const vNode of createdVariants) {
          if (!vNode.removed) fallbackFrame.appendChild(vNode);
        }
        compPage.appendChild(fallbackFrame);
        applyFigmaMatrixLayout(fallbackFrame, createdVariants, variantsList, compName, compData, compPage, targetX, targetY);
        createdSets.push(fallbackFrame);
      } catch (errFallback) {
        console.error(`Fatal fallback error for ${compName}:`, errFallback);
      }
    }
  }

  // 5. Safely select and zoom to the first generated component on its page
  if (createdSets.length > 0) {
    const firstSet = createdSets[0];
    if (firstSet && firstSet.parent) {
      try {
        if (typeof figma.setCurrentPageAsync === 'function') {
          await figma.setCurrentPageAsync(firstSet.parent);
        } else {
          figma.currentPage = firstSet.parent;
        }
        figma.currentPage.selection = [firstSet];
        figma.viewport.scrollAndZoomIntoView([firstSet]);
      } catch (eSel) {}
    }
  }

  const statusMsg = `✓ Synced all ${createdSets.length} Project Scope components to Figma! (${updatedCount} updated, ${createdCount} created)`;
  figma.notify(statusMsg);

  figma.ui.postMessage({
    type: 'FIGMA_SYNC_SUCCESS',
    componentName: `${createdSets.length} Project Scope Components`,
    variantCount: createdSets.length
  });
}

// Generate Native Figma Color Styles (PaintStyles), Variables & Canvas Swatches
async function generateTokensOnCanvas(tokensPayload) {
  try {
    await preloadStandardFonts();
    const brandTokens = tokensPayload.tokens || tokensPayload;
    const brandName = brandTokens.brand?.name || 'Design System';
    let createdStylesCount = 0;
    let createdVariablesCount = 0;

    // 1. Initialize Figma Variable Collection (if supported)
    let varCollection = null;
    let varModeId = null;
    if (figma.variables && typeof figma.variables.createVariableCollection === 'function') {
      try {
        const collections = figma.variables.getLocalVariableCollections();
        varCollection = collections.find(c => c.name === 'Color Tokens' || c.name === brandName);
        if (!varCollection) {
          varCollection = figma.variables.createVariableCollection(brandName + ' Tokens');
        }
        varModeId = varCollection.modes[0]?.modeId;
      } catch (varErr) {
        console.warn("Figma variables collection setup error:", varErr);
      }
    }

    // Helper to register style and variable simultaneously
    function registerColor(stylePath, hex, desc = '') {
      if (!hex || typeof hex !== 'string') return null;
      // 1. Native Figma PaintStyle (Color Style)
      const style = getOrCreatePaintStyle(stylePath, hex, desc);
      if (style) createdStylesCount++;

      // 2. Native Figma Variable
      if (varCollection && varModeId) {
        const varPath = stylePath.replace(/\s*\/\s*/g, '/');
        const v = getOrCreateColorVariable(varCollection, varModeId, varPath, hex, desc);
        if (v) createdVariablesCount++;
      }
      return style;
    }

    // Look for top-level Design Tokens frames on canvas to clean up & update in-place (Requirement 16)
    const existingTokenNodes = figma.currentPage.children.filter(node => {
      if (!node || node.removed) return false;
      if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "COMPONENT_SET" && node.type !== "GROUP" && node.type !== "SECTION") return false;
      const n = (node.name || '').trim();
      return (
        n.startsWith('🎨 Design Tokens') ||
        n.includes('Design Tokens & Styles') ||
        n.includes('Color Styles & Tokens') ||
        n.startsWith('Brand /') ||
        n.startsWith('Brand/') ||
        n.startsWith('Custom /') ||
        n.startsWith('Custom/') ||
        n.startsWith('Semantic & Feedback') ||
        n.startsWith('Semantic/') ||
        n.includes('Terracotta Primary') ||
        node.getPluginData('adsc_tokens_board') === 'true'
      );
    });

    let tokenTargetX = nextCanvasX;
    let tokenTargetY = nextCanvasY;
    let isTokensUpdated = false;

    if (existingTokenNodes.length > 0) {
      tokenTargetX = Math.min(...existingTokenNodes.map(n => n.x));
      tokenTargetY = Math.min(...existingTokenNodes.map(n => n.y));
      isTokensUpdated = true;

      for (const oldNode of existingTokenNodes) {
        try {
          oldNode.remove();
        } catch (e) {
          console.warn("Could not remove old token node:", e);
        }
      }
    } else {
      nextCanvasX += 700;
    }

    // Main Canvas Artboard Container
    const boardFrame = figma.createFrame();
    boardFrame.name = `🎨 Design Tokens & Styles • ${brandName}`;
    boardFrame.setPluginData('adsc_tokens_board', 'true');
    boardFrame.x = tokenTargetX;
    boardFrame.y = tokenTargetY;
    // Attach immediately to current page
    figma.currentPage.appendChild(boardFrame);

    boardFrame.layoutMode = "VERTICAL";
    boardFrame.itemSpacing = 24;
    boardFrame.paddingTop = 32;
    boardFrame.paddingRight = 32;
    boardFrame.paddingBottom = 32;
    boardFrame.paddingLeft = 32;
    boardFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    boardFrame.cornerRadius = 16;
    boardFrame.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 } }];
    boardFrame.strokeWeight = 1;

    // Header info (synchronous safe character assignment)
    const titleText = figma.createText();
    safeSetCharacters(titleText, `${brandName} — Color Styles & Tokens`);
    titleText.fontSize = 22;
    titleText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    safeAppend(boardFrame, titleText);

    const descText = figma.createText();
    safeSetCharacters(descText, `Native Figma PaintStyles created in Local Styles & Variables. Every swatch below is live-bound to its Color Style.`);
    descText.fontSize = 12;
    descText.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
    safeAppend(boardFrame, descText);

    // ========================================================
    // SECTION 1: BRAND TONAL SCALES (Primary, Secondary, Tertiary)
    // ========================================================
    const brand = brandTokens.brand || {};
    const brandRoles = [
      { key: 'primary', label: 'Primary' },
      { key: 'secondary', label: 'Secondary' },
      { key: 'tertiary', label: 'Tertiary' }
    ];

    for (const role of brandRoles) {
      const palette = brand[role.key];
      if (!palette || !palette.shades) continue;

      const paletteName = palette.name || role.label;
      const groupFrame = figma.createFrame();
      groupFrame.name = `Brand / ${paletteName}`;
      groupFrame.layoutMode = "VERTICAL";
      groupFrame.itemSpacing = 8;
      groupFrame.fills = [];

      // Scale title
      const scaleHeader = figma.createText();
      safeSetCharacters(scaleHeader, `Brand / ${paletteName} (50-950)`);
      scaleHeader.fontSize = 13;
      scaleHeader.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      safeAppend(groupFrame, scaleHeader);

      // Swatches row
      const rowFrame = figma.createFrame();
      rowFrame.name = `Swatches`;
      rowFrame.layoutMode = "HORIZONTAL";
      rowFrame.itemSpacing = 8;
      rowFrame.fills = [];

      const shades = palette.shades || {};
      const shadeKeys = Object.keys(shades).sort((a, b) => parseInt(a) - parseInt(b));

      for (const shadeKey of shadeKeys) {
        const hex = shades[shadeKey];
        const stylePath = `Brand/${role.label}/${shadeKey}`;
        const desc = `${paletteName} tonal step ${shadeKey} (${hex})`;

        // Register as Figma Color Style & Variable
        const style = registerColor(stylePath, hex, desc);

        // Clean Solid Swatch Tile + Text OUTSIDE Below (Requirement 28)
        const swatchUnit = figma.createFrame();
        swatchUnit.name = `${stylePath} • ${hex}`;
        swatchUnit.layoutMode = "VERTICAL";
        swatchUnit.itemSpacing = 3;
        swatchUnit.fills = [];
        swatchUnit.resize(64, 76);

        const colorTile = figma.createFrame();
        colorTile.name = `Tile • ${shadeKey}`;
        colorTile.resize(64, 46);
        colorTile.cornerRadius = 6;
        colorTile.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
        colorTile.strokeWeight = 1;
        if (style) {
          colorTile.fillStyleId = style.id;
        } else {
          colorTile.fills = [{ type: 'SOLID', color: hexToFigmaColor(hex) }];
        }
        safeAppend(swatchUnit, colorTile);

        const stepLabel = figma.createText();
        safeSetCharacters(stepLabel, shadeKey);
        stepLabel.fontSize = 10;
        stepLabel.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
        safeAppend(swatchUnit, stepLabel);

        const hexLabel = figma.createText();
        safeSetCharacters(hexLabel, hex.toUpperCase());
        hexLabel.fontSize = 8;
        hexLabel.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
        safeAppend(swatchUnit, hexLabel);

        safeAppend(rowFrame, swatchUnit);
      }

      safeAppend(groupFrame, rowFrame);
      safeAppend(boardFrame, groupFrame);
    }

    // ========================================================
    // SECTION 2: CUSTOM COLOR FAMILIES (if any)
    // ========================================================
    const customColors = brandTokens.customColors || [];
    if (customColors.length > 0) {
      for (const custom of customColors) {
        if (!custom.shades) continue;
        const customName = custom.name || 'Custom Color';

        const customGroup = figma.createFrame();
        customGroup.name = `Custom / ${customName}`;
        customGroup.layoutMode = "VERTICAL";
        customGroup.itemSpacing = 8;
        customGroup.fills = [];

        const groupHeader = figma.createText();
        safeSetCharacters(groupHeader, `Custom / ${customName} (${custom.role || 'Role'})`);
        groupHeader.fontSize = 13;
        groupHeader.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
        safeAppend(customGroup, groupHeader);

        const customRow = figma.createFrame();
        customRow.name = `Swatches`;
        customRow.layoutMode = "HORIZONTAL";
        customRow.itemSpacing = 8;
        customRow.fills = [];

        const shades = custom.shades || {};
        const shadeKeys = Object.keys(shades).sort((a, b) => parseInt(a) - parseInt(b));

        for (const shadeKey of shadeKeys) {
          const hex = shades[shadeKey];
          const stylePath = `Custom/${customName}/${shadeKey}`;
          const desc = `${customName} step ${shadeKey}`;

          const style = registerColor(stylePath, hex, desc);

          const swatchUnit = figma.createFrame();
          swatchUnit.name = `${stylePath} • ${hex}`;
          swatchUnit.layoutMode = "VERTICAL";
          swatchUnit.itemSpacing = 3;
          swatchUnit.fills = [];
          swatchUnit.resize(64, 76);

          const colorTile = figma.createFrame();
          colorTile.name = `Tile • ${shadeKey}`;
          colorTile.resize(64, 46);
          colorTile.cornerRadius = 6;
          colorTile.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
          colorTile.strokeWeight = 1;
          if (style) {
            colorTile.fillStyleId = style.id;
          } else {
            colorTile.fills = [{ type: 'SOLID', color: hexToFigmaColor(hex) }];
          }
          safeAppend(swatchUnit, colorTile);

          const label = figma.createText();
          safeSetCharacters(label, shadeKey);
          label.fontSize = 10;
          label.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
          safeAppend(swatchUnit, label);

          const hexLabel = figma.createText();
          safeSetCharacters(hexLabel, hex.toUpperCase());
          hexLabel.fontSize = 8;
          hexLabel.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
          safeAppend(swatchUnit, hexLabel);

          safeAppend(customRow, swatchUnit);
        }

        safeAppend(customGroup, customRow);
        safeAppend(boardFrame, customGroup);
      }
    }

    // ========================================================
    // SECTION 3: SEMANTIC & FEEDBACK COLORS
    // ========================================================
    const semantics = brandTokens.ui?.semantics;
    if (semantics) {
      const semanticGroup = figma.createFrame();
      semanticGroup.name = `Semantic & Feedback`;
      semanticGroup.layoutMode = "VERTICAL";
      semanticGroup.itemSpacing = 8;
      semanticGroup.fills = [];

      const semHeader = figma.createText();
      safeSetCharacters(semHeader, `Semantic & Feedback Colors`);
      semHeader.fontSize = 13;
      semHeader.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      safeAppend(semanticGroup, semHeader);

      const semRow = figma.createFrame();
      semRow.name = `Swatches`;
      semRow.layoutMode = "HORIZONTAL";
      semRow.itemSpacing = 8;
      semRow.fills = [];

      const semKeys = ['error', 'warning', 'success', 'info'];
      for (const semKey of semKeys) {
        const semObj = semantics[semKey];
        if (!semObj) continue;

        const capitalized = semKey.charAt(0).toUpperCase() + semKey.slice(1);
        const stylePath = `Semantic/${capitalized}/Base`;
        const style = registerColor(stylePath, semObj.base, `Semantic ${capitalized} base color`);

        const swatchUnit = figma.createFrame();
        swatchUnit.name = `${stylePath} • ${semObj.base}`;
        swatchUnit.layoutMode = "VERTICAL";
        swatchUnit.itemSpacing = 3;
        swatchUnit.fills = [];
        swatchUnit.resize(70, 76);

        const colorTile = figma.createFrame();
        colorTile.name = `Tile • ${capitalized}`;
        colorTile.resize(70, 46);
        colorTile.cornerRadius = 6;
        if (style) {
          colorTile.fillStyleId = style.id;
        } else {
          colorTile.fills = [{ type: 'SOLID', color: hexToFigmaColor(semObj.base) }];
        }
        safeAppend(swatchUnit, colorTile);

        const label = figma.createText();
        safeSetCharacters(label, capitalized);
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
        safeAppend(swatchUnit, label);

        const hexLabel = figma.createText();
        safeSetCharacters(hexLabel, semObj.base.toUpperCase());
        hexLabel.fontSize = 8;
        hexLabel.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
        safeAppend(swatchUnit, hexLabel);

        safeAppend(semRow, swatchUnit);

        if (semObj.lightBg) {
          registerColor(`Semantic/${capitalized}/Background`, semObj.lightBg, `${capitalized} surface background`);
        }
        if (semObj.lightBorder) {
          registerColor(`Semantic/${capitalized}/Border`, semObj.lightBorder, `${capitalized} outline border`);
        }
      }

      safeAppend(semanticGroup, semRow);
      safeAppend(boardFrame, semanticGroup);
    }

    // ========================================================
    // SECTION 4: LIGHT & DARK UI COLORS
    // ========================================================
    const uiTokens = brandTokens.ui;
    if (uiTokens) {
      // Light UI
      const lightBg = uiTokens.backgrounds?.light || {};
      const lightTypo = uiTokens.typography?.light || {};

      registerColor('UI/Light/Background/Page', lightBg.page, 'Light mode page background');
      registerColor('UI/Light/Background/Surface', lightBg.surface, 'Light mode card/surface');
      registerColor('UI/Light/Background/Elevated', lightBg.elevated, 'Light mode dropdown/modal elevated surface');
      registerColor('UI/Light/Background/Subtle', lightBg.subtle, 'Light mode subtle neutral fill');
      registerColor('UI/Light/Border', lightBg.border, 'Light mode border and divider line');

      registerColor('UI/Light/Text/Heading', lightTypo.heading, 'Light mode primary heading text');
      registerColor('UI/Light/Text/Body', lightTypo.body, 'Light mode body copy');
      registerColor('UI/Light/Text/Muted', lightTypo.muted, 'Light mode secondary muted text');
      registerColor('UI/Light/Text/Inverse', lightTypo.inverse, 'Light mode inverse text');

      // Dark UI
      const darkBg = uiTokens.backgrounds?.dark || {};
      const darkTypo = uiTokens.typography?.dark || {};

      registerColor('UI/Dark/Background/Page', darkBg.page, 'Dark mode page background');
      registerColor('UI/Dark/Background/Surface', darkBg.surface, 'Dark mode card/surface');
      registerColor('UI/Dark/Background/Elevated', darkBg.elevated, 'Dark mode elevated surface');
      registerColor('UI/Dark/Background/Subtle', darkBg.subtle, 'Dark mode subtle neutral fill');
      registerColor('UI/Dark/Border', darkBg.border, 'Dark mode border and divider line');

      registerColor('UI/Dark/Text/Heading', darkTypo.heading, 'Dark mode primary heading text');
      registerColor('UI/Dark/Text/Body', darkTypo.body, 'Dark mode body copy');
      registerColor('UI/Dark/Text/Muted', darkTypo.muted, 'Dark mode secondary muted text');
      registerColor('UI/Dark/Text/Inverse', darkTypo.inverse, 'Dark mode inverse text');
    }

    // ========================================================
    // SECTION 5: REGISTER NATIVE FIGMA TEXT STYLES (Requirement 14)
    // ========================================================
    const typoTokens = brandTokens.typographyTokens;
    let createdTextStylesCount = 0;
    if (typoTokens && typoTokens.scale) {
      const sansFont = (typoTokens.fontFamilySans || 'Inter').split(',')[0].replace(/['"]/g, '').trim();
      const existingTextStyles = figma.getLocalTextStyles();

      for (const item of typoTokens.scale) {
        const textStyleName = `Typography/${item.step.toUpperCase()}`;
        let textStyle = existingTextStyles.find(ts => ts.name === textStyleName);
        if (!textStyle) {
          textStyle = figma.createTextStyle();
          textStyle.name = textStyleName;
        }
        try {
          const font = { family: sansFont || "Inter", style: parseInt(item.weight) >= 600 ? "Bold" : (parseInt(item.weight) >= 500 ? "Medium" : "Regular") };
          await figma.loadFontAsync(font);
          textStyle.fontName = font;
          textStyle.fontSize = parseInt(item.size) || 16;
          textStyle.lineHeight = { value: parseInt(item.lineHeight) || 24, unit: "PIXELS" };
          createdTextStylesCount++;
        } catch (e) {}
      }
    }

    // Final selection and zoom
    figma.currentPage.selection = [boardFrame];
    figma.viewport.scrollAndZoomIntoView([boardFrame]);

    const summaryMsg = isTokensUpdated
      ? `✓ Updated Design Tokens & Styles in-place (${createdStylesCount} Color Styles, ${createdTextStylesCount} Text Styles)`
      : `✓ Created ${createdStylesCount} Color Styles & ${createdTextStylesCount} Text Styles in Figma!`;
    figma.notify(summaryMsg);

    figma.ui.postMessage({
      type: 'FIGMA_SYNC_SUCCESS',
      componentName: `${createdStylesCount} Color Styles & ${createdTextStylesCount} Text Styles`,
      variantCount: createdStylesCount
    });
  } catch (err) {
    console.error("Error creating styles on canvas:", err);
    figma.notify(`Error syncing color styles: ${err.message}`, { error: true });
    figma.ui.postMessage({
      type: 'FIGMA_SYNC_ERROR',
      error: err.message
    });
  }
}

// Sequential Canvas Task Queue (prevents concurrent execution / race conditions)
let isCanvasTaskRunning = false;
const canvasTaskQueue = [];

function enqueueCanvasTask(taskFn) {
  canvasTaskQueue.push(taskFn);
  processCanvasQueue();
}

async function processCanvasQueue() {
  if (isCanvasTaskRunning) return;
  if (canvasTaskQueue.length === 0) return;
  isCanvasTaskRunning = true;
  const nextTask = canvasTaskQueue.shift();
  try {
    await nextTask();
  } catch (err) {
    console.error("Canvas task execution error:", err);
  } finally {
    isCanvasTaskRunning = false;
    if (canvasTaskQueue.length > 0) {
      processCanvasQueue();
    }
  }
}

// Listen to messages from plugin ui.html
figma.ui.onmessage = (msg) => {
  if (!msg) return;
  if (msg.type === 'SYNC_PAYLOAD_TO_CANVAS') {
    enqueueCanvasTask(async () => {
      if (msg.payload && (msg.payload.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS' || msg.payload.tokens)) {
        await generateTokensOnCanvas(msg.payload);
      } else if (msg.payload && (msg.payload.type === 'SYNC_PROJECT_COMPONENTS_BATCH' || Array.isArray(msg.payload.components))) {
        await generateBatchComponentsOnCanvas(msg.payload);
      } else {
        await generateComponentSetOnCanvas(msg.payload);
      }
    });
  } else if (msg.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS') {
    enqueueCanvasTask(async () => {
      await generateTokensOnCanvas(msg.payload || msg);
    });
  } else if (msg.type === 'SYNC_PROJECT_COMPONENTS_BATCH') {
    enqueueCanvasTask(async () => {
      await generateBatchComponentsOnCanvas(msg.payload || msg);
    });
  } else if (msg.type === 'NOTIFY') {
    figma.notify(msg.message);
  } else if (msg.type === 'CLOSE') {
    figma.closePlugin();
  }
};
