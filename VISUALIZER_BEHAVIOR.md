# VISUALIZER_BEHAVIOR.md

> **Purpose**: This document describes every user interaction, canvas behavior, tool behavior, algorithm detail, keyboard shortcut, mouse/touch event, undo/redo system, zoom/pan mechanics, export pipeline, and edge-case handling in the Product Floor Visualizer. An AI agent reading this should understand *exactly* how the visualizer behaves at every pixel level.

---

## 1. Component Initialization Flow

### Step 1: Route Entry (`/visualizer?productId=rug-001&size=5x8`)

1. `visualizer/page.tsx` (server component) resolves `searchParams` from the URL
2. Passes `searchParams` to `<RoomVisualizer>` (client component)
3. `RoomVisualizer` parses the `size` param: splits `"5x8"` by `"x"` → `{ width: 5, height: 8 }`
4. Dynamically imports `VisualizationCanvas` with `ssr: false`
5. Shows `<CanvasSkeleton>` (spinning loader + "Initializing Studio Engine...") until loaded

### Step 2: Canvas Component Mount (`VisualizationCanvas`)

On first render:

1. **Product initialization**: If `selectedProductId` is null in store, dispatches `SET_PRODUCT` with the URL's `productId` and parsed `initialSize` (or falls back to `products[0]`)
2. **Room initialization**: If `roomImage` is null, dispatches `SET_ROOM_SAMPLE` with `sampleRooms[0].image` (Modern Living Room)
3. **Container sizing**: Reads `containerRef.current.offsetWidth/Height`, stores in local state `containerSize`
4. **Offscreen mask canvas**: Creates `document.createElement('canvas')` stored in `maskCanvasRef`, sized to `containerSize`
5. **Quad computation**: Once `containerSize` is valid and `quadCorners` is null, computes default quad:
   - If current room is a sample room → uses its `defaultQuad` (normalized UV × canvas dimensions)
   - If custom room → uses fallback percentages: TL(25%, 65%), TR(75%, 65%), BR(88%, 94%), BL(12%, 94%)

### Step 3: Image Loading

- `useImage(rugImageUrl, 'anonymous')` → loads rug product WebP
- `useImage(roomImage, 'anonymous')` → loads room image (URL or data URI)
- Both return `[HTMLImageElement | undefined, 'loaded' | 'loading' | 'failed']`
- Canvas render loop only draws when both images are available

---

## 2. Canvas Rendering Pipeline (Detailed)

The main render runs inside a `useEffect` that watches 20+ dependencies. Every time any relevant state changes, the entire canvas is redrawn from scratch.

### 2.1 Clear & Transform Setup

```
1. ctx.setTransform(1, 0, 0, 1, 0, 0)  — Reset to identity matrix
2. ctx.clearRect(0, 0, width, height)    — Clear entire canvas
3. ctx.save()
4. If zoom > 1 or pan ≠ (0,0):
   - Translate to center + pan offset
   - Scale by zoom factor
   - Translate back from center
   (This creates centered zoom-in with panning support)
```

### 2.2 Layer 1: Room Background

```
ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height)
```
The room image is stretched to fill the entire canvas, regardless of aspect ratio.

### 2.3 Layer 2: Contact Floor Shadow

Only drawn when `!showOriginal`:
```
drawQuadShadow(ctx, quadCorners, shadowOpacity)
```

**Algorithm** (`quadWarp.ts → drawQuadShadow`):
- Takes the 4 quad corners and creates an offset shadow path
- Shadow offset: 8px downward for top corners, 8px down + 1.5× for bottom corners + horizontal spread
- Fill: solid black (`#000000`)
- Alpha: `shadowOpacity * 0.6` (so max visible shadow at opacity=1 is 60%)
- Filter: `blur(10px)` for soft contact shadow effect

### 2.4 Layer 3: Perspective-Warped Rug

