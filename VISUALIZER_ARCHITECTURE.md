# VISUALIZER_ARCHITECTURE.md

> **Purpose**: This document describes the complete architecture, directory structure, dependencies, data models, state management, routing, asset pipeline, and component hierarchy of the Product Floor Visualizer feature. An AI agent should be able to read this file and understand *exactly* how every piece fits together to reproduce it inside another Next.js project.

---

## 1. Technology Stack & Dependencies

### Runtime Dependencies (package.json → dependencies)

| Package | Version | Purpose |
|---|---|---|
| `next` | `16.3.0` | React framework — App Router, file-based routing, server components |
| `react` | `19.2.8` | UI library |
| `react-dom` | `19.2.8` | DOM renderer |
| `use-image` | `^1.1.4` | React hook `useImage(url, crossOrigin)` → returns `[HTMLImageElement, status]`. Used to asynchronously load room and rug images for canvas drawing |
| `zustand` | `^5.0.14` | Lightweight state management — single global store (`useVisualizerStore`) drives all visualizer state |
| `lucide-react` | `^1.31.0` | Icon library — used across all UI components |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | `^4` | CSS utility framework |
| `@tailwindcss/postcss` | `^4` | PostCSS plugin for Tailwind v4 |
| `typescript` | `^5` | Type checking |
| `eslint` | `^9` | Linting |
| `eslint-config-next` | `16.3.0` | Next.js ESLint rules |

### Key Observations
- The entire visualization rendering pipeline uses native **HTML5 Canvas 2D Context API** (`CanvasRenderingContext2D`). Legacy unused dependencies (`konva`, `react-konva`) were purged from `package.json` to optimize bundle size and dependency hygiene.
- The `use-image` hook returns a standard `HTMLImageElement`, which is passed to `ctx.drawImage()` and the custom bilinear quad warp engine (`drawPerspectiveQuad()`).

---

## 2. Directory Structure (Complete File Tree)

```
visualization/
├── public/
│   ├── products/                          # Rug product images
│   │   ├── coastal-jute-rug.webp          # ~1MB each, WebP format
│   │   ├── ivory-heritage-rug.webp
│   │   ├── modern-geometric-rug.webp
│   │   └── sandstone-rug.webp
│   ├── rooms/                             # Room environment images
│   │   ├── bedroom-01.webp               # Full-size room photos
│   │   ├── bedroom-01-thumb.webp         # Thumbnail (same image, used in sidebar)
│   │   ├── living-room-01.webp
│   │   ├── living-room-01-thumb.webp
│   │   ├── luxury-room-01.webp
│   │   ├── luxury-room-01-thumb.webp
│   │   ├── modern-room-01.webp
│   │   └── modern-room-01-thumb.webp
│   ├── file.svg, globe.svg, next.svg, vercel.svg, window.svg  # Default Next.js assets (unused)
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── globals.css                    # CSS variables, @theme, scrollbar, base styles
│   │   ├── layout.tsx                     # Root layout (Geist fonts, html/body structure)
│   │   ├── page.tsx                       # Home page — product catalog + hero
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Product detail page (server component)
│   │   └── visualizer/
│   │       └── page.tsx                  # Visualizer studio entry (server component, resolves searchParams)
│   ├── components/
│   │   ├── products/
│   │   │   └── ProductCard.tsx           # Product card for catalog grid
│   │   └── visualizer/
│   │       ├── RoomVisualizer.tsx         # Wrapper: header + dynamic import of canvas
│   │       ├── VisualizationCanvas.tsx    # ★ CORE: 1403-line canvas component (ALL rendering logic)
│   │       ├── VisualizerToolbar.tsx      # Sidebar controls panel (646 lines)
│   │       └── RoomSelector.tsx          # Room selection + custom upload UI
│   ├── data/
│   │   ├── products.ts                   # Product catalog data + types
│   │   └── rooms.ts                      # Room presets data + normalized quad types
│   ├── hooks/
│   │   ├── useVisualizer.ts              # Zustand store (state + reducer dispatch)
│   │   └── useCanvasZoom.ts             # Zoom/pan hook with screen-to-canvas coordinate math
│   ├── lib/
│   │   └── visualization/
│   │       ├── quadWarp.ts               # ★ CORE: Perspective quad warp (bilinear subdivision + affine triangles)
│   │       ├── edgeDetection.ts          # Sobel edge detection for brush edge-snap
│   │       └── perspective.ts            # Skew approximation utilities (not actively used by canvas)
│   └── types/
│       └── visualization.ts              # TypeScript types: Point2D, QuadCorners, VisualizerState, VisualizerAction
├── next.config.ts                        # Empty config (no custom settings)
├── tsconfig.json                         # TS config with "@/*" path alias → "./src/*"
├── postcss.config.mjs                    # PostCSS with @tailwindcss/postcss plugin
├── eslint.config.mjs                     # ESLint with next core-web-vitals + typescript
└── package.json
```

