// AI Design System Creator - Figma Companion Plugin Canvas Engine
// Generates Native Figma Component Sets, Color Styles (PaintStyles) and Design Tokens

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
  if (v.compType) return v.compType;
  if (v.properties?.compType) return v.properties.compType;
  const n = (compName || '').toLowerCase();
  if (n.includes('checkbox')) return 'checkbox';
  if (n.includes('switch') || n.includes('toggle')) return 'switch';
  if (n.includes('radio')) return 'radio';
  if (n.includes('input') || n.includes('textarea')) return 'input';
  if (n.includes('modal') || n.includes('dialog') || n.includes('drawer')) return 'modal';
  if (n.includes('table')) return 'table';
  if (n.includes('avatar')) return 'avatar';
  if (n.includes('badge')) return 'badge';
  if (n.includes('tab')) return 'tab';
  if (n.includes('toast') || n.includes('notification')) return 'toast';
  if (n.includes('card')) return 'card';
  if (n.includes('chip')) return 'chip';
  if (n.includes('dropdown') || n.includes('select') || n.includes('menu')) return 'dropdown';
  return 'button';
}

// Helper: Build an authentic native Figma variant component node
function createVariantComponentNode(v, compName) {
  const compType = detectComponentType(compName, v);
  const compNode = figma.createComponent();
  compNode.name = v.name || 'Variant';

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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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
    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
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

    figma.currentPage.appendChild(compNode);
    return compNode;
  }

  // 12. Button / Compact button / Chip / Default interactive
  compNode.layoutMode = "HORIZONTAL";
  compNode.primaryAxisAlignItems = "CENTER";
  compNode.counterAxisAlignItems = "CENTER";

  const p = v.styles?.padding || { top: 8, right: 12, bottom: 8, left: 12 };
  compNode.paddingTop = typeof p === 'number' ? p : (p.top ?? 8);
  compNode.paddingRight = typeof p === 'number' ? p : (p.right ?? 12);
  compNode.paddingBottom = typeof p === 'number' ? p : (p.bottom ?? 8);
  compNode.paddingLeft = typeof p === 'number' ? p : (p.left ?? 12);
  compNode.itemSpacing = v.styles?.gap ?? 6;

  // Fills
  if (v.styles?.bg && v.styles.bg !== 'transparent') {
    compNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles.bg) }];
  } else {
    compNode.fills = [];
  }

  // Strokes
  if (v.styles?.border && v.styles.border !== 'transparent') {
    compNode.strokes = [{ type: 'SOLID', color: hexToFigmaColor(v.styles.border) }];
    compNode.strokeWeight = v.styles.borderWidth || 1;
  } else {
    compNode.strokes = [];
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

  // Text label layer
  const textNode = figma.createText();
  textNode.name = "Label";
  const labelText = v.properties?.label || v.properties?.Label || compName;
  safeSetCharacters(textNode, labelText);
  if (v.styles?.fontSize) textNode.fontSize = v.styles.fontSize;
  textNode.fills = [{ type: 'SOLID', color: hexToFigmaColor(v.styles?.text || '#1E293B') }];
  compNode.appendChild(textNode);

  figma.currentPage.appendChild(compNode);
  return compNode;
}

// Main Canvas Generator for a Single Component Set
async function generateComponentSetOnCanvas(payload) {
  await preloadStandardFonts();
  const compData = payload.component || payload;
  const compName = compData.name || 'Component';
  const variantsList = compData.variantsList || [];

  if (variantsList.length === 0) {
    figma.notify(`Warning: No variants received for ${compName}`);
    return;
  }

  // Look for any existing component set, components or frames on canvas to update in-place FIRST (Requirement 16)
  let targetX = nextCanvasX;
  let targetY = nextCanvasY;
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
    targetX = existingNodes[0].x;
    targetY = existingNodes[0].y;
    isExistingUpdate = true;
    for (const oldNode of existingNodes) {
      try { oldNode.remove(); } catch (e) {}
    }
  } else {
    nextCanvasX += 550; // Only advance next cursor for new components
  }

  const createdVariants = [];
  for (let i = 0; i < variantsList.length; i++) {
    const node = createVariantComponentNode(variantsList[i], compName);
    createdVariants.push(node);
  }

  // Combine variants into a native Figma ComponentSetNode if >= 2, else single component
  try {
    if (createdVariants.length >= 2) {
      const componentSet = figma.combineAsVariants(createdVariants, figma.currentPage);
      componentSet.name = compName;
      componentSet.setPluginData('adsc_component_id', compData.id || compName);
      
      componentSet.x = targetX;
      componentSet.y = targetY;

      componentSet.layoutMode = "HORIZONTAL";
      componentSet.layoutWrap = "WRAP";
      componentSet.itemSpacing = 20;
      componentSet.counterAxisSpacing = 20;
      componentSet.paddingTop = 28;
      componentSet.paddingRight = 28;
      componentSet.paddingBottom = 28;
      componentSet.paddingLeft = 28;

      componentSet.strokes = [{
        type: 'SOLID',
        color: { r: 0.63, g: 0.35, b: 1.0 }
      }];
      componentSet.strokeWeight = 1;
      componentSet.cornerRadius = 8;

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
      single.x = targetX;
      single.y = targetY;

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
    console.error("Error creating component set:", err);
    figma.notify(`Error creating variants: ${err.message}`, { error: true });
    figma.ui.postMessage({
      type: 'FIGMA_SYNC_ERROR',
      error: err.message
    });
  }
}