```
drawPerspectiveQuad(ctx, rugImageKonva, quadCorners, gridSteps=16, opacity)
```

**Algorithm** (`quadWarp.ts → drawPerspectiveQuad`):

This is the core rendering algorithm. It subdivides the rug image into a 16×16 grid of quadrilateral cells, then renders each cell as two textured triangles with affine transforms.

**Step-by-step:**
1. Loop `y` from 0 to 15, `x` from 0 to 15 (16×16 = 256 cells)
2. For each cell, compute normalized UV coordinates: `(u0,v0)` to `(u1,v1)`
3. Compute source rectangle on rug image: `sx0 = u0 * img.width`, etc.
4. Compute 4 destination points via bilinear interpolation of the quad corners:
   ```
   getBilinearPoint(tl, tr, br, bl, u, v):
     topX = lerp(tl.x, tr.x, u)
     topY = lerp(tl.y, tr.y, u)
     botX = lerp(bl.x, br.x, u)
     botY = lerp(bl.y, br.y, u)
     return lerp(top, bot, v)
   ```
5. Split each cell into 2 triangles:
   - Triangle 1: (p00, p10, p01) with source (sx0,sy0), (sx1,sy0), (sx0,sy1)
   - Triangle 2: (p10, p11, p01) with source (sx1,sy0), (sx1,sy1), (sx0,sy1)

**Triangle rendering** (`drawTriangle`):
1. Clip to destination triangle path (ctx.clip())
2. Compute 6-element affine transformation matrix from source → destination triangle:
   ```
   denominator = sx0*(sy1-sy2) - sx1*(sy0-sy2) + sx2*(sy0-sy1)
   m11 = (p0.x*(sy1-sy2) - p1.x*(sy0-sy2) + p2.x*(sy0-sy1)) / denominator
   m12 = (p0.y*(sy1-sy2) - p1.y*(sy0-sy2) + p2.y*(sy0-sy1)) / denominator
   m21 = ...  (similar for x derivatives)
   m22 = ...
   dx  = ...  (translation x)
   dy  = ...  (translation y)
   ```
3. Apply: `ctx.transform(m11, m12, m21, m22, dx, dy)`
4. Draw: `ctx.drawImage(img, 0, 0)` — the transform maps the entire image, but clipping restricts to the triangle

**Grid resolution**: 16×16 = 256 cells × 2 triangles = **512 triangle draws per frame**. This provides smooth perspective distortion. Export uses `gridSteps=24` for higher quality.

### 2.5 Layer 4: Floor Texture Blend

Only drawn when `floorTextureStrength > 0`:

**Algorithm:**
1. Create offscreen canvas A → draw perspective-warped rug at 100% opacity
2. Create offscreen canvas B:
   a. Draw rug from canvas A
   b. Apply `globalCompositeOperation = 'multiply'` → draw room image
   c. Apply `globalCompositeOperation = 'destination-in'` → draw rug again (clips multiply result to rug shape)
3. Draw canvas B onto main canvas with `globalAlpha = floorTextureStrength`

**Effect**: The room's floor grain/lighting bleeds through the rug at a controllable intensity. Uses `multiply` compositing which darkens based on the floor's pixel values, creating a realistic "rug is sitting on the floor" appearance.

### 2.6 Layer 5: Foreground Mask

```
ctx.drawImage(maskCanvasRef.current, 0, 0)
```

The mask canvas is an offscreen `<canvas>` that stores painted-over furniture pixels. When drawn on top, it makes furniture appear to be "in front of" the rug.

### 2.7 Layer 5b: Mask Preview

When `showMaskPreview` is enabled:
1. Create another offscreen canvas
2. Draw the mask onto it
3. Apply `globalCompositeOperation = 'source-atop'`
4. Fill with `rgba(99, 102, 241, 0.45)` (indigo at 45% opacity)
5. Draw onto main canvas

