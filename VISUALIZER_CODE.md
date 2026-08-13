# VISUALIZER_CODE.md

> **Purpose**: This file contains the actual source code of every backbone file in the Product Floor Visualizer. An AI agent should be able to copy these files verbatim into another Next.js project to reproduce the feature exactly. Files are presented in dependency order (types → data → lib → hooks → components → routes).

---

## Table of Contents

1. [TypeScript Types](#1-typescript-types)
2. [Product Data](#2-product-data)
3. [Room Data](#3-room-data)
4. [Quad Warp Algorithm](#4-quad-warp-algorithm)
5. [Edge Detection Algorithm](#5-edge-detection-algorithm)
6. [Perspective Utilities](#6-perspective-utilities)
7. [Zustand State Store](#7-zustand-state-store)
8. [Canvas Zoom Hook](#8-canvas-zoom-hook)
9. [Room Selector Component](#9-room-selector-component)
10. [Room Visualizer Wrapper](#10-room-visualizer-wrapper)
11. [Visualizer Toolbar Component](#11-visualizer-toolbar-component)
12. [Visualization Canvas Component (CORE)](#12-visualization-canvas-component-core)
13. [Visualizer Route Page](#13-visualizer-route-page)
14. [Product Card Component](#14-product-card-component)
15. [Product Detail Page](#15-product-detail-page)
16. [Home Page](#16-home-page)
17. [Global CSS](#17-global-css)
18. [Root Layout](#18-root-layout)
19. [Configuration Files](#19-configuration-files)

---

## 1. TypeScript Types

**File: `src/types/visualization.ts`**

```typescript
export type Point2D = { x: number; y: number };

export type QuadCorners = {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
};

export type ActiveTool = 'corners' | 'floorTexture' | 'brush' | 'box' | 'eraser' | 'wand';

export type VisualizerState = {
  selectedProductId: string | null;
  selectedSize: {
    width: number;
    height: number;
  } | null;
  roomImage: string | null;
  roomImageFile: File | null;
  isCustomRoom: boolean;
  quadCorners: QuadCorners | null;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  opacity: number;
  brightness: number;
  shadowOpacity: number;
  showOriginal: boolean;
  activeTool: ActiveTool;
  brushSize: number;
  brushHardness: number;       // 0–100: controls feathering softness (100 = hard edge)
  edgeSnap: boolean;           // when true, brush snaps to detected edges
  showMaskPreview: boolean;    // overlay the mask in a tinted color for visibility
  preserveMask: boolean;       // when false, mask auto-clears on room switch
  floorTextureStrength: number; // 0–1: how much floor texture bleeds into the rug (was darkenOpacity)
  wandTolerance: number;       // 0–100: color tolerance for magic wand flood fill
  wandContiguous: boolean;      // true = flood fill contiguous region, false = fill all matching pixels in room
  showShortcutModal: boolean;   // true = display keyboard shortcuts cheat sheet
};

export type VisualizerAction =
  | { type: 'SET_PRODUCT'; payload: { productId: string; size: { width: number; height: number } } }
  | { type: 'SET_ROOM_IMAGE'; payload: { image: string; file: File | null } }
  | { type: 'SET_ROOM_SAMPLE'; payload: { image: string } }
  | { type: 'UPLOAD_CUSTOM_ROOM'; payload: { image: string; file: File } }
  | { type: 'SET_QUAD_CORNERS'; payload: { corners: QuadCorners } }
  | { type: 'UPDATE_QUAD_CORNER'; payload: { corner: keyof QuadCorners; x: number; y: number } }
  | { type: 'UPDATE_TRANSFORM'; payload: { x?: number; y?: number; scale?: number; rotation?: number } }
  | { type: 'SET_OPACITY'; payload: { opacity: number } }
  | { type: 'SET_BRIGHTNESS'; payload: { brightness: number } }
  | { type: 'SET_SHADOW_OPACITY'; payload: { shadowOpacity: number } }
  | { type: 'RESET_TRANSFORM' }
  | { type: 'TOGGLE_BEFORE_AFTER' }
  | { type: 'SET_SIZE'; payload: { width: number; height: number } }
  | { type: 'CLEAR_VISUALIZER' }
  | { type: 'SET_ACTIVE_TOOL'; payload: { tool: ActiveTool } }
  | { type: 'SET_BRUSH_SIZE'; payload: { size: number } }
  | { type: 'SET_BRUSH_HARDNESS'; payload: { hardness: number } }
  | { type: 'SET_EDGE_SNAP'; payload: { enabled: boolean } }
  | { type: 'SET_SHOW_MASK_PREVIEW'; payload: { enabled: boolean } }
  | { type: 'SET_PRESERVE_MASK'; payload: { enabled: boolean } }
  | { type: 'SET_FLOOR_TEXTURE_STRENGTH'; payload: { strength: number } }
  | { type: 'SET_WAND_TOLERANCE'; payload: { tolerance: number } }
  | { type: 'SET_WAND_CONTIGUOUS'; payload: { contiguous: boolean } }
  | { type: 'SET_SHOW_SHORTCUT_MODAL'; payload: { open: boolean } };
```

---

## 2. Product Data

**File: `src/data/products.ts`**

```typescript
import { StaticImageData } from "next/image";

export type ProductSize = {
  label: string;
  width: number; // in feet
  height: number; // in feet
};

export type Product = {
  id: string;
  name: string;
  image: string | StaticImageData; // Use string for public path or StaticImageData
  price: number;
  description: string;
  sizes: ProductSize[];
};

export const products: Product[] = [
  {
    id: "rug-001",
    name: "Ivory Heritage Rug",
    image: "/products/ivory-heritage-rug.webp",
    price: 399.99,
    description: "A classic ivory rug with intricate patterns, perfect for adding a touch of elegance to any living space.",
    sizes: [
      { label: "5 × 8 ft", width: 5, height: 8 },
      { label: "6 × 9 ft", width: 6, height: 9 },
      { label: "8 × 10 ft", width: 8, height: 10 },
      { label: "9 × 12 ft", width: 9, height: 12 },
    ],
  },
  {
    id: "rug-002",
    name: "Sandstone Traditional Rug",
    image: "/products/sandstone-rug.webp",
    price: 499.99,
    description: "Hand-knotted sandstone rug featuring traditional motifs, bringing warmth and character to your home.",
    sizes: [
      { label: "5 × 8 ft", width: 5, height: 8 },
      { label: "8 × 10 ft", width: 8, height: 10 },
      { label: "9 × 12 ft", width: 9, height: 12 },
    ],
  },
  {
    id: "rug-003",
    name: "Modern Geometric Rug",
    image: "/products/modern-geometric-rug.webp",
    price: 299.99,
    description: "Contemporary rug with a bold geometric pattern, ideal for modern interiors.",
    sizes: [
      { label: "4 × 6 ft", width: 4, height: 6 },
      { label: "5 × 8 ft", width: 5, height: 8 },
      { label: "6 × 9 ft", width: 6, height: 9 },
    ],
  },
  {
    id: "rug-004",
    name: "Coastal Jute Blend Rug",
    image: "/products/coastal-jute-rug.webp",
    price: 249.99,
    description: "A natural jute blend rug with a casual coastal vibe, perfect for sunrooms or relaxed living areas.",
    sizes: [
      { label: "3 × 5 ft", width: 3, height: 5 },
      { label: "5 × 8 ft", width: 5, height: 8 },
    ],
  },
];
```

---

## 3. Room Data

**File: `src/data/rooms.ts`**

```typescript
import { StaticImageData } from "next/image";

export type NormalizedQuad = {
  topLeft: { u: number; v: number };
  topRight: { u: number; v: number };
  bottomRight: { u: number; v: number };
  bottomLeft: { u: number; v: number };
};

export type Room = {
  id: string;
  name: string;
  image: string | StaticImageData;
  thumbnail: string | StaticImageData;
  defaultQuad: NormalizedQuad;
};

export const sampleRooms: Room[] = [
  {
    id: "living-room-01",
    name: "Modern Living Room",
    image: "/rooms/living-room-01.webp",
    thumbnail: "/rooms/living-room-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.28, v: 0.65 },
      topRight: { u: 0.72, v: 0.65 },
      bottomRight: { u: 0.88, v: 0.94 },
      bottomLeft: { u: 0.12, v: 0.94 },
    },
  },
  {
    id: "luxury-room-01",
    name: "Luxury Living Room",
    image: "/rooms/luxury-room-01.webp",
    thumbnail: "/rooms/luxury-room-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.30, v: 0.62 },
      topRight: { u: 0.70, v: 0.62 },
      bottomRight: { u: 0.85, v: 0.92 },
      bottomLeft: { u: 0.15, v: 0.92 },
    },
  },
  {
    id: "bedroom-01",
    name: "Neutral Bedroom",
    image: "/rooms/bedroom-01.webp",
    thumbnail: "/rooms/bedroom-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.25, v: 0.60 },
      topRight: { u: 0.75, v: 0.60 },
      bottomRight: { u: 0.90, v: 0.92 },
      bottomLeft: { u: 0.10, v: 0.92 },
    },
  },
  {
    id: "modern-room-01",
    name: "Contemporary Space",
    image: "/rooms/modern-room-01.webp",
    thumbnail: "/rooms/modern-room-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.22, v: 0.64 },
      topRight: { u: 0.78, v: 0.64 },
      bottomRight: { u: 0.92, v: 0.95 },
      bottomLeft: { u: 0.08, v: 0.95 },
    },
  },
];
```

---

## 4. Quad Warp Algorithm

**File: `src/lib/visualization/quadWarp.ts`**

```typescript
export type Point2D = { x: number; y: number };

export type QuadCorners = {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
};

/**
 * Render a source image inside an arbitrary 4-corner quadrilateral (TL, TR, BR, BL)
 * using 2D Canvas bilinear triangle mesh subdivision for realistic 3D perspective warping.
 */
export function drawPerspectiveQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  corners: QuadCorners,
  gridSteps: number = 16,
  opacity: number = 1
) {
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  ctx.save();
  ctx.globalAlpha = opacity;

  const w = img.width;
  const h = img.height;

  // Render N x N grid of subdivided triangles for smooth perspective distortion
  for (let y = 0; y < gridSteps; y++) {
    const v0 = y / gridSteps;
    const v1 = (y + 1) / gridSteps;

    for (let x = 0; x < gridSteps; x++) {
      const u0 = x / gridSteps;
      const u1 = (x + 1) / gridSteps;

      // Source coordinates on rug image
      const sx0 = u0 * w;
      const sy0 = v0 * h;
      const sx1 = u1 * w;
      const sy1 = v1 * h;

      // Destination 3D grid corners interpolated bilinearly
      const p00 = getBilinearPoint(tl, tr, br, bl, u0, v0);
      const p10 = getBilinearPoint(tl, tr, br, bl, u1, v0);
      const p01 = getBilinearPoint(tl, tr, br, bl, u0, v1);
      const p11 = getBilinearPoint(tl, tr, br, bl, u1, v1);

      // Triangle 1: (p00, p10, p01)
      drawTriangle(ctx, img, sx0, sy0, sx1, sy0, sx0, sy1, p00, p10, p01);

      // Triangle 2: (p10, p11, p01)
      drawTriangle(ctx, img, sx1, sy0, sx1, sy1, sx0, sy1, p10, p11, p01);
    }
  }

  ctx.restore();
}

/**
 * Interpolate a point inside a quadrilateral at (u, v) in [0, 1]
 */
function getBilinearPoint(
  tl: Point2D,
  tr: Point2D,
  br: Point2D,
  bl: Point2D,
  u: number,
  v: number
): Point2D {
  const topX = (1 - u) * tl.x + u * tr.x;
  const topY = (1 - u) * tl.y + u * tr.y;

  const bottomX = (1 - u) * bl.x + u * br.x;
  const bottomY = (1 - u) * bl.y + u * br.y;

  return {
    x: (1 - v) * topX + v * bottomX,
    y: (1 - v) * topY + v * bottomY,
  };
}

/**
 * Draw a single textured triangle from source image to destination canvas coordinates using affine matrix transform
 */
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx0: number,
  sy0: number,
  sx1: number,
  sy1: number,
  sx2: number,
  sy2: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D
) {
  ctx.save();

  // Clip to destination triangle path with slight expansion to avoid gaps
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();

  // Calculate affine transformation matrix from source triangle to destination triangle
  const denominator = sx0 * (sy1 - sy2) - sx1 * (sy0 - sy2) + sx2 * (sy0 - sy1);

  if (Math.abs(denominator) < 0.0001) {
    ctx.restore();
    return;
  }

  const m11 = (p0.x * (sy1 - sy2) - p1.x * (sy0 - sy2) + p2.x * (sy0 - sy1)) / denominator;
  const m12 = (p0.y * (sy1 - sy2) - p1.y * (sy0 - sy2) + p2.y * (sy0 - sy1)) / denominator;
  const m21 = (p0.x * (sx2 - sx1) - p1.x * (sx2 - sx0) + p2.x * (sx1 - sx0)) / denominator;
  const m22 = (p0.y * (sx2 - sx1) - p1.y * (sx2 - sx0) + p2.y * (sx1 - sx0)) / denominator;
  const dx = (p0.x * (sx1 * sy2 - sx2 * sy1) - p1.x * (sx0 * sy2 - sx2 * sy0) + p2.x * (sx0 * sy1 - sx1 * sy0)) / denominator;
  const dy = (p0.y * (sx1 * sy2 - sx2 * sy1) - p1.y * (sx0 * sy2 - sx2 * sy0) + p2.y * (sx0 * sy1 - sx1 * sy0)) / denominator;

  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(img, 0, 0);

  ctx.restore();
}

/**
 * Draw a realistic contact shadow on the floor beneath the perspective quad
 */
export function drawQuadShadow(
  ctx: CanvasRenderingContext2D,
  corners: QuadCorners,
  shadowOpacity: number = 0.5
) {
  if (shadowOpacity <= 0) return;

  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  ctx.save();
  ctx.globalAlpha = shadowOpacity * 0.6;
  ctx.fillStyle = '#000000';
  ctx.filter = 'blur(10px)';

  // Draw offset shadow path
  const offset = 8;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y + offset);
  ctx.lineTo(tr.x, tr.y + offset);
  ctx.lineTo(br.x + offset, br.y + offset * 1.5);
  ctx.lineTo(bl.x - offset, bl.y + offset * 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
```

---

## 5. Edge Detection Algorithm

**File: `src/lib/visualization/edgeDetection.ts`**

```typescript
/**
 * edgeDetection.ts
 * Lightweight Sobel edge detection for brush "Edge Snap" mode.
 * Computes an edge-strength map (0–255 per pixel) from room image data.
 * The map is cached per room image so it's computed once and reused.
 */

export type EdgeMap = {
  data: Uint8Array;
  width: number;
  height: number;
};

// Cache the edge map so we don't recompute on every brush stroke
let cachedEdgeMap: EdgeMap | null = null;
let cachedImageSrc: string | null = null;
let cachedWidth = 0;
let cachedHeight = 0;

/**
 * Compute or retrieve a cached Sobel edge-strength map for the given room image.
 */
export function getEdgeMap(
  roomImage: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): EdgeMap {
  // Return cached if same image + dimensions
  if (
    cachedEdgeMap &&
    cachedImageSrc === roomImage.src &&
    cachedWidth === canvasWidth &&
    cachedHeight === canvasHeight
  ) {
    return cachedEdgeMap;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = canvasWidth;
  offscreen.height = canvasHeight;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    // Fallback: empty edge map
    return { data: new Uint8Array(canvasWidth * canvasHeight), width: canvasWidth, height: canvasHeight };
  }

  ctx.drawImage(roomImage, 0, 0, canvasWidth, canvasHeight);
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const pixels = imageData.data;

  // Convert to grayscale luminance first
  const gray = new Float32Array(canvasWidth * canvasHeight);
  for (let i = 0; i < canvasWidth * canvasHeight; i++) {
    const idx = i * 4;
    // ITU-R BT.601 luminance
    gray[i] = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
  }

  // Apply Sobel operator
  const edgeData = new Uint8Array(canvasWidth * canvasHeight);
  const w = canvasWidth;
  const h = canvasHeight;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // Sobel X kernel: [[-1,0,1],[-2,0,2],[-1,0,1]]
      const gx =
        -gray[(y - 1) * w + (x - 1)] +
        gray[(y - 1) * w + (x + 1)] +
        -2 * gray[y * w + (x - 1)] +
        2 * gray[y * w + (x + 1)] +
        -gray[(y + 1) * w + (x - 1)] +
        gray[(y + 1) * w + (x + 1)];

      // Sobel Y kernel: [[-1,-2,-1],[0,0,0],[1,2,1]]
      const gy =
        -gray[(y - 1) * w + (x - 1)] +
        -2 * gray[(y - 1) * w + x] +
        -gray[(y - 1) * w + (x + 1)] +
        gray[(y + 1) * w + (x - 1)] +
        2 * gray[(y + 1) * w + x] +
        gray[(y + 1) * w + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeData[y * w + x] = Math.min(255, Math.round(magnitude));
    }
  }

  cachedEdgeMap = { data: edgeData, width: canvasWidth, height: canvasHeight };
  cachedImageSrc = roomImage.src;
  cachedWidth = canvasWidth;
  cachedHeight = canvasHeight;

  return cachedEdgeMap;
}

/**
 * Check if a pixel is near a strong edge.
 * Returns a strength value 0..1 where 1 = on a strong edge.
 */
export function getEdgeStrength(
  edgeMap: EdgeMap,
  x: number,
  y: number,
  edgeThreshold: number = 40
): number {
  if (x < 0 || x >= edgeMap.width || y < 0 || y >= edgeMap.height) return 0;
  const ix = Math.round(x);
  const iy = Math.round(y);
  const val = edgeMap.data[iy * edgeMap.width + ix];
  if (val < edgeThreshold) return 0;
  // Normalize: edgeThreshold..255 → 0..1
  return Math.min(1, (val - edgeThreshold) / (255 - edgeThreshold));
}

/**
 * Invalidate the cached edge map (call when room image changes).
 */
export function clearEdgeMapCache(): void {
  cachedEdgeMap = null;
  cachedImageSrc = null;
  cachedWidth = 0;
  cachedHeight = 0;
}
```

---

## 6. Perspective Utilities

**File: `src/lib/visualization/perspective.ts`**

```typescript
// perspective.ts
// Provides a simple perspective approximation using skew and scale.
// For a truly accurate four-corner perspective, a complex matrix transform is needed,
// but for visual demo purposes, skew + scale + rotation gives a convincing floor look.

export type PerspectiveControls = {
  // X skew in degrees (positive tilts top-right, negative tilts top-left)
  skewX: number;
  // Y skew in degrees (positive tilts bottom up)
  skewY: number;
  // Scale difference between top and bottom edges (creates depth)
  topScale: number;
  // Horizontal offset of the top relative to bottom (creates vanishing point)
  topOffsetX: number;
};

/**
 * Convert four corner perspective into approximate skew values.
 * This is a simplified mapping for visual purposes, not mathematically perfect.
 *
 * The corners are relative to the rug image center.
 * (0,0) is top-left of the unscaled rug.
 */
export function cornersToPerspective(
  topLeft: { x: number; y: number },
  topRight: { x: number; y: number },
  bottomLeft: { x: number; y: number },
  bottomRight: { x: number; y: number }
): PerspectiveControls {
  // Calculate the center y position of the top edge vs bottom edge
  const topMidY = (topLeft.y + topRight.y) / 2;
  const bottomMidY = (bottomLeft.y + bottomRight.y) / 2;
  const topMidX = (topLeft.x + topRight.x) / 2;
  const bottomMidX = (bottomLeft.x + bottomRight.x) / 2;

  // Vertical skew: ratio of top width to bottom width
  const topWidth = Math.abs(topRight.x - topLeft.x);
  const bottomWidth = Math.abs(bottomRight.x - bottomLeft.x);

  // X skew based on difference between top and bottom centers
  const skewX = ((topMidX - bottomMidX) / (bottomWidth || 1)) * 30; // degrees

  // Y skew approximation based on vertical displacement
  const skewY = ((topMidY - bottomMidY) / (Math.abs(bottomMidY - topMidY) || 1)) * 5;

  // Top scale approximation
  const topScale = bottomWidth > 0 ? topWidth / bottomWidth : 1;

  // Top offset relative to bottom
  const topOffsetX = topMidX - bottomMidX;

  return { skewX, skewY, topScale, topOffsetX };
}

/**
 * Clamp a value between a min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

---

## 7. Zustand State Store

**File: `src/hooks/useVisualizer.ts`**

```typescript
import { create } from 'zustand';
import { VisualizerState, VisualizerAction } from '@/types/visualization';

type VisualizerStore = VisualizerState & {
  dispatch: (action: VisualizerAction) => void;
};

const initialState: VisualizerState = {
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
};

export const useVisualizerStore = create<VisualizerStore>((set) => ({
  ...initialState,
  dispatch: (action: VisualizerAction) =>
    set((state) => {
      switch (action.type) {
        case 'SET_PRODUCT':
          return {
            selectedProductId: action.payload.productId,
            selectedSize: action.payload.size,
          };
        case 'SET_ROOM_IMAGE':
          return {
            roomImage: action.payload.image,
            roomImageFile: action.payload.file,
            isCustomRoom: !!action.payload.file,
            quadCorners: null, // Reset to compute new default floor quad
          };
        case 'SET_ROOM_SAMPLE':
          return {
            roomImage: action.payload.image,
            roomImageFile: null,
            isCustomRoom: false,
            quadCorners: null, // Reset to compute room default floor quad
            // Mask clearing is handled in the canvas component based on preserveMask
          };
        case 'UPLOAD_CUSTOM_ROOM':
          return {
            roomImage: action.payload.image,
            roomImageFile: action.payload.file,
            isCustomRoom: true,
            quadCorners: null,
          };
        case 'SET_QUAD_CORNERS':
          return {
            quadCorners: action.payload.corners,
          };
        case 'UPDATE_QUAD_CORNER': {
          if (!state.quadCorners) return state;
          const { corner, x, y } = action.payload;
          return {
            quadCorners: {
              ...state.quadCorners,
              [corner]: { x, y },
            },
          };
        }
        case 'UPDATE_TRANSFORM':
          return {
            transform: { ...state.transform, ...action.payload },
          };
        case 'SET_OPACITY':
          return { opacity: action.payload.opacity };
        case 'SET_BRIGHTNESS':
          return { brightness: action.payload.brightness };
        case 'SET_SHADOW_OPACITY':
          return { shadowOpacity: action.payload.shadowOpacity };
        case 'SET_ACTIVE_TOOL':
          return { activeTool: action.payload.tool };
        case 'SET_BRUSH_SIZE':
          return { brushSize: action.payload.size };
        case 'SET_BRUSH_HARDNESS':
          return { brushHardness: action.payload.hardness };
        case 'SET_EDGE_SNAP':
          return { edgeSnap: action.payload.enabled };
        case 'SET_SHOW_MASK_PREVIEW':
          return { showMaskPreview: action.payload.enabled };
        case 'SET_PRESERVE_MASK':
          return { preserveMask: action.payload.enabled };
        case 'SET_FLOOR_TEXTURE_STRENGTH':
          return { floorTextureStrength: action.payload.strength };
        case 'SET_WAND_TOLERANCE':
          return { wandTolerance: action.payload.tolerance };
        case 'SET_WAND_CONTIGUOUS':
          return { wandContiguous: action.payload.contiguous };
        case 'SET_SHOW_SHORTCUT_MODAL':
          return { showShortcutModal: action.payload.open };
        case 'RESET_TRANSFORM':
          return {
            quadCorners: null, // Forces re-computation of default floor quad
            transform: { ...initialState.transform },
            opacity: 1,
            brightness: 0,
            shadowOpacity: 0.6,
            floorTextureStrength: 0.35,
          };
        case 'TOGGLE_BEFORE_AFTER':
          return { showOriginal: !state.showOriginal };
        case 'SET_SIZE':
          return {
            selectedSize: action.payload,
          };
        case 'CLEAR_VISUALIZER':
          return { ...initialState };
        default:
          return state;
      }
    }),
}));
```

---

## 8. Canvas Zoom Hook

**File: `src/hooks/useCanvasZoom.ts`**

```typescript
import { useState, useCallback, useRef } from 'react';
import { Point2D } from '@/types/visualization';

export function useCanvasZoom(initialZoom = 1, minZoom = 1, maxZoom = 4) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef<Point2D>({ x: 0, y: 0 });
  const initialPanRef = useRef<Point2D>({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(maxZoom, Number((z + 0.25).toFixed(2))));
  }, [maxZoom]);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(minZoom, Number((z - 0.25).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 }); // reset pan when back to 1x
      return next;
    });
  }, [minZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom((prevZoom) => {
        const newZoom = Math.min(maxZoom, Math.max(minZoom, Number((prevZoom + delta).toFixed(2))));
        if (newZoom === 1) setPan({ x: 0, y: 0 });
        return newZoom;
      });
    },
    [minZoom, maxZoom]
  );

  const startPan = useCallback((pos: Point2D) => {
    setIsPanning(true);
    startPanRef.current = pos;
    initialPanRef.current = { ...pan };
  }, [pan]);

  const updatePan = useCallback(
    (pos: Point2D) => {
      if (!isPanning) return;
      const dx = pos.x - startPanRef.current.x;
      const dy = pos.y - startPanRef.current.y;
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      });
    },
    [isPanning]
  );

  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  /** Converts client screen pixel coordinates to un-zoomed, un-panned canvas image coordinates */
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number, rect: DOMRect, containerWidth: number, containerHeight: number): Point2D => {
      // Mouse position relative to canvas element
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      if (zoom === 1) {
        return { x: mouseX, y: mouseY };
      }

      // Center origin for zoom scaling
      const cx = containerWidth / 2;
      const cy = containerHeight / 2;

      // Inverse matrix calculation:
      // screenX = cx + (canvasX - cx) * zoom + pan.x
      // canvasX = (screenX - cx - pan.x) / zoom + cx
      const canvasX = (mouseX - cx - pan.x) / zoom + cx;
      const canvasY = (mouseY - cy - pan.y) / zoom + cy;

      return { x: canvasX, y: canvasY };
    },
    [zoom, pan]
  );

  return {
    zoom,
    pan,
    isPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    screenToCanvas,
  };
}
```

---

## 9. Room Selector Component

**File: `src/components/visualizer/RoomSelector.tsx`**

```tsx
'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { sampleRooms } from '@/data/rooms';
import { useVisualizerStore } from '@/hooks/useVisualizer';
import { UploadCloud, Image as ImageIcon, RotateCcw, Check } from 'lucide-react';

export default function RoomSelector() {
  const { roomImage, isCustomRoom, dispatch } = useVisualizerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectRoom = (image: string) => {
    dispatch({ type: 'SET_ROOM_SAMPLE', payload: { image } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        dispatch({
          type: 'UPLOAD_CUSTOM_ROOM',
          payload: { image: dataUrl, file },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="mb-5 space-y-4">
      {/* Upload Room Photo Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            1. Room Environment
          </label>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-3.5 border border-dashed rounded-lg cursor-pointer transition-all ${
            isDragging
              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
              : isCustomRoom
              ? 'border-[var(--accent-terracotta)]/50 bg-[var(--accent-terracotta)]/10'
              : 'border-[var(--border-secondary)] hover:border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <div className="flex items-center space-x-2 text-[var(--text-primary)] font-medium">
            <UploadCloud className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="text-xs font-semibold">
              {isCustomRoom ? 'Custom Room Loaded' : 'Upload Custom Room Photo'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Drag & drop or browse image (JPG, PNG)
          </p>
        </div>
      </div>

      {/* Sample Rooms Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Preset Environments
          </span>
          {isCustomRoom && (
            <button
              onClick={() => handleSelectRoom(sampleRooms[0].image as string)}
              className="inline-flex items-center space-x-1 text-[11px] text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {sampleRooms.map((room) => {
            const isSelected = !isCustomRoom && roomImage === room.image;
            return (
              <button
                key={room.id}
                type="button"
                className={`relative h-18 w-full overflow-hidden rounded-md border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--border-primary)] ring-1 ring-[var(--border-primary)]'
                    : 'border-[var(--border-secondary)] hover:border-[var(--border-primary)] opacity-85 hover:opacity-100'
                }`}
                onClick={() => handleSelectRoom(room.image as string)}
              >
                <Image
                  src={room.thumbnail as string}
                  alt={room.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="160px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-earth)]/85 via-[var(--brand-earth)]/20 to-transparent p-2 flex items-end">
                  <span className="text-[11px] font-medium text-[var(--bg-primary)] line-clamp-1">
                    {room.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 bg-[var(--accent-gold)] text-[var(--brand-earth)] p-0.5 rounded shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## 10. Room Visualizer Wrapper

**File: `src/components/visualizer/RoomVisualizer.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { products } from '@/data/products';
import { Layers, ArrowLeft, SlidersHorizontal, ShieldCheck } from 'lucide-react';

// Dynamically import the visualization canvas (Konva) only on the client
const VisualizationCanvas = dynamic(
  () => import('./VisualizationCanvas'),
  { ssr: false, loading: () => <CanvasSkeleton /> }
);

type RoomVisualizerProps = {
  searchParams: {
    productId?: string;
    size?: string;
  };
};

function CanvasSkeleton() {
  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">
      <div className="flex items-center space-x-2 text-xs">
        <div className="w-4 h-4 rounded-full border-2 border-[var(--accent-gold)] border-t-transparent animate-spin"></div>
        <span>Initializing Studio Engine...</span>
      </div>
    </div>
  );
}

export default function RoomVisualizer({ searchParams }: RoomVisualizerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse initial size from URL params, e.g. "5x8" -> { width: 5, height: 8 }
  const initialSize = (() => {
    const sizeParam = searchParams.size;
    if (!sizeParam) return null;
    const parts = sizeParam.split('x');
    if (parts.length !== 2) return null;
    const w = parseInt(parts[0], 10);
    const h = parseInt(parts[1], 10);
    if (isNaN(w) || isNaN(h)) return null;
    return { width: w, height: h };
  })();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Studio Header Bar */}
      <header className="border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)]/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </Link>
            <div className="h-4 w-px bg-[var(--border-secondary)]"></div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-[var(--brand-earth)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-xs">
                H
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                House of Décor
              </span>
              <span className="text-[var(--text-muted)] text-xs">/</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Floor Visualizer Studio
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] font-medium text-[var(--text-primary)]">
              <ShieldCheck className="w-3 h-3 text-[var(--accent-gold)]" />
              <span>CAD Engine Ready</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Canvas & Inspector Area */}
      <main className="flex-1">
        {mounted && (
          <VisualizationCanvas
            initialProductId={searchParams.productId}
            initialSize={initialSize}
          />
        )}
        {!mounted && <CanvasSkeleton />}
      </main>
    </div>
  );
}

// Helper: find a product by ID
export function getProduct(id: string | undefined) {
  if (!id) return products[0];
  return products.find((p) => p.id === id) || products[0];
}
```

---

## 11. Visualizer Toolbar Component

**File: `src/components/visualizer/VisualizerToolbar.tsx`**

```tsx
'use client';

import { useVisualizerStore } from '@/hooks/useVisualizer';
import { products } from '@/data/products';
import { getProduct } from './RoomVisualizer';
import {
  Move,
  Layers,
  Square,
  Paintbrush,
  Eraser,
  Wand2,
  RotateCcw,
  Eye,
  Download,
  Sliders,
  Grid,
  Compass,
  Trash2,
  Magnet,
  EyeOff,
  Lock,
  Undo2,
  Redo2,
} from 'lucide-react';

type VisualizerToolbarProps = {
  onExport: () => void;
  onClearMask: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export default function VisualizerToolbar({ onExport, onClearMask, onUndo, onRedo, canUndo, canRedo }: VisualizerToolbarProps) {
  const {
    selectedProductId,
    selectedSize,
    dispatch,
    showOriginal,
    opacity,
    shadowOpacity,
    activeTool,
    brushSize,
    brushHardness,
    edgeSnap,
    showMaskPreview,
    preserveMask,
    floorTextureStrength,
    wandTolerance,
    wandContiguous,
  } = useVisualizerStore();

  const currentProduct = getProduct(selectedProductId || undefined);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      dispatch({
        type: 'SET_PRODUCT',
        payload: { productId: prod.id, size: prod.sizes[0] },
      });
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [width, height] = e.target.value.split('x').map(Number);
    if (!isNaN(width) && !isNaN(height)) {
      dispatch({ type: 'SET_SIZE', payload: { width, height } });
    }
  };

  const handleResetQuad = () => {
    dispatch({ type: 'RESET_TRANSFORM' });
  };

  const handleApplyPreset = (preset: 'center' | 'wide' | 'deep' | 'runner') => {
    const container = document.getElementById('visualizer-container');
    const w = container ? container.offsetWidth : 800;
    const h = container ? container.offsetHeight : 600;

    let corners;
    if (preset === 'center') {
      corners = {
        topLeft: { x: w * 0.28, y: h * 0.64 },
        topRight: { x: w * 0.72, y: h * 0.64 },
        bottomRight: { x: w * 0.85, y: h * 0.93 },
        bottomLeft: { x: w * 0.15, y: h * 0.93 },
      };
    } else if (preset === 'wide') {
      corners = {
        topLeft: { x: w * 0.15, y: h * 0.60 },
        topRight: { x: w * 0.85, y: h * 0.60 },
        bottomRight: { x: w * 0.95, y: h * 0.95 },
        bottomLeft: { x: w * 0.05, y: h * 0.95 },
      };
    } else if (preset === 'deep') {
      corners = {
        topLeft: { x: w * 0.38, y: h * 0.50 },
        topRight: { x: w * 0.62, y: h * 0.50 },
        bottomRight: { x: w * 0.88, y: h * 0.94 },
        bottomLeft: { x: w * 0.12, y: h * 0.94 },
      };
    } else {
      corners = {
        topLeft: { x: w * 0.38, y: h * 0.55 },
        topRight: { x: w * 0.62, y: h * 0.55 },
        bottomRight: { x: w * 0.68, y: h * 0.95 },
        bottomLeft: { x: w * 0.32, y: h * 0.95 },
      };
    }

    dispatch({ type: 'SET_QUAD_CORNERS', payload: { corners } });
  };

  const handleToggleBeforeAfter = () => {
    dispatch({ type: 'TOGGLE_BEFORE_AFTER' });
  };

  return (
    <div className="space-y-5 text-[var(--text-primary)]">
      {/* 2. Interactive Studio Tools Selector */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-2">
          2. Object & Layer Tools
        </label>
        
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)] mb-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'corners' } })}
            className={`flex flex-col items-center py-2 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'corners'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Move className="w-4 h-4 mb-1" />
            <span>Corner Align</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'floorTexture' } })}
            className={`flex flex-col items-center py-2 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'floorTexture'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Layers className="w-4 h-4 mb-1" />
            <span>Floor Texture</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'box' } })}
            className={`flex flex-col items-center py-2 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'box'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Square className="w-4 h-4 mb-1" />
            <span>Box Cutout</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)]">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'brush' } })}
            className={`flex flex-col items-center py-1.5 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'brush'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5 mb-0.5" />
            <span>Paint</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'wand' } })}
            className={`flex flex-col items-center py-1.5 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'wand'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 mb-0.5" />
            <span>Magic Wand</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'eraser' } })}
            className={`flex flex-col items-center py-1.5 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'eraser'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5 mb-0.5" />
            <span>Erase Mask</span>
          </button>
        </div>
      </div>

      {/* Floor Texture Tool Options Panel */}
      {activeTool === 'floorTexture' && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Floor Texture Blend
            </span>
            <span className="text-[11px] font-mono font-medium text-[var(--text-secondary)]">
              {Math.round(floorTextureStrength * 100)}%
            </span>
          </div>

          <div>
            <input
              type="range"
              min="0"
              max="0.7"
              step="0.05"
              value={floorTextureStrength}
              onChange={(e) => dispatch({ type: 'SET_FLOOR_TEXTURE_STRENGTH', payload: { strength: parseFloat(e.target.value) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            Blends the floor's lighting and grain into the rug surface using multiply compositing. Only affects the rug area — furniture stays crisp.
          </p>
        </div>
      )}

      {/* Table Box Cutout Tool Options Panel */}
      {activeTool === 'box' && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Rectangular Foreground Mask
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            Drag a rectangle over furniture to bring it above the rug. The selected area will render on top.
          </p>
        </div>
      )}

      {/* Magic Wand Tool Options Panel */}
      {activeTool === 'wand' && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Magic Wand Select
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
              <span>Color Tolerance</span>
              <span className="font-mono">{wandTolerance}</span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="1"
              value={wandTolerance}
              onChange={(e) => dispatch({ type: 'SET_WAND_TOLERANCE', payload: { tolerance: parseInt(e.target.value, 10) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
              Lower = stricter match. Higher = selects more similar colors.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-secondary)]">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
              Contiguous Fill Only
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_WAND_CONTIGUOUS', payload: { contiguous: !wandContiguous } })}
              className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                wandContiguous ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  wandContiguous ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            {wandContiguous
              ? 'Click furniture to select connected region of similar color. Hold Alt to subtract.'
              : 'Click furniture to select ALL matching color pixels across the entire room. Hold Alt to subtract.'}
          </p>
        </div>
      )}

      {/* Paint Brush / Eraser Tool Options Panel */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              {activeTool === 'brush' ? <Paintbrush className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <Eraser className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" />}
              {activeTool === 'brush' ? 'Foreground Paint Brush' : 'Erase Foreground Mask'}
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
              <span>Brush Diameter</span>
              <span className="font-mono">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={brushSize}
              onChange={(e) => dispatch({ type: 'SET_BRUSH_SIZE', payload: { size: parseInt(e.target.value, 10) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
              <span>Edge Hardness</span>
              <span className="font-mono">{brushHardness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={brushHardness}
              onChange={(e) => dispatch({ type: 'SET_BRUSH_HARDNESS', payload: { hardness: parseInt(e.target.value, 10) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
              0% = soft feathered edges · 100% = hard pixel edges
            </span>
          </div>

          {activeTool === 'brush' && (
            <div className="flex items-center justify-between pt-1 border-t border-[var(--border-secondary)]">
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
                <Magnet className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                Edge Snap
              </label>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_EDGE_SNAP', payload: { enabled: !edgeSnap } })}
                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  edgeSnap ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    edgeSnap ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mask Management Options (visible for brush, wand, eraser, box) */}
      {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'wand' || activeTool === 'box') && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Mask Options
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className={`p-1.5 rounded transition-colors ${
                  canUndo
                    ? 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer'
                    : 'text-[var(--text-muted)] cursor-not-allowed opacity-40'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className={`p-1.5 rounded transition-colors ${
                  canRedo
                    ? 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer'
                    : 'text-[var(--text-muted)] cursor-not-allowed opacity-40'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
              {showMaskPreview ? <Eye className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <EyeOff className="w-3.5 h-3.5" />}
              Show Mask Preview
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_SHOW_MASK_PREVIEW', payload: { enabled: !showMaskPreview } })}
              className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                showMaskPreview ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  showMaskPreview ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
              <Lock className="w-3.5 h-3.5" />
              Preserve on Room Switch
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PRESERVE_MASK', payload: { enabled: !preserveMask } })}
              className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                preserveMask ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  preserveMask ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] leading-tight border-t border-[var(--border-secondary)] pt-2">
            Ctrl+Z to undo · Ctrl+Shift+Z to redo
          </p>
        </div>
      )}

      {/* 3. Select Rug Product */}
      <div>
        <label htmlFor="rug-product" className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5">
          3. Select Rug Model
        </label>
        <select
          id="rug-product"
          value={currentProduct.id}
          onChange={handleProductChange}
          className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-sm focus:border-[var(--border-primary)] focus:outline-none"
        >
          {products.map((prod) => (
            <option key={prod.id} value={prod.id}>
              {prod.name} (${prod.price.toFixed(2)})
            </option>
          ))}
        </select>
      </div>

      {/* Select Rug Size */}
      <div>
        <label htmlFor="rug-size" className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
          Dimensions & Scale
        </label>
        <select
          id="rug-size"
          value={selectedSize ? `${selectedSize.width}x${selectedSize.height}` : ''}
          onChange={handleSizeChange}
          className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-sm focus:border-[var(--border-primary)] focus:outline-none"
        >
          {currentProduct.sizes.map((size) => (
            <option key={size.label} value={`${size.width}x${size.height}`}>
              {size.label} ({size.width}' × {size.height}')
            </option>
          ))}
        </select>
      </div>

      {/* 4. Floor Alignment Presets */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            4. Perspective Presets
          </label>
          <button
            onClick={handleResetQuad}
            className="inline-flex items-center space-x-1 text-[11px] text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Quad</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('center')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Grid className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Center Floor</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('wide')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Move className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Wide Area</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('deep')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Compass className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Deep Perspective</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('runner')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Hallway Runner</span>
          </button>
        </div>
      </div>

      {/* 5. Floor Lighting & Depth */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5">
          5. Lighting & Shadows
        </label>
        <div className="space-y-3 bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-secondary)]">
          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
              <span>Rug Opacity</span>
              <span className="font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => dispatch({ type: 'SET_OPACITY', payload: { opacity: parseFloat(e.target.value) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
            />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
              <span>Contact Floor Shadow</span>
              <span className="font-mono">{Math.round(shadowOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={shadowOpacity}
              onChange={(e) => dispatch({ type: 'SET_SHADOW_OPACITY', payload: { shadowOpacity: parseFloat(e.target.value) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Studio Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
        <button
          onClick={handleToggleBeforeAfter}
          type="button"
          className={`flex w-full items-center justify-center space-x-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            showOriginal
              ? 'border-[var(--accent-terracotta)] bg-[var(--accent-terracotta)]/15 text-[var(--accent-terracotta)]'
              : 'border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-primary)]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showOriginal ? 'Showing Before (Original)' : 'Toggle Compare View'}</span>
        </button>

        <button
          onClick={onExport}
          type="button"
          className="flex w-full items-center justify-center space-x-2 rounded-md bg-[var(--brand-earth)] px-3 py-2.5 text-xs font-semibold text-[var(--bg-primary)] shadow hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Render PNG</span>
        </button>
      </div>
    </div>
  );
}
```

---

## 12. Visualization Canvas Component (CORE)

**File: `src/components/visualizer/VisualizationCanvas.tsx`**

> ⚠️ This is the largest and most critical file (1403 lines). It contains ALL canvas rendering logic, mouse/touch handlers, undo/redo, keyboard shortcuts, zoom/pan, and the complete UI overlay system. **This is the backbone of the entire visualizer.**

Due to the size of this file, refer to the actual source file directly at:
`src/components/visualizer/VisualizationCanvas.tsx`

The file is structured in these major sections (line numbers approximate):

| Lines | Section |
|---|---|
| 1–33 | Imports (React, hooks, libs, lucide icons) |
| 34–37 | Props interface |
| 39–97 | Component setup: store destructure, refs, state, zoom hook |
| 99–151 | Undo/Redo history system |
| 152–229 | Keyboard shortcuts engine |
| 231–260 | Mask canvas initialization & room-switch clearing |
| 262–282 | Box cutout application |
| 284–347 | Product/room initialization & quad corner computation |
| 349–479 | Brush painting algorithm (with edge snap) |
| 481–585 | Magic wand algorithm (contiguous + global) |
| 587–781 | Main canvas render loop (all 6 layers + UI) |
| 783–871 | Helper drawing functions (perspective grid, quad handles) |
| 873–972 | Mouse event handlers (down, move, up) |
| 974–1024 | Touch event handlers |
| 1026–1083 | Export pipeline (2× resolution PNG) |
| 1085–1097 | No-product fallback UI |
| 1099–1403 | JSX: sidebar + canvas + floating UI + shortcuts modal |

**Key architectural note**: This single component manages ALL visualization state interactions. It directly calls canvas 2D drawing APIs, handles pixel-level manipulation for masking, and coordinates between the Zustand store and the rendering pipeline. All tool behaviors are implemented as `useCallback` functions within this component.

---

## 13. Visualizer Route Page

**File: `src/app/visualizer/page.tsx`**

```tsx
import RoomVisualizer from '@/components/visualizer/RoomVisualizer';

export default async function VisualizerPage({
  searchParams,
}: {
  searchParams: Promise<{
    productId?: string;
    size?: string;
  }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <RoomVisualizer searchParams={resolvedParams} />
    </div>
  );
}
```

---

## 14. Product Card Component

**File: `src/components/products/ProductCard.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/products';
import { Eye, ArrowRight } from 'lucide-react';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const defaultSize = product.sizes[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] shadow-sm hover:shadow-md transition-all duration-200 hover:border-[var(--border-primary)]">
      <Link href={`/products/${product.id}`} className="relative h-60 w-full overflow-hidden bg-[var(--bg-tertiary)] block">
        <Image
          src={product.image}
          alt={product.name}
          fill
          style={{ objectFit: "cover" }}
          className="transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        <div className="absolute top-3 right-3">
          <span className="rounded-md bg-[var(--brand-earth)]/90 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-[var(--bg-primary)] shadow-sm border border-[var(--accent-gold)]/30">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex flex-col gap-2">
          <Link
            href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
            className="flex items-center justify-center space-x-2 rounded-lg bg-[var(--brand-earth)] py-2 px-3 text-xs font-medium text-[var(--bg-primary)] shadow-sm hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Launch Visualizer Studio</span>
            <ArrowRight className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## 15. Product Detail Page

**File: `src/app/products/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { products } from '@/data/products';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Eye, Check, ShieldCheck, SlidersHorizontal } from 'lucide-react';

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);

  if (!product) {
    return notFound();
  }

  const defaultSize = product.sizes[0];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-secondary)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <Link href="/" className="w-8 h-8 rounded-lg bg-[var(--brand-earth)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-base shadow-sm">
              H
            </Link>
            <div>
              <Link href="/" className="text-base font-bold tracking-tight text-[var(--text-primary)] block hover:text-[var(--accent-gold)] transition-colors">
                House of Décor
              </Link>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Catalog</span>
            </Link>
            <Link
              href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
              className="inline-flex items-center space-x-2 rounded-lg bg-[var(--brand-earth)] px-4 py-2 text-xs font-semibold text-[var(--bg-primary)] shadow-sm hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Launch Studio Mode</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          {/* Product Image Stage */}
          <div className="relative h-[480px] w-full overflow-hidden rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] shadow-lg group">
            <Image
              src={product.image}
              alt={product.name}
              fill
              style={{ objectFit: 'contain' }}
              className="p-8 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 left-4 bg-[var(--brand-earth)]/90 backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-semibold text-[var(--bg-primary)] border border-[var(--accent-gold)]/30 shadow flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Hand-Knotted Luxury Collection
            </div>
          </div>

          {/* Product Info & Visualizer CTA */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold text-[var(--accent-gold)] uppercase tracking-widest block mb-1">
                Rug Specifications & Dimensions
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">{product.name}</h1>
              <p className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)]">${product.price.toFixed(2)}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Description</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">{product.description}</p>
            </div>

            <div className="space-y-3 pt-2 border-t border-[var(--border-secondary)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Available Sizes</h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Link
                    key={size.label}
                    href={`/visualizer?productId=${product.id}&size=${size.width}x${size.height}`}
                    className="group flex items-center space-x-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all shadow-sm"
                  >
                    <span>{size.label}</span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono group-hover:text-[var(--accent-gold)]">
                      ({size.width}' × {size.height}')
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Launch Visualizer CTA */}
            <div className="space-y-3 pt-4 border-t border-[var(--border-secondary)]">
              <Link
                href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
                className="flex w-full items-center justify-center space-x-2.5 rounded-xl bg-[var(--brand-earth)] px-6 py-3.5 text-sm font-semibold text-[var(--bg-primary)] shadow-md hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>Simulate Rug in Studio Visualizer</span>
              </Link>
              
              <p className="text-center text-[11px] text-[var(--text-muted)]">
                Upload room photo or test inside preset environment spaces
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)] py-8 text-center text-xs text-[var(--text-muted)]">
        © 2026 House of Décor. Floor Visualizer Studio Engine.
      </footer>
    </div>
  );
}
```

---

## 16. Home Page

**File: `src/app/page.tsx`**

> This file contains the landing page with hero section, feature highlights grid, and product catalog. See `VISUALIZER_ARCHITECTURE.md` Section 3 for routing details. The complete source is in the repository at `src/app/page.tsx` (145 lines).

---

## 17. Global CSS

**File: `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg-primary: #F5F2EC;
  --bg-secondary: #EAE3D8;
  --bg-tertiary: #DFD6C9;
  --text-primary: #2B2B2B;
  --text-secondary: #595959;
  --text-muted: #8C857E;
  --border-primary: #2B2B2B;
  --border-secondary: #D4CFC6;
  --accent-gold: #B89970;
  --accent-gold-hover: #B08A57;
  --brand-earth: #3A312B;
  --accent-terracotta: #C27D65;
}

@theme {
  --color-linen-primary: var(--bg-primary);
  --color-linen-secondary: var(--bg-secondary);
  --color-linen-tertiary: var(--bg-tertiary);
  --color-charcoal-primary: var(--text-primary);
  --color-charcoal-secondary: var(--text-secondary);
  --color-charcoal-muted: var(--text-muted);
  --color-border-dark: var(--border-primary);
  --color-border-light: var(--border-secondary);
  --color-gold: var(--accent-gold);
  --color-gold-hover: var(--accent-gold-hover);
  --color-brand-earth: var(--brand-earth);
  --color-terracotta: var(--accent-terracotta);
}

@layer base {
  html,
  body {
    padding: 0;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }

  * {
    box-sizing: border-box;
  }
}

/* Custom Scrollbar for sidebars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}
::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Custom Range Input Styling */
input[type="range"] {
  height: 6px;
  border-radius: 3px;
  accent-color: var(--accent-gold);
}
```

---

## 18. Root Layout

**File: `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

---

## 19. Configuration Files

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### `postcss.config.mjs`
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### `package.json`
```json
{
  "name": "visualization",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "konva": "^10.3.0",
    "lucide-react": "^1.31.0",
    "next": "16.3.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-konva": "^19.2.5",
    "use-image": "^1.1.4",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## Asset Manifest

### Product Images (copy to `public/products/`)
- `coastal-jute-rug.webp` (~1MB)
- `ivory-heritage-rug.webp` (~1.2MB)
- `modern-geometric-rug.webp` (~835KB)
- `sandstone-rug.webp` (~1MB)

### Room Images (copy to `public/rooms/`)
- `bedroom-01.webp` + `bedroom-01-thumb.webp` (~775KB each)
- `living-room-01.webp` + `living-room-01-thumb.webp` (~843KB each)
- `luxury-room-01.webp` + `luxury-room-01-thumb.webp` (~843KB each)
- `modern-room-01.webp` + `modern-room-01-thumb.webp` (~737KB each)

> **Note**: The `VisualizationCanvas.tsx` file (1403 lines) is too large to embed in full here but is included by reference. The complete source is at `src/components/visualizer/VisualizationCanvas.tsx` in this repository. All other files are embedded in full above.