---

## 3. Routing Architecture

The app uses **Next.js App Router** with the following routes:

| Route | File | Type | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Server Component | Home page with hero section + product catalog grid |
| `/products/[id]` | `src/app/products/[id]/page.tsx` | Server Component | Product detail page with image, sizes, description |
| `/visualizer` | `src/app/visualizer/page.tsx` | Server Component | Visualizer studio — resolves `searchParams` then renders `RoomVisualizer` |

### URL Parameters for `/visualizer`

| Param | Example | Purpose |
|---|---|---|
| `productId` | `rug-001` | Which rug to visualize |
| `size` | `5x8` | Initial size in `WxH` feet format, parsed as `{ width: 5, height: 8 }` |

### Navigation Flow
```
Home (/) → ProductCard → /visualizer?productId=rug-001&size=5x8
Home (/) → ProductCard → /products/rug-001 → "Launch Studio Mode" → /visualizer?productId=rug-001&size=5x8
Home (/) → Header CTA → /visualizer (loads with defaults)
```

---

## 4. Component Hierarchy

```
RootLayout (layout.tsx)
  ├── Home (page.tsx)  ← Server Component
  │     ├── Header (inline)
  │     ├── Hero Section (inline)
  │     ├── Feature Grid (inline)
  │     ├── ProductCard[] (client? no — just JSX + Link)
  │     └── Footer (inline)
  │
  ├── ProductPage (products/[id]/page.tsx)  ← Server Component
  │     ├── Header + back nav
  │     ├── Product image + details
  │     └── Size buttons → Link to /visualizer
  │
  └── VisualizerPage (visualizer/page.tsx)  ← Server Component
        └── RoomVisualizer ('use client')
              ├── Header Bar (inline — breadcrumb, brand, status badge)
              └── VisualizationCanvas ('use client', dynamically imported, ssr: false)
                    ├── Sidebar (<aside>)
                    │     ├── RoomSelector ('use client')
                    │     │     ├── File upload zone (drag & drop)
                    │     │     └── Preset room grid (Image thumbnails)
                    │     └── VisualizerToolbar ('use client')
                    │           ├── Tool selector grid (6 tools)
                    │           ├── Contextual tool options panels
                    │           ├── Product + size selectors
                    │           ├── Perspective presets (4 buttons)
                    │           ├── Lighting sliders (opacity, shadow)
                    │           └── Action buttons (compare, export)
                    ├── Canvas Area
                    │     ├── Floating Top Bar (tool icons + undo/redo + zoom)
                    │     ├── <canvas> element (full rendering)
                    │     ├── Floating Status Indicator (bottom-right)
                    │     └── Keyboard Shortcuts Modal
                    └── Before/After Badge (conditional)
```

---

## 5. State Management (Zustand Store)

### Store: `useVisualizerStore` (file: `src/hooks/useVisualizer.ts`)

Uses Zustand `create()` with a reducer-style `dispatch(action)` pattern.

### State Shape: `VisualizerState`