**Effect**: All masked (painted) areas appear as a translucent indigo overlay, letting the user see exactly what's masked.

### 2.8 Layer 6: UI Overlays

Drawn on top of everything, still within the zoom/pan transform:

#### Corners Tool Active:
- **Perspective Grid**: 4×4 dashed line grid interpolated across the quad (gold color, 30% opacity, dash pattern [3,3])
- **Quad Handle Markers**: Dashed quad outline (gold, [5,5] dash). 4 circular handles at corners:
  - Default: 6px radius, fill `#F5F2EC`, stroke `#3A312B`, 2px
  - Hovered/Active: 8px radius, fill `#B89970` (gold), outer glow ring (12px radius, 35% gold fill)
  - Hit detection radius: 24px (generous for easy grabbing)

#### Brush/Eraser Tool Active:
- **Dual-Ring Cursor** at mouse position:
  - Outer ring: `brushSize / 2` radius, dashed [4,4], color indigo (`#6366f1`) or red (`#f43f5e` for eraser/alt)
  - Inner core ring: `(brushSize / 2) * (brushHardness / 100)` radius, solid, 60% opacity (only shown if hardness < 100)
  - Center dot: 2px solid circle
  - Alt held: red "–" symbol next to cursor
  - Shift held: indigo "+" symbol next to cursor

#### Box Tool Active:
- Dashed rectangle from `boxStart` to `boxCurrent`, indigo stroke [4,4], 15% fill

#### Wand Tool Active:
- Crosshair cursor: ±10px lines, center circle 4px dashed
- Alt held: red "–" symbol

---

## 3. Tool Behaviors (All 6 Tools)

### 3.1 Corners Tool (`activeTool === 'corners'`)

**Purpose**: Adjust the 4-corner perspective quadrilateral that defines where the rug is rendered on the floor.

**Mouse interaction**:
- **Mouse down**: Hit-test all 4 corners (24px radius). If hit → set `activeCorner`
- **Mouse move (dragging)**: Update the active corner's position via `UPDATE_QUAD_CORNER`. Position is clamped to `[0, containerSize.width]` × `[0, containerSize.height]`
- **Mouse move (hovering)**: Hit-test corners, set `hoveredCorner` for visual feedback
- **Mouse up**: Clear `activeCorner`

**Visual feedback**:
- Hovered corner: grows from 6px to 8px, turns gold
- Active corner: same as hovered
- Perspective grid lines drawn inside the quad

### 3.2 Floor Texture Tool (`activeTool === 'floorTexture'`)

**Purpose**: Not a painting tool — this tool activates the sidebar panel for adjusting `floorTextureStrength` via a range slider.

**Canvas behavior**: No direct canvas interaction. The tool's effect is purely through the render pipeline's Layer 4 (multiply blend).

**Slider range**: 0% to 70% (step 5%)

### 3.3 Box Cutout Tool (`activeTool === 'box'`)

**Purpose**: Draw a rectangular selection to bring furniture above the rug.

**Mouse interaction**:
- **Mouse down**: Save snapshot to undo stack. Set `boxStart` to current position
- **Mouse move (dragging)**: Update `boxCurrent` → live preview rectangle drawn on canvas
- **Mouse up**: Call `applyBoxCutout(boxStart, boxCurrent)`:
  1. Compute bounding box from the two points
  2. Minimum size check: 10×10 pixels (ignore tiny accidental clicks)
  3. Copy room image pixels in that rectangle onto the mask canvas:
     ```
     maskCtx.drawImage(roomImageKonva, bx, by, bw, bh, bx, by, bw, bh)
     ```
  4. This "stamps" the room's furniture pixels onto the mask, which renders on top of the rug

### 3.4 Paint Brush Tool (`activeTool === 'brush'`)

**Purpose**: Freehand paint furniture pixels onto the foreground mask to bring them above the rug.

