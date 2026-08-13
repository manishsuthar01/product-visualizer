# 🏡 House of Décor — Product Floor Visualizer Studio

An enterprise-grade, interactive **2D Room Floor Visualizer & Perspective Mesh Engine** built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Zustand v5**, and native **HTML5 Canvas 2D**. 

This application allows interior designers, retailers, and clients to preview high-end rug and flooring products directly within photorealistic room scenes or custom-uploaded interior photos.

---

## 🌟 Key Features

- 📐 **Perspective Quad Warp Engine**: Subdivides rug textures into a 16×16 bilinear mesh of quad cells. Each cell is rendered using dual affine triangle transformations for sub-pixel perspective accuracy.
- 🎯 **Interactive 4-Corner Alignment**: Drag quad corners directly on the canvas to match floor perspective lines. Features vanishing-point perspective guide grids, edge snapping, and one-click perspective presets.
- 🖌️ **Mask Painting & Obstacle Erasing**: Integrated offscreen mask canvas supporting brush painting and erasing to cut out furniture legs, tables, or room obstacles above the rug.
- 🪄 **Sobel Edge-Detection & Magic Wand**: Auto-snapping mask brush leveraging Sobel matrix filter edge detection to snap brush strokes to object borders, plus color-flooding Magic Wand selection.
- 📦 **Table Box Cutout Tool**: Drag-and-drop rectangle mask tool for cleanly carving out rectangular furniture (like coffee tables) placed over rugs.
- 🖼️ **Room & Product Catalogs**: Includes preset high-res room photography (Modern Living Room, Bedroom, Luxury Suite) and custom room photo upload with automatic perspective quad calculations.
- ☀️ **Lighting, Texture & Contact Shadows**: Real-time opacity sliders, floor texture blend mode (multiply compositing to preserve natural floor grain/lighting), soft blur contact floor shadows, and drop shadow controls.
- 🔍 **Interactive Zoom & Pan Studio**: Smooth centered canvas zoom up to 500% with mouse wheel or keyboard shortcuts, plus drag-panning.
- 📤 **High-Resolution Export & Comparison**: Render and download high-res composite PNG images of final visualizations, or toggle split-screen Before/After comparison mode.
- ↩️ **Undo / Redo System**: Full snapshot history for mask painting and erasing operations with keyboard shortcut support (`Ctrl+Z`, `Ctrl+Y`).

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org) | React Server Components, file-based routing, dynamic imports |
| **UI Library** | [React 19](https://react.dev) | Declarative UI components & custom hooks |
| **Language** | [TypeScript 5](https://www.typescriptlang.org) | End-to-end type safety |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Utility-first CSS with modern `@theme` design tokens |
| **State Management** | [Zustand v5](https://zustand-demo.pmnd.rs) | Single global store (`useVisualizerStore`) with reducer dispatch |
| **Canvas Engine** | Native HTML5 Canvas 2D API | Offscreen mask compositing, bilinear texture quad mapping, Sobel filter |
| **Image Loading** | `use-image` | Asynchronous image preloading hook |
| **Icons** | [Lucide React](https://lucide.dev) | Modern icon set |

---

## 📂 Project Directory Structure

```
visualization/
├── public/
│   ├── products/                          # High-res rug product WebP images
│   └── rooms/                             # Room preset photos & thumbnails
├── src/
│   ├── app/
│   │   ├── globals.css                    # Design tokens, CSS variables, base styles
│   │   ├── layout.tsx                     # Root layout with Geist font configuration
│   │   ├── page.tsx                       # Home page — Hero banner & product catalog grid
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Product detail page & specification launcher
│   │   └── visualizer/
│   │       └── page.tsx                  # Visualizer studio entry page
│   ├── components/
│   │   ├── products/
│   │   │   └── ProductCard.tsx           # Catalog card component
│   │   └── visualizer/
│   │       ├── RoomVisualizer.tsx         # Studio header & dynamic canvas loader
│   │       ├── VisualizationCanvas.tsx    # ★ Core 1400+ line HTML5 Canvas studio
│   │       ├── VisualizerToolbar.tsx      # Control sidebar (tools, presets, sliders)
│   │       └── RoomSelector.tsx          # Room switcher & drag-and-drop uploader
│   ├── data/
│   │   ├── products.ts                   # Product catalog definition & sizes
│   │   └── rooms.ts                      # Room presets & default perspective quads
│   ├── hooks/
│   │   ├── useVisualizer.ts              # Zustand global state store & dispatch
│   │   └── useCanvasZoom.ts             # Zoom, pan, & screen-to-canvas coordinate math
│   ├── lib/
│   │   └── visualization/
│   │       ├── quadWarp.ts               # Bilinear quad subdivision & triangle texturing
│   │       ├── edgeDetection.ts          # Sobel filter algorithm for smart brush snap
│   │       └── perspective.ts            # Quad manipulation utilities
│   └── types/
│       └── visualization.ts              # TypeScript interfaces (Point2D, QuadCorners, etc.)
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📚 Technical Documentation Hub

For deep architectural analyses, pixel-level behavioral specs, and source code reference:

- 🏗️ **[Architectural Specification](file:///c:/Users/Hp/Desktop/visualization/VISUALIZER_ARCHITECTURE.md)** (`VISUALIZER_ARCHITECTURE.md`): Detailed breakdown of system dependencies, state flow, rendering pipeline, component tree, and mathematical algorithms.
- 🕹️ **[Behavioral & Interaction Spec](file:///c:/Users/Hp/Desktop/visualization/VISUALIZER_BEHAVIOR.md)** (`VISUALIZER_BEHAVIOR.md`): Step-by-step guide to all canvas behaviors, tools, mouse/touch event maps, edge cases, and keyboard shortcuts.
- 💻 **[Source Code Repository Index](file:///c:/Users/Hp/Desktop/visualization/VISUALIZER_CODE.md)** (`VISUALIZER_CODE.md`): Modular code inventory of core algorithms and backbone files.

---

## ⌨️ Studio Tools & Keyboard Shortcuts

### Interactive Canvas Tools

| Tool Icon | Tool Name | Key Shortcut | Functionality |
|---|---|---|---|
| 📐 | **Corners Handle** | `C` | Drag 4 corners to fit room floor perspective |
| 🪵 | **Floor Texture** | `F` | Toggle floor blend compositing (multiply mode) |
| 🖌️ | **Smart Mask Brush** | `B` | Paint or erase furniture occlusion masks |
| 📦 | **Box Cutout** | `X` | Drag rectangular cutout over table surfaces |
| 🧼 | **Mask Eraser** | `E` | Restore erased rug mask regions |
| 🪄 | **Magic Wand** | `W` | Color flood-fill mask auto-selection |

### Hotkeys & Mouse Controls

| Action | Shortcut |
|---|---|
| **Undo Mask Action** | `Ctrl` + `Z` / `Cmd` + `Z` |
| **Redo Mask Action** | `Ctrl` + `Y` / `Cmd` + `Y` / `Shift` + `Ctrl` + `Z` |
| **Zoom In / Out** | Mouse Wheel / `+` / `-` or `Z` + Click |
| **Reset Zoom & Pan** | `0` (Zero) or Double Click Canvas |
| **Pan Canvas** | Hold `Spacebar` + Drag Mouse |
| **Invert Smart Brush (Erase)** | Hold `Alt` / `Option` while painting |
| **Square Aspect Ratio Drag** | Hold `Shift` while dragging corners |
| **Toggle Before/After** | `Hold Space` or Toggle Slider |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **Package Manager**: `npm`, `yarn`, `pnpm`, or `bun`

### Installation & Setup

1. **Clone repository & install dependencies**:
   ```bash
   git clone https://github.com/manishsuthar01/product-visualizer.git
   cd product-visualizer
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Type Checking & Linting**:
   ```bash
   npx tsc --noEmit
   npm run lint
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

---

## 📄 License

Private & Proprietary — House of Décor Studio. All rights reserved.
