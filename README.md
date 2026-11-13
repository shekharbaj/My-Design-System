# AI Design System Creator & Editor with Figma Desktop Bridge

> A full-stack web application for designing, inspecting, and managing design system component tokens, nested anatomy hierarchies, interactive state sandboxes, and multi-dimensional variant matrices &mdash; with a native **Figma Desktop Bridge** architecture to synchronize component sets directly into your local Figma workspace canvas.

---

## 🌟 Key Architecture & Features

### 1. Dashboard & Navigation
- **Left Sidebar Component Library**: Pre-loaded with rich, accessible component specifications (**Button**, **Filter chip**, **Dialog modal**, **Dropdown menu**), live search/filter by text (with `Ctrl+K` shortcut), category filters, and a **"+ New component"** modal creator.
- **Top Navigation Bar**:
  - Live Figma Bridge indicator pill with real-time status and port feedback (`localhost:9250`).
  - View switcher: **Preview**, **Variant Matrix**, **Code**, and **Figma**.
  - Smooth **Light / Dark Mode** theme switcher with token persistence.
  - Quick action buttons for **Anatomy Hierarchy**, **Properties Drawer**, and one-click **"Push to Figma"**.

### 2. Component Configuration Engine
- **Property Management Drawer / Modal**:
  - Add, edit, or configure component props across all 8 kinds:
    - `Options`: Multi-value choices (e.g., `variant: ["primary", "secondary", "outline", "ghost", "danger"]`).
    - `On / Off`: Boolean toggles (e.g., `hasLeftIcon`, `selected`, `showBackdrop`).
    - `Text`: String content bindings (e.g., `label`, `title`, `bodyText`).
    - `Swap`: Swappable icon or sub-instance glyphs.
    - `Slot`: Component composition slots.
    - `Number`: Accessibility indexes, item counts, or dimension constraints.
    - `Event`: Callback action triggers (e.g., `onClick`, `onDismiss`).
    - `Interaction states`: Dynamic states (`Rest`, `Hover`, `Focus`, `Press`).
- **Anatomy Structured Tree View**:
  - Visual hierarchical tree showing nested parts (`Outer box` &rarr; `Container` &rarr; `Icon` &rarr; `Label` &rarr; `Slot`).
  - Add child parts, adjust element types (`frame`, `text`, `icon`, `slot`, `button`), and set flex directions (`row`, `column`).
  - Live updates dynamically reflect in the JSON contract generator on the right.
- **Interactive State Preview Sandbox**:
  - Instant interaction state switching: `Rest`, `Hover`, `Focus`, and `Press`.
  - Visual box-model overlays with padding guides and dimension badges (e.g., `128px × 36px`).
  - Layout & styling controls:
    - **Padding**: Individual Top, Right, Bottom, Left scrubbers with box-model visualizer.
    - **Gap**: Auto-layout spacing between elements.
    - **Alignment**: Flex Start, Center, Flex End, and Stretch.
    - **Colors**: Real-time hex inputs and native color pickers for background, foreground text, and stroke border.
    - **Corners**: Border-radius slider (from subtle 6px to 9999px pill).
    - **Shadows**: Elevation presets (Elevation 1, Elevation 2, Deep Modal Elevation 3, Focus Ring Glow).
- **Variant Matrix View**:
  - High-density multi-dimensional grid mapping large combinations of states, sizes, and variants.
  - Cross-tabulates variants (rows) &times; states (columns) &times; sizes (e.g., 20+ variations per component).
  - Click any cell to inspect its exact design tokens, export JSON, or test it directly in the sandbox.
- **Live Code & Contract Generator**:
  - **DTCG JSON Contract**: Community Group compliant Design Tokens JSON format.
  - **React / JSX Code**: Fully typed, accessible component implementation with state handlers.
  - **TypeScript Interfaces**: Schema definitions and variant types.
  - **CSS Variables**: Auto Layout CSS variables and design tokens.
  - One-click **"Copy Code"** and **"Download File"** buttons.