**Mouse interaction**:
- **Mouse down**: Save undo snapshot. Paint single point (`applyBrushSegment(pos, pos)`)
- **Mouse move (dragging)**: Paint segment from last position to current position
- **Mouse up**: Clear tracking state

**`applyBrushSegment(p1, p2)` algorithm (detailed)**:

1. **Compute stroke interpolation**: Calculate distance between p1 and p2. Generate `ceil(dist / (radius * 0.3))` intermediate points along the line (ensuring continuous strokes)

2. **Compute bounding box**: Expand p1→p2 line by brush radius in all directions. Clamp to canvas bounds.

3. **Read pixel data**: Get room image pixels and mask pixels for the bounding box region

4. **For each pixel in bounding box**:
   a. Find minimum distance² to any stroke point
   b. If within radius²:
      - Compute `normalizedDist = sqrt(minDistSq) / radius` (0 at center, 1 at edge)
      - Compute falloff: `max(0, 1 - pow(normalizedDist, 0.5 + hardnessFactor * 2.5))`
        - At hardness=0: exponent=0.5 → very soft/gradual falloff
        - At hardness=100: exponent=3.0 → very sharp falloff (hard edge)
      - **Edge Snap mode** (if enabled):
        - Get Sobel edge strength at pixel via `getEdgeStrength(edgeMap, x, y, threshold=30)`
        - Multiply falloff by `max(0.15, edgeStrength)` — pixels near edges get stronger paint, flat areas get minimal paint (15% minimum)
      - Compute alpha: `round(255 * falloff * edgeFactor)`
      - **Only write if new alpha > existing mask alpha** (additive painting, never subtracts in brush mode)
      - Write room image RGB + computed alpha to mask pixel

5. **Put back modified mask image data**

### 3.5 Eraser Tool (`activeTool === 'eraser'`)

**Purpose**: Remove painted mask pixels to reveal the rug underneath.

Uses the same `applyBrushSegment` function but in eraser mode.

**Eraser mode is activated when**:
- `activeTool === 'eraser'`, OR
- `isAltPressed` is true (regardless of active tool)

**Eraser algorithm**:
1. Same stroke interpolation and bounding box as brush
2. For each pixel within brush radius:
   - Compute falloff using same hardness formula
   - `eraseAmount = round(220 * falloff)` (slightly less than 255 for gradual erasure)
   - `maskPixels[alpha] = max(0, current_alpha - eraseAmount)`
   - Only modifies alpha channel, preserves RGB

### 3.6 Magic Wand Tool (`activeTool === 'wand'`)

**Purpose**: Select and mask furniture by color similarity.

**Mouse interaction**:
- **Click**: Save undo snapshot. Run `applyMagicWand(clickPos)`

**`applyMagicWand(clickPos)` algorithm**:

1. Read full room image and mask image data
2. Get seed pixel RGB at click position
3. Compute tolerance: `tolSq = tolerance² × 3` (accounts for 3 color channels)

4. **Contiguous mode** (`wandContiguous === true`):
   - 4-connected flood fill using array-based stack (not recursive)
   - Starting from seed pixel, expand to neighbors
   - For each pixel: compute `(R-seedR)² + (G-seedG)² + (B-seedB)²`
   - If ≤ `tolSq`: fill this pixel and push neighbors
   - Uses `Uint8Array` visited map to prevent revisiting

5. **Global mode** (`wandContiguous === false`):
   - Iterate ALL pixels in the room image
   - If color distance ≤ `tolSq`: fill the pixel
   - Much more aggressive — selects scattered similar-color regions

6. **Fill behavior**:
   - Normal click: copy room RGB to mask with alpha=255 (fully opaque)
   - Alt+click (subtract): set mask alpha to 0 (erase the selection)

---

## 4. Keyboard Shortcuts Engine

Keyboard events are captured globally via `window.addEventListener('keydown/keyup')`. Input elements (input, textarea, select) are excluded.