```typescript
{
  // Product Selection
  selectedProductId: string | null;
  selectedSize: { width: number; height: number } | null;

  // Room Image
  roomImage: string | null;           // URL or data URI of current room
  roomImageFile: File | null;         // Original File object if user uploaded
  isCustomRoom: boolean;              // true if user uploaded their own photo

  // Perspective Quad
  quadCorners: QuadCorners | null;    // 4 corner points in canvas pixel coordinates

  // Transform (legacy — not actively used, kept for RESET_TRANSFORM)
  transform: { x: number; y: number; scale: number; rotation: number };

  // Rendering Controls
  opacity: number;                    // Rug opacity (0.3–1.0)
  brightness: number;                 // Not actively used in render
  shadowOpacity: number;              // Contact shadow strength (0–1.0)
  showOriginal: boolean;              // Before/after toggle

  // Active Tool
  activeTool: 'corners' | 'floorTexture' | 'brush' | 'box' | 'eraser' | 'wand';

  // Brush Settings
  brushSize: number;                  // Diameter in pixels (10–90)
  brushHardness: number;              // Feathering (0–100, 100 = hard edge)
  edgeSnap: boolean;                  // Sobel edge-aware brush painting
  showMaskPreview: boolean;           // Overlay mask in indigo tint
  preserveMask: boolean;              // Don't clear mask when switching rooms

  // Floor Texture
  floorTextureStrength: number;       // Multiply blend intensity (0–0.7)

  // Magic Wand
  wandTolerance: number;              // Color tolerance (5–80)
  wandContiguous: boolean;            // true = flood-fill, false = global match

  // UI
  showShortcutModal: boolean;
}
```

### Initial State Defaults

```typescript
{
  selectedProductId: null,
  selectedSize: null,
  roomImage: null,
  roomImageFile: null,
  isCustomRoom: false,
  quadCorners: null,
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  opacity: 1,
  brightness: 0,
  shadowOpacity: 0.6,
  showOriginal: false,
  activeTool: 'corners',
  brushSize: 35,
  brushHardness: 85,
  edgeSnap: false,
  showMaskPreview: false,
  preserveMask: false,
  floorTextureStrength: 0.35,
  wandTolerance: 32,
  wandContiguous: true,
  showShortcutModal: false,
}
```

### Actions (Discriminated Union)

| Action Type | Payload | Effect |
|---|---|---|
| `SET_PRODUCT` | `{ productId, size }` | Sets selected product and size |
| `SET_ROOM_IMAGE` | `{ image, file }` | Sets room image, resets quad corners |
| `SET_ROOM_SAMPLE` | `{ image }` | Sets preset room, clears file, resets quad |
| `UPLOAD_CUSTOM_ROOM` | `{ image, file }` | Sets custom room upload, resets quad |
| `SET_QUAD_CORNERS` | `{ corners }` | Sets all 4 corner positions |
| `UPDATE_QUAD_CORNER` | `{ corner, x, y }` | Updates single corner position |
| `UPDATE_TRANSFORM` | `{ x?, y?, scale?, rotation? }` | Merges partial transform update |
| `SET_OPACITY` | `{ opacity }` | Sets rug opacity |
| `SET_BRIGHTNESS` | `{ brightness }` | Sets brightness value |
| `SET_SHADOW_OPACITY` | `{ shadowOpacity }` | Sets contact shadow strength |
| `SET_ACTIVE_TOOL` | `{ tool }` | Switches active tool |
| `SET_BRUSH_SIZE` | `{ size }` | Sets brush diameter |
| `SET_BRUSH_HARDNESS` | `{ hardness }` | Sets brush edge hardness |
| `SET_EDGE_SNAP` | `{ enabled }` | Toggles Sobel edge snapping |
| `SET_SHOW_MASK_PREVIEW` | `{ enabled }` | Toggles mask preview overlay |
| `SET_PRESERVE_MASK` | `{ enabled }` | Toggles mask preservation on room switch |
| `SET_FLOOR_TEXTURE_STRENGTH` | `{ strength }` | Sets floor texture blend amount |
| `SET_WAND_TOLERANCE` | `{ tolerance }` | Sets magic wand color tolerance |
| `SET_WAND_CONTIGUOUS` | `{ contiguous }` | Toggles contiguous/global wand mode |
| `SET_SHOW_SHORTCUT_MODAL` | `{ open }` | Shows/hides keyboard shortcuts modal |
| `RESET_TRANSFORM` | _(none)_ | Resets quad, transform, opacity, shadow, texture to defaults |
| `TOGGLE_BEFORE_AFTER` | _(none)_ | Toggles `showOriginal` boolean |
| `SET_SIZE` | `{ width, height }` | Changes selected size |
| `CLEAR_VISUALIZER` | _(none)_ | Resets entire state to initial values |

