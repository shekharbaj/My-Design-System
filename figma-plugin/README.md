# AI Design System Bridge &mdash; Figma Companion Plugin

This Figma desktop companion plugin connects directly to the local **AI Design System Creator Bridge** running on `http://localhost:9250`.

When you click **"Push to Figma"** in the web application, this plugin receives the complete component token contract, parses the Auto-Layout rules, colors, corner radii, and nested anatomy hierarchy, and automatically generates a native Figma `ComponentSetNode` with all variants grouped on your canvas!

---

## 🚀 How to Install & Run in Figma Desktop

### Step 1: Open Figma Desktop
Open the [Figma Desktop App](https://www.figma.com/downloads/) on Windows or macOS.

### Step 2: Import Development Plugin
1. Open any existing Figma document or create a new blank canvas.
2. In the top-left main menu, navigate to:
   **Plugins** &rarr; **Development** &rarr; **Import plugin from manifest...**
3. In the file picker dialog, navigate to this directory:
   `c:\Users\DELL\Downloads\Design System\figma-plugin\manifest.json`
4. Select `manifest.json` and click **Open**.

### Step 3: Run the Plugin
1. Go to **Plugins** &rarr; **Development** &rarr; **AI Design System Bridge**.
2. The plugin modal will open, displaying a green **Bridge Connected** indicator for `localhost:9250`.

### Step 4: Sync Components to Canvas
1. In your **AI Design System Creator** web application (`http://localhost:9250`), select any component (e.g., **Button**, **Filter chip**, **Dialog modal**, or **Dropdown menu**).
2. Configure your properties, padding, corner radius, and states in the interactive sandbox.
3. Click the purple **"Push to Figma"** button in the top navigation or Figma view.
4. Watch Figma immediately build the entire Auto-Layout component set and variants right before your eyes!

---

## 🛠️ Features Supported on Figma Canvas
- **Native Auto Layout Frames**: Horizontal/vertical directions, auto-spacing, and padding.
- **Color Token Translation**: Converts hex color codes to native Figma RGB color profiles.
- **Corner Radii & Borders**: Pill radius (9999px), rounded corners, strokes, and stroke weights.
- **Anatomy Nesting**: Preserves leading icons, labels, slot wrappers, and trailing dismiss crosses.
- **Variant Matrix Integration**: Generates the full variant property matrix (e.g., `Variant=Primary, State=Hover, Size=md`) and calls `figma.combineAsVariants()`.
- **Bidirectional Acknowledgment**: Confirms sync back to the web application activity log.