### Tool Switching Shortcuts (no modifier required)

| Key | Tool |
|---|---|
| `C` | Corner Align |
| `B` | Paint Brush |
| `W` | Magic Wand |
| `E` | Eraser |
| `T` | Floor Texture |
| `X` | Box Cutout |
| `[` | Decrease brush size by 5px (min 10) |
| `]` | Increase brush size by 5px (max 90) |
| `?` | Toggle keyboard shortcuts modal |

### Modifier Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo mask operation |
| `Ctrl+Shift+Z` | Redo mask operation |
| `Ctrl+Y` | Redo mask operation (alternative) |
| `Space` (hold) | Pan mode — drag to pan zoomed canvas |
| `Alt` (hold) | Subtract mode — brush erases, wand subtracts |
| `Shift` (hold) | Visual indicator ("+" shown) — no functional effect beyond visual |

### Modifier State Tracking

Three boolean state variables track held keys:
- `isSpacePressed` → enables pan mode (cursor changes to grab/grabbing)
- `isAltPressed` → forces eraser mode for brush, subtract mode for wand
- `isShiftPressed` → shows "+" indicator on brush cursor

---

## 5. Zoom & Pan System

### Hook: `useCanvasZoom(initialZoom=1, minZoom=1, maxZoom=4)`

**State:**
- `zoom`: Current zoom level (1.0–4.0)
- `pan`: `{ x, y }` pixel offset
- `isPanning`: Boolean tracking active pan drag

**Zoom Controls:**
- Scroll wheel: ±0.15 per wheel event
- Zoom in button: +0.25
- Zoom out button: -0.25
- Reset button: zoom=1, pan=(0,0)
- At zoom=1, pan is automatically reset to (0,0)

**Pan Controls:**
- Activated by: Space+drag or middle mouse button
- Tracks start position and initial pan offset
- Applies delta: `pan = initialPan + (currentMouse - startMouse)`

**Coordinate Transform** (`screenToCanvas`):
Converts screen pixel coordinates to canvas image coordinates, accounting for zoom and pan:
```
At zoom=1: canvasPos = mousePos (no transform)
At zoom>1:
  cx = containerWidth / 2
  cy = containerHeight / 2
  canvasX = (mouseX - cx - pan.x) / zoom + cx
  canvasY = (mouseY - cy - pan.y) / zoom + cy
```

This is the inverse of the render transform: `screenX = cx + (canvasX - cx) * zoom + pan.x`

---

## 6. Undo / Redo System

### Implementation (in `VisualizationCanvas.tsx`)

- **Undo stack**: `undoStackRef` — array of `ImageData` snapshots (max 30)
- **Redo stack**: `redoStackRef` — array of `ImageData` snapshots
- **History version counter**: `historyVersion` state variable (triggers re-render to update button states)

### `saveMaskSnapshot()`
Called BEFORE any destructive mask operation:
1. Get current mask canvas `ImageData`
2. Push to undo stack
3. If stack exceeds `MAX_HISTORY` (30), shift oldest entry
4. Clear redo stack (new action invalidates redo history)

### `handleUndo()`
1. Pop from undo stack
2. Push current mask state to redo stack
3. Put popped `ImageData` back onto mask canvas

### `handleRedo()`
1. Pop from redo stack
2. Push current mask state to undo stack
3. Put popped `ImageData` back onto mask canvas

### When snapshots are saved:
- Before box cutout drawing
- Before brush stroke begins (mouse down)
- Before magic wand click
- Before mask clear

---

## 7. Edge Detection System (Sobel)

### File: `src/lib/visualization/edgeDetection.ts`

**Purpose**: Provides edge-strength data for the brush "Edge Snap" feature, so paint concentrates along furniture edges.

### `getEdgeMap(roomImage, canvasWidth, canvasHeight)` → `EdgeMap`