---

## 6. Data Models

### Product (file: `src/data/products.ts`)

```typescript
type ProductSize = {
  label: string;      // "5 × 8 ft"
  width: number;      // in feet
  height: number;     // in feet
};

type Product = {
  id: string;                          // "rug-001"
  name: string;                        // "Ivory Heritage Rug"
  image: string | StaticImageData;     // "/products/ivory-heritage-rug.webp"
  price: number;                       // 399.99
  description: string;
  sizes: ProductSize[];
};
```

**4 products** are defined: `rug-001` through `rug-004`.

### Room (file: `src/data/rooms.ts`)

```typescript
type NormalizedQuad = {
  topLeft: { u: number; v: number };     // Normalized 0–1 coordinates
  topRight: { u: number; v: number };
  bottomRight: { u: number; v: number };
  bottomLeft: { u: number; v: number };
};

type Room = {
  id: string;                            // "living-room-01"
  name: string;                          // "Modern Living Room"
  image: string | StaticImageData;       // "/rooms/living-room-01.webp"
  thumbnail: string | StaticImageData;   // "/rooms/living-room-01-thumb.webp"
  defaultQuad: NormalizedQuad;           // Pre-calibrated floor region
};
```

**4 rooms** are defined: `living-room-01`, `luxury-room-01`, `bedroom-01`, `modern-room-01`.

Each room's `defaultQuad` stores normalized (0–1) UV coordinates. These are multiplied by the canvas width/height at runtime to get pixel positions, e.g.:
```
topLeft.x = q.topLeft.u * canvasWidth
topLeft.y = q.topLeft.v * canvasHeight
```

---

## 7. Asset Pipeline

### Product Images
- Located: `/public/products/*.webp`
- Loaded via: `useImage(url, 'anonymous')` in `VisualizationCanvas`
- Used in: Canvas `drawPerspectiveQuad()` for perspective-warped rendering
- Also used in: `ProductCard` and product detail page via Next.js `<Image>` component

### Room Images
- Located: `/public/rooms/*.webp`
- Full-size images and thumbnails are separate files but currently identical in content (same dimensions)
- Full-size: loaded via `useImage()` for canvas rendering
- Thumbnails: loaded via Next.js `<Image>` in `RoomSelector` grid

### Custom Room Upload
- User uploads via file input or drag-and-drop in `RoomSelector`
- File is read as Data URL via `FileReader.readAsDataURL()`
- Stored in Zustand store as `roomImage` (base64 data URI)
- Loaded into canvas via `useImage(dataUrl, 'anonymous')`

---

## 8. CSS Design System

### File: `src/app/globals.css`

The design system uses CSS custom properties (variables) defined in `:root`:

```css
:root {
  --bg-primary: #F5F2EC;           /* Warm linen background */
  --bg-secondary: #EAE3D8;         /* Slightly darker panels */
  --bg-tertiary: #DFD6C9;          /* Canvas area background */
  --text-primary: #2B2B2B;         /* Main text (near-black) */
  --text-secondary: #595959;       /* Subdued text */
  --text-muted: #8C857E;           /* Very subtle text */
  --border-primary: #2B2B2B;       /* Strong borders */
  --border-secondary: #D4CFC6;     /* Light borders */
  --accent-gold: #B89970;          /* Primary accent (gold/amber) */
  --accent-gold-hover: #B08A57;    /* Hover state for gold */
  --brand-earth: #3A312B;          /* Dark earth brand color */
  --accent-terracotta: #C27D65;    /* Secondary accent */
}
```