// Main Canvas Generator for Batch of Components (e.g. all 19 Project Scope Components)
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

  // Determine starting anchor coordinates
  // Place components neatly in a 4-column shelf below tokens board
  const COL_COUNT = 4;
  const CELL_GAP_X = 550;
  const CELL_GAP_Y = 400;

  let baseStartX = 0;
  let baseStartY = 0;

  const existingTokensBoard = figma.currentPage.findOne(node => {
    return (node.type === "FRAME" || node.type === "GROUP") && 
           (node.name && (node.name.includes('Design Tokens') || node.name.includes('Color Styles')));
  });

  if (existingTokensBoard) {
    baseStartX = existingTokensBoard.x;
    baseStartY = existingTokensBoard.y + existingTokensBoard.height + 150;
  }

  let newComponentIndex = 0;

  for (let idx = 0; idx < comps.length; idx++) {
    const compData = comps[idx];
    const compName = compData.name || `Component ${idx + 1}`;
    const variantsList = compData.variantsList || [];
    if (!variantsList.length) continue;

    // Check for existing node on canvas to update in-place (Requirement 16)
    // Match ONLY top-level children on current page
    const existingNodes = figma.currentPage.children.filter(node => {
      return (node.type === "COMPONENT_SET" || node.type === "COMPONENT" || node.type === "FRAME") &&
             (node.name === compName || 
              node.name.startsWith(`${compName} `) ||
              node.name.startsWith(`${compName} /`) ||
              node.name.startsWith(`${compName} -`) ||
              node.getPluginData('adsc_component_id') === (compData.id || compName));
    });

    let targetX = 0;
    let targetY = 0;
    let isExisting = false;

    if (existingNodes.length > 0) {
      targetX = existingNodes[0].x;
      targetY = existingNodes[0].y;
      isExisting = true;
      for (const oldNode of existingNodes) {
        try { oldNode.remove(); } catch (e) {}
      }
      updatedCount++;
    } else {
      const col = newComponentIndex % COL_COUNT;
      const row = Math.floor(newComponentIndex / COL_COUNT);
      targetX = baseStartX + (col * CELL_GAP_X);
      targetY = baseStartY + (row * CELL_GAP_Y);
      newComponentIndex++;
      createdCount++;
    }

    const createdVariants = [];
    for (let i = 0; i < variantsList.length; i++) {
      const node = createVariantComponentNode(variantsList[i], compName);
      createdVariants.push(node);
    }

    try {
      if (createdVariants.length >= 2) {
        const componentSet = figma.combineAsVariants(createdVariants, figma.currentPage);
        componentSet.name = compName;
        componentSet.setPluginData('adsc_component_id', compData.id || compName);
        componentSet.x = targetX;
        componentSet.y = targetY;

        componentSet.layoutMode = "HORIZONTAL";
        componentSet.layoutWrap = "WRAP";
        componentSet.itemSpacing = 20;
        componentSet.counterAxisSpacing = 20;
        componentSet.paddingTop = 28;
        componentSet.paddingRight = 28;
        componentSet.paddingBottom = 28;
        componentSet.paddingLeft = 28;

        componentSet.strokes = [{
          type: 'SOLID',
          color: { r: 0.63, g: 0.35, b: 1.0 }
        }];
        componentSet.strokeWeight = 1;
        componentSet.cornerRadius = 8;

        createdSets.push(componentSet);
      } else if (createdVariants.length === 1) {
        const single = createdVariants[0];
        single.name = compName;
        single.setPluginData('adsc_component_id', compData.id || compName);
        single.x = targetX;
        single.y = targetY;
        createdSets.push(single);
      }
    } catch (err) {
      console.warn(`Error generating component set for ${compName}:`, err);
    }
  }

  if (createdSets.length > 0) {
    figma.currentPage.selection = createdSets;
    figma.viewport.scrollAndZoomIntoView(createdSets);
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
      if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "COMPONENT_SET" && node.type !== "GROUP") return false;
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
    boardFrame.appendChild(titleText);

    const descText = figma.createText();
    safeSetCharacters(descText, `Native Figma PaintStyles created in Local Styles & Variables. Every swatch below is live-bound to its Color Style.`);
    descText.fontSize = 12;
    descText.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.45, b: 0.45 } }];
    boardFrame.appendChild(descText);

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
      groupFrame.appendChild(scaleHeader);

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

        // Visual Swatch Frame bound to the Color Style
        const swatch = figma.createFrame();
        swatch.name = `${stylePath} • ${hex}`;
        swatch.resize(60, 72);
        swatch.cornerRadius = 6;
        swatch.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
        swatch.strokeWeight = 1;

        if (style) {
          swatch.fillStyleId = style.id;
        } else {
          swatch.fills = [{ type: 'SOLID', color: hexToFigmaColor(hex) }];
        }

        swatch.layoutMode = "VERTICAL";
        swatch.primaryAxisAlignItems = "MAX";
        swatch.paddingBottom = 6;
        swatch.paddingLeft = 6;
        swatch.itemSpacing = 2;

        const isDark = parseInt(shadeKey) > 400;
        const textColor = isDark ? { r: 1, g: 1, b: 1 } : { r: 0.1, g: 0.1, b: 0.1 };

        // Step text
        const stepLabel = figma.createText();
        safeSetCharacters(stepLabel, shadeKey);
        stepLabel.fontSize = 11;
        stepLabel.fills = [{ type: 'SOLID', color: textColor }];
        swatch.appendChild(stepLabel);

        // Hex text
        const hexLabel = figma.createText();
        safeSetCharacters(hexLabel, hex.toUpperCase());
        hexLabel.fontSize = 8;
        hexLabel.fills = [{ type: 'SOLID', color: textColor }];
        swatch.appendChild(hexLabel);

        rowFrame.appendChild(swatch);
      }

      groupFrame.appendChild(rowFrame);
      boardFrame.appendChild(groupFrame);
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
        customGroup.appendChild(groupHeader);

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

          const swatch = figma.createFrame();
          swatch.name = `${stylePath} • ${hex}`;
          swatch.resize(60, 72);
          swatch.cornerRadius = 6;
          swatch.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
          swatch.strokeWeight = 1;

          if (style) {
            swatch.fillStyleId = style.id;
          } else {
            swatch.fills = [{ type: 'SOLID', color: hexToFigmaColor(hex) }];
          }

          swatch.layoutMode = "VERTICAL";
          swatch.primaryAxisAlignItems = "MAX";
          swatch.paddingBottom = 6;
          swatch.paddingLeft = 6;

          const isDark = parseInt(shadeKey) > 400;
          const label = figma.createText();
          safeSetCharacters(label, shadeKey);
          label.fontSize = 11;
          label.fills = [{ type: 'SOLID', color: isDark ? { r: 1, g: 1, b: 1 } : { r: 0.1, g: 0.1, b: 0.1 } }];
          swatch.appendChild(label);

          customRow.appendChild(swatch);
        }

        customGroup.appendChild(customRow);
        boardFrame.appendChild(customGroup);
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
      semanticGroup.appendChild(semHeader);

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

        const swatch = figma.createFrame();
        swatch.name = `${stylePath} • ${semObj.base}`;
        swatch.resize(70, 72);
        swatch.cornerRadius = 6;
        if (style) {
          swatch.fillStyleId = style.id;
        } else {
          swatch.fills = [{ type: 'SOLID', color: hexToFigmaColor(semObj.base) }];
        }
        swatch.layoutMode = "VERTICAL";
        swatch.primaryAxisAlignItems = "MAX";
        swatch.paddingBottom = 6;
        swatch.paddingLeft = 6;

        const label = figma.createText();
        safeSetCharacters(label, capitalized);
        label.fontSize = 10;
        label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        swatch.appendChild(label);

        semRow.appendChild(swatch);

        if (semObj.lightBg) {
          registerColor(`Semantic/${capitalized}/Background`, semObj.lightBg, `${capitalized} surface background`);
        }
        if (semObj.lightBorder) {
          registerColor(`Semantic/${capitalized}/Border`, semObj.lightBorder, `${capitalized} outline border`);
        }
      }

      semanticGroup.appendChild(semRow);
      boardFrame.appendChild(semanticGroup);
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