1. **Cache check**: If same image src + dimensions, return cached result
2. **Create offscreen canvas**: Draw room image at canvas dimensions
3. **Grayscale conversion**: ITU-R BT.601 luminance: `0.299R + 0.587G + 0.114B`
4. **Sobel operator**: For each pixel (excluding 1px border):
   - Compute Gx using kernel `[[-1,0,1],[-2,0,2],[-1,0,1]]`
   - Compute Gy using kernel `[[-1,-2,-1],[0,0,0],[1,2,1]]`
   - Magnitude: `sqrt(Gx² + Gy²)`
   - Clamp to 0–255, store in `Uint8Array`
5. Cache result with image src and dimensions

### `getEdgeStrength(edgeMap, x, y, threshold=40)` → 0..1

- If pixel value < threshold: return 0 (not on an edge)
- If ≥ threshold: normalize to 0..1 range: `(value - threshold) / (255 - threshold)`

### `clearEdgeMapCache()`
Called when room image changes (in the `useEffect` that watches `roomImage`).

---

## 8. Room Selection Behavior

### `RoomSelector` Component

**Preset Room Selection:**
- 4 rooms displayed as 2×2 thumbnail grid
- Clicking dispatches `SET_ROOM_SAMPLE` → sets room image, clears quad corners (triggers recomputation)
- Selected room shows gold checkmark badge and border ring
- Selecting a preset room also clears `isCustomRoom`, resets `roomImageFile`

**Custom Room Upload:**
- Drag-and-drop zone or click-to-browse file input
- Accepts `image/*` files
- Validates file type starts with `image/`
- Reads file as Data URL via `FileReader`
- Dispatches `UPLOAD_CUSTOM_ROOM` → sets room image to data URI, sets `isCustomRoom = true`
- Quad corners reset → fallback default quad is computed (25%/75% horizontal, 65%/94% vertical)

**Reset button**: Appears when custom room is loaded. Clicking resets to first sample room.

### Mask Behavior on Room Switch

When `roomImage` changes (tracked via `prevRoomImageRef`):
- If `preserveMask === false`: mask canvas is cleared (with undo snapshot saved first)
- If `preserveMask === true`: mask is kept as-is
- Edge map cache is always cleared (new room = new edge data)

---

## 9. Perspective Presets

4 preset quad configurations available in the toolbar:

| Preset | TL | TR | BR | BL |
|---|---|---|---|---|
| **Center Floor** | (28%, 64%) | (72%, 64%) | (85%, 93%) | (15%, 93%) |
| **Wide Area** | (15%, 60%) | (85%, 60%) | (95%, 95%) | (5%, 95%) |
| **Deep Perspective** | (38%, 50%) | (62%, 50%) | (88%, 94%) | (12%, 94%) |
| **Hallway Runner** | (38%, 55%) | (62%, 55%) | (68%, 95%) | (32%, 95%) |

All percentages are relative to `containerSize.width/height`. The preset reads `containerSize` from `document.getElementById('visualizer-container').offsetWidth/Height`.

---

## 10. Export Pipeline

### `handleExport()` in `VisualizationCanvas`

1. Create offscreen canvas at **2× resolution** (retina export):
   ```
   exportCanvas.width = canvas.width * 2
   exportCanvas.height = canvas.height * 2
   ctx.scale(2, 2)
   ```
2. Render the same layer stack (room → shadow → rug → floor texture → mask) — **without UI overlays**
3. Use `gridSteps=24` (vs 16 in live preview) for smoother perspective warping
4. Convert to PNG Data URI: `exportCanvas.toDataURL('image/png', 1.0)`
5. Create temporary `<a>` element, set `download` filename, click it to trigger download
6. Filename format: `{productId}-floor-visualization.png` (e.g., `rug-001-floor-visualization.png`)

---

## 11. Touch Support

All mouse events have corresponding touch equivalents:
- `onTouchStart` → same logic as `onMouseDown`
- `onTouchMove` → same logic as `onMouseMove`
- `onTouchEnd` → same logic as `onMouseUp`