These are mapped to Tailwind v4 `@theme` tokens:
```css
@theme {
  --color-linen-primary: var(--bg-primary);
  --color-gold: var(--accent-gold);
  /* ... etc */
}
```

### Font System
- **Primary**: `Geist` (Google Fonts) — `--font-geist-sans`
- **Monospace**: `Geist_Mono` — `--font-geist-mono`
- Applied via class names on `<html>` element

### Design Language
- Warm, earthy tones (linen, gold, earth, terracotta)
- Glassmorphism: `backdrop-blur-md` + `bg-opacity` patterns
- Consistent border radius: `rounded-md`, `rounded-lg`, `rounded-xl`
- Professional UI density with `text-xs` / `text-[11px]` typography
- Custom scrollbar styling for WebKit browsers

---

## 9. Dynamic Import Strategy

The `VisualizationCanvas` component is loaded via **Next.js dynamic import** to prevent SSR issues (it uses browser APIs like `document.createElement('canvas')`, `window.addEventListener`, etc.):

```typescript
// In RoomVisualizer.tsx
const VisualizationCanvas = dynamic(
  () => import('./VisualizationCanvas'),
  { ssr: false, loading: () => <CanvasSkeleton /> }
);
```

A spinner skeleton is shown while the canvas component loads.

---

## 10. Canvas Rendering Pipeline (Layer Stack)

The canvas renders in this exact order (bottom to top):

| Layer | Description | Condition |
|---|---|---|
| **1 — Room Background** | Full room image drawn to fill canvas | Always when `roomImageKonva` loaded |
| **2 — Contact Shadow** | Blurred black shape beneath the rug quad | `!showOriginal`, `shadowOpacity > 0` |
| **3 — Perspective Rug** | Rug image warped into 4-corner quadrilateral | `!showOriginal`, quad corners set |
| **4 — Floor Texture Blend** | Room image × rug multiply-composited, clipped to rug shape | `floorTextureStrength > 0` |
| **5 — Foreground Mask** | Painted mask (furniture over rug) | Mask canvas has content |
| **5b — Mask Preview** | Indigo-tinted mask overlay for visibility | `showMaskPreview` enabled |
| **6 — UI Overlays** | Corner handles, perspective grid, brush cursor, box preview, wand cursor | Tool-dependent |

### Zoom & Pan

All rendering happens inside a transform matrix:
```typescript
ctx.translate(cx + pan.x, cy + pan.y);
ctx.scale(zoom, zoom);
ctx.translate(-cx, -cy);
```

Mouse coordinates are inverse-transformed via `screenToCanvas()` before use.

---

## 11. Integration Requirements for Target Next.js Project

To reproduce this feature in another Next.js project, you need:

### NPM Packages to Install
```bash
npm install zustand use-image lucide-react
```

### Files to Copy (Minimum Viable Set)
1. **Types**: `src/types/visualization.ts`
2. **Data**: `src/data/products.ts`, `src/data/rooms.ts`
3. **State**: `src/hooks/useVisualizer.ts`, `src/hooks/useCanvasZoom.ts`
4. **Algorithms**: `src/lib/visualization/quadWarp.ts`, `src/lib/visualization/edgeDetection.ts`, `src/lib/visualization/perspective.ts`
5. **Components**: All files in `src/components/visualizer/` (4 files)
6. **Route**: `src/app/visualizer/page.tsx`
7. **Assets**: `public/products/`, `public/rooms/`
8. **CSS Variables**: The `:root` variables from `globals.css`

### Path Alias
The project uses `@/*` mapped to `./src/*` in `tsconfig.json`. Your target project must have the same alias or you must update all imports.

### Tailwind v4
The project uses Tailwind CSS v4 with `@tailwindcss/postcss`. If your target uses a different Tailwind version, the `@theme` block and `@import "tailwindcss"` syntax may need adjustment.
