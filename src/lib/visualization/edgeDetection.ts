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