Touch coordinates use `e.touches[0].clientX/clientY` and are passed through `screenToCanvas()`.

**Note**: Pan via Space+drag doesn't work on touch (no keyboard). Middle-click pan also unavailable.

---

## 12. Cursor Behavior

The `<canvas>` element's CSS cursor class changes dynamically:

| Condition | Cursor |
|---|---|
| Space held (not dragging) | `cursor-grab` |
| Space held (dragging) | `cursor-grabbing` |
| Corners tool + active corner | `cursor-grabbing` |
| Corners tool + hovered corner | `cursor-grab` |
| Corners tool + no hover | `cursor-crosshair` |
| Wand tool | `cursor-crosshair` |
| Brush / Eraser / Box tool | `cursor-none` (custom canvas cursor drawn) |

---

## 13. Before/After Compare Mode

When `showOriginal === true`:
- Layers 2–6 are NOT rendered (only room background)
- A terracotta badge "BEFORE (Original Image)" appears at top-right
- All tool interactions are disabled (early return in mouse handlers)
- Toggle via toolbar button or `TOGGLE_BEFORE_AFTER` action

---

## 14. Product & Size Switching

### Product Change (dropdown in toolbar)
- Dispatches `SET_PRODUCT` with new product ID and its first available size
- The rug image URL changes → `useImage` reloads the new rug
- Quad corners are NOT reset (rug position stays the same)

### Size Change (dropdown in toolbar)
- Dispatches `SET_SIZE` with new `{ width, height }`
- Currently, size is stored in state but does NOT directly affect rendering
- The quad corners define the visual size on canvas. Size is metadata for display/reference

---

## 15. Responsive Behavior

### Container Sizing
- The canvas container is `flex-1` in a flex row layout
- On window resize, `containerSize` is updated via `ResizeObserver`-like effect
- Canvas `width` and `height` attributes are set to `containerSize`
- Offscreen mask canvas is also resized to match

### Layout Breakpoints
- Below `lg` (1024px): Sidebar stacks on top of canvas (column layout)
- At/above `lg`: Sidebar is fixed 320px width, canvas takes remaining space
- Minimum canvas height: `500px`
- Toolbar top bar hides text labels below `sm` (640px), shows only icons

---

## 16. Floating UI Elements

### Top Bar (Floating over canvas)
- Positioned: `absolute top-4 left-1/2 -translate-x-1/2 z-20`
- Contains: 6 tool buttons, undo/redo, zoom in/out/reset, compare toggle, export, help
- Background: `bg-[var(--bg-secondary)]/90 backdrop-blur-md`
- Active tool highlighted with `bg-[var(--brand-earth)] text-[var(--bg-primary)]`

### Status Indicator (bottom-right)
- `absolute bottom-4 right-4 pointer-events-none`
- Shows contextual help text based on active tool
- Shows zoom percentage when zoomed in

### Keyboard Shortcuts Modal
- Fixed fullscreen overlay: `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`
- Modal card: max-width 448px, 2-column grid of shortcuts
- Dismissable via X button or `?` key toggle

---

## 17. Error Handling & Edge Cases

1. **Degenerate triangles**: In `drawTriangle`, if `|denominator| < 0.0001`, the triangle is skipped (prevents division by zero in affine matrix)
2. **Tiny box cutouts**: Box selections smaller than 10×10 pixels are ignored
3. **Out-of-bounds wand clicks**: Wand seed position is range-checked against canvas dimensions
4. **Missing product**: `getProduct(id)` falls back to `products[0]` if ID not found
5. **No product selected**: Shows "No product selected" message with link back to homepage
6. **Image loading failure**: `useImage` returns `undefined` for the image element; render loop safely skips drawing
7. **Mask canvas initialization**: Created lazily on first mount, dimensions synced to container size
