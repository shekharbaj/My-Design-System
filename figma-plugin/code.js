// AI Design System Creator - Figma Companion Plugin Canvas Engine
// Runs inside the Figma desktop sandbox and generates native component sets & variants

figma.showUI(__html__, { width: 340, height: 490 });

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

// Load default fonts asynchronously
async function loadRequiredFonts() {
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  } catch (e) {
    console.warn("Inter font failed to load, falling back to Roboto", e);
    try {
      await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
      await figma.loadFontAsync({ family: "Roboto", style: "Bold" });
    } catch (e2) {
      console.warn("Roboto fallback font failed:", e2);
    }
  }
}

// Global canvas placement cursor
let nextCanvasX = 0;
let nextCanvasY = 0;

// Main Canvas Generator
async function generateComponentSetOnCanvas(payload) {
  await loadRequiredFonts();

  const compData = payload.component;
  const compName = compData.name || 'Component';
  const variantsList = compData.variantsList || [];

  if (variantsList.length === 0) {
    figma.notify(`Warning: No variants received for ${compName}`);
    return;
  }

  // Create individual ComponentNode for each variant in the matrix
  const createdVariants = [];

  for (let i = 0; i < variantsList.length; i++) {
    const v = variantsList[i];
    const compNode = figma.createComponent();
    compNode.name = v.name; // Format: "Variant=Primary, State=Rest, Size=md"

    // Enable Auto-layout
    compNode.layoutMode = "HORIZONTAL";
    compNode.primaryAxisAlignItems = "CENTER";
    compNode.counterAxisAlignItems = "CENTER";

    const p = v.styles.padding || { top: 10, right: 18, bottom: 10, left: 18 };
    compNode.paddingTop = p.top;
    compNode.paddingRight = p.right;
    compNode.paddingBottom = p.bottom;
    compNode.paddingLeft = p.left;
    compNode.itemSpacing = v.styles.gap || 8;

    // Fills (Background)
    if (v.styles.bg && v.styles.bg !== 'transparent') {
      compNode.fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(v.styles.bg)
      }];
    } else {
      compNode.fills = [];
    }

    // Strokes (Border)
    if (v.styles.border && v.styles.border !== 'transparent') {
      compNode.strokes = [{
        type: 'SOLID',
        color: hexToFigmaColor(v.styles.border)
      }];
      compNode.strokeWeight = v.styles.borderWidth || 1;
    } else {
      compNode.strokes = [];
    }

    // Corner Radius
    const cornerRadius = v.styles.cornerRadius >= 9999 ? 999 : (v.styles.cornerRadius || 8);
    compNode.cornerRadius = cornerRadius;

    // Create child layers: Left Icon (if enabled), Text Label, Right Icon
    if (v.properties.hasLeftIcon) {
      const iconNode = figma.createFrame();
      iconNode.name = "Icon / Leading";
      iconNode.resize(v.styles.fontSize || 14, v.styles.fontSize || 14);
      iconNode.fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(v.styles.text)
      }];
      iconNode.cornerRadius = 2;
      compNode.appendChild(iconNode);
    }

    // Text layer
    const textNode = figma.createText();
    textNode.name = "Label";
    textNode.characters = v.properties.label || v.properties.triggerText || compName;
    textNode.fontSize = v.styles.fontSize || 14;
    textNode.fills = [{
      type: 'SOLID',
      color: hexToFigmaColor(v.styles.text)
    }];
    compNode.appendChild(textNode);

    if (v.properties.hasTrailingIcon) {
      const rightIcon = figma.createFrame();
      rightIcon.name = "Icon / Trailing";
      rightIcon.resize(v.styles.fontSize || 14, v.styles.fontSize || 14);
      rightIcon.fills = [{
        type: 'SOLID',
        color: hexToFigmaColor(v.styles.text)
      }];
      rightIcon.cornerRadius = 2;
      compNode.appendChild(rightIcon);
    }

    createdVariants.push(compNode);
  }

  // Combine individual variants into a native Figma ComponentSetNode!
  let componentSet;
  try {
    componentSet = figma.combineAsVariants(createdVariants, figma.currentPage);
    componentSet.name = compName;
    
    // Position component set neatly on canvas
    componentSet.x = nextCanvasX;
    componentSet.y = nextCanvasY;
    nextCanvasX += componentSet.width + 120;

    // Apply auto-layout to the component set container for clean grid alignment
    componentSet.layoutMode = "HORIZONTAL";
    componentSet.layoutWrap = "WRAP";
    componentSet.itemSpacing = 24;
    componentSet.counterAxisSpacing = 24;
    componentSet.paddingTop = 32;
    componentSet.paddingRight = 32;
    componentSet.paddingBottom = 32;
    componentSet.paddingLeft = 32;

    // Add a subtle border and background to the component set frame
    componentSet.strokes = [{
      type: 'SOLID',
      color: { r: 0.63, g: 0.35, b: 1.0 } // Figma purple
    }];
    componentSet.strokeWeight = 1;
    componentSet.cornerRadius = 8;

    // Select and zoom into view
    figma.currentPage.selection = [componentSet];
    figma.viewport.scrollAndZoomIntoView([componentSet]);

    figma.notify(`✓ Synced "${compName}" (${createdVariants.length} variants) to Figma canvas!`);

    // Acknowledge back to UI and bridge
    figma.ui.postMessage({
      type: 'FIGMA_SYNC_SUCCESS',
      componentName: compName,
      variantCount: createdVariants.length
    });
  } catch (err) {
    console.error("Error creating component set:", err);
    figma.notify(`Error creating variants: ${err.message}`, { error: true });
    figma.ui.postMessage({
      type: 'FIGMA_SYNC_ERROR',
      error: err.message
    });
  }
}