### 3. Figma Bridge Architecture (Crucial)
- **Local Bridge Server (`localhost:9250`)**:
  - Runs on port `9250` with full CORS support.
  - Real-time bidirectional WebSocket channel (`ws://localhost:9250`) and REST endpoints:
    - `GET /api/status`: Health check & client counts.
    - `GET /api/components` & `POST /api/components`: Persistent component library store.
    - `POST /api/figma/push`: Queues and broadcasts component schema to Figma.
    - `GET /api/figma/pending`: Polling endpoint for companion plugins.
    - `POST /api/figma/ack`: Sync acknowledgment from Figma canvas engine.
  - **Dual Server Implementations**:
    - `server.js`: Standard Node.js server.
    - `server.ps1`: Zero-dependency native Windows PowerShell server running on .NET `TcpListener` (runs on any Windows PC out of the box with 0 installs!).
- **Companion Figma Development Plugin (`figma-plugin/`)**:
  - `manifest.json`: Manifest v2 with local network permissions.
  - `ui.html`: Plugin UI modal showing live bridge status, auto-sync toggle, and activity logs.
  - `code.js`: Canvas generator that loads Google/Inter fonts, creates Auto-Layout frames, sets colors, corner radii, text layers, combines variants into a native Figma `ComponentSetNode` (`figma.combineAsVariants()`), and zooms to selection!

---

## 🚀 Quickstart & How to Run

### Option A: One-Click Runner (Windows)
Double-click `start.bat` in the project root:
- It automatically detects whether Node.js is installed.
- If Node.js is found, it runs `server.js`.
- If Node.js is not found, it runs the native Windows `server.ps1`.
- It automatically opens `http://localhost:9250` in your default browser!

### Option B: Using Node.js / NPM
```bash
# Start server on port 9250
npm start
```
Then open: **`http://localhost:9250`** in your browser.

### Option C: Using Native Windows PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
Then open: **`http://localhost:9250`** in your browser.

---

## 🎨 Testing the Figma Bridge Sync

1. Start the bridge server via `start.bat`, `npm start`, or `powershell -ExecutionPolicy Bypass -File .\server.ps1`.
2. Open **Figma Desktop** on your machine.
3. In Figma, navigate to:
   **Plugins** &rarr; **Development** &rarr; **Import plugin from manifest...**
4. Select `figma-plugin\manifest.json`.
5. Run the plugin **"AI Design System Bridge"**.
   - Notice the plugin UI shows **Bridge Connected** to `localhost:9250`.
6. Go back to your browser at `http://localhost:9250`.
7. Choose any component (e.g., **Button** or **Filter chip**), customize the styles, and click **"Push to Figma"**.
8. Look at your Figma canvas &mdash; the entire component set, auto-layout frames, text labels, and all variants will be created on the canvas automatically!

---

## 📁 Project Structure

```
├── package.json               # NPM configuration & dependencies
├── server.js                  # Node.js Express/HTTP + WebSocket bridge server
├── server.ps1                 # Native Windows PowerShell HTTP server
├── start.bat                  # One-click Windows runner
├── data/
│   └── components.json        # Preloaded components specification
├── public/                    # Frontend Web Application
│   ├── index.html             # Main single-page application
│   ├── css/
│   │   ├── app.css            # Design tokens, theme styling, layout
│   │   ├── matrix.css         # Variant matrix table & inspector drawer
│   │   └── anatomy.css        # Visual anatomy tree & hierarchy
│   ├── js/
│   │   ├── app.js             # Main orchestrator & UI bindings
│   │   ├── store.js           # Reactive central state store
│   │   ├── bridge-client.js   # Client bridge connector (WS + HTTP fallback)
│   │   ├── components-data.js # Initial component library & SVG icons
│   │   ├── views/
│   │   │   ├── preview-view.js # Interactive State Sandbox & Layout Inspector
│   │   │   ├── matrix-view.js  # Multi-dimensional Variant Matrix View
│   │   │   ├── code-view.js    # Live JSON DTCG contract, React & TS generator
│   │   │   └── figma-view.js   # Figma Bridge monitor & push dashboard
│   │   └── modals/
│   │       ├── prop-modal.js   # Property Management Drawer (8 kinds)
│   │       ├── anatomy-modal.js# Anatomy Structured Tree View
│   │       └── new-component.js# New Component Creator Modal
└── figma-plugin/              # Companion Figma Development Plugin
    ├── manifest.json          # Figma Plugin Manifest v2
    ├── code.js                # Figma Canvas Auto-Layout & Variant Set generator
    ├── ui.html                # Plugin UI with WebSocket & polling listener
    └── README.md              # Figma plugin setup guide
```