async function generateTokensOnCanvas(tokensPayload) {
  await loadRequiredFonts();
  try {
    const brandTokens = tokensPayload.tokens || tokensPayload;
    const frame = figma.createFrame();
    frame.name = `🎨 Design Tokens • ${brandTokens.brand?.name || 'Brand Guidelines'}`;
    frame.x = nextCanvasX;
    frame.y = nextCanvasY;
    frame.layoutMode = "VERTICAL";
    frame.itemSpacing = 24;
    frame.paddingTop = 32;
    frame.paddingRight = 32;
    frame.paddingBottom = 32;
    frame.paddingLeft = 32;
    frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    frame.cornerRadius = 12;

    // Title
    const titleText = figma.createText();
    titleText.fontName = { family: "Inter", style: "Bold" };
    titleText.characters = `${brandTokens.brand?.name || 'Brand'} Color Palettes & UI Tokens`;
    titleText.fontSize = 20;
    frame.appendChild(titleText);

    // Palettes: Primary, Secondary, Tertiary
    const brand = brandTokens.brand || {};
    const roles = ['primary', 'secondary', 'tertiary'];

    roles.forEach(roleKey => {
      const palette = brand[roleKey];
      if (!palette) return;

      const rowFrame = figma.createFrame();
      rowFrame.name = `${palette.name || roleKey} Scale (50-950)`;
      rowFrame.layoutMode = "HORIZONTAL";
      rowFrame.itemSpacing = 8;
      rowFrame.fills = [];

      const shades = palette.shades || {};
      Object.keys(shades).sort((a, b) => parseInt(a) - parseInt(b)).forEach(shadeKey => {
        const hex = shades[shadeKey];
        const swatch = figma.createFrame();
        swatch.name = `${palette.name || roleKey}/${shadeKey}`;
        swatch.resize(54, 64);
        swatch.cornerRadius = 6;
        swatch.fills = [{ type: 'SOLID', color: hexToFigmaColor(hex) }];
        swatch.layoutMode = "VERTICAL";
        swatch.primaryAxisAlignItems = "MAX";
        swatch.paddingBottom = 4;
        swatch.paddingLeft = 4;

        // Label
        const label = figma.createText();
        label.fontName = { family: "Inter", style: "Regular" };
        label.fontSize = 9;
        label.characters = shadeKey;
        label.fills = [{ type: 'SOLID', color: parseInt(shadeKey) > 400 ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 } }];
        swatch.appendChild(label);

        rowFrame.appendChild(swatch);
      });

      frame.appendChild(rowFrame);
    });

    figma.currentPage.appendChild(frame);
    nextCanvasX += frame.width + 120;
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.notify(`✓ Synced Design Tokens & Brand Colors to Figma canvas!`);
  } catch (err) {
    console.error("Error creating tokens on canvas:", err);
    figma.notify(`Error syncing tokens: ${err.message}`, { error: true });
  }
}

// Listen to messages from plugin ui.html
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'SYNC_PAYLOAD_TO_CANVAS') {
    if (msg.payload && msg.payload.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS') {
      await generateTokensOnCanvas(msg.payload);
    } else {
      await generateComponentSetOnCanvas(msg.payload);
    }
  } else if (msg.type === 'SYNC_FIGMA_VARIABLES_AND_TOKENS') {
    await generateTokensOnCanvas(msg.payload || msg);
  } else if (msg.type === 'NOTIFY') {
    figma.notify(msg.message);
  } else if (msg.type === 'CLOSE') {
    figma.closePlugin();
  }
};
