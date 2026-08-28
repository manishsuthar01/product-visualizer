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

/**
 * Generate CSS canvas filter string for ambient lighting & color temperature tuning
 */
export function getCanvasFilterString(
  brightness: number = 0,
  warmth: number = 0,
  contrast: number = 0,
  saturation: number = 0
): string {
  const b = Math.max(20, Math.min(200, 100 + brightness));
  const c = Math.max(50, Math.min(180, 100 + contrast));
  const s = Math.max(10, Math.min(220, 100 + saturation));

  let filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

  if (warmth > 0) {
    // Warm incandescent tone: slight sepia blend with gentle warmth
    const sepiaVal = Math.min(45, warmth * 0.7);
    filter += ` sepia(${sepiaVal}%) hue-rotate(-${warmth * 0.15}deg)`;
  } else if (warmth < 0) {
    // Cool daylight tone: subtle hue rotate towards cyan/blue
    filter += ` hue-rotate(${Math.abs(warmth) * 0.3}deg)`;
  }

  return filter;
}

/**
 * Calculate the center point of the perspective quad
 */
export function calculateQuadCenter(corners: QuadCorners): Point2D {
  return {
    x: (corners.topLeft.x + corners.topRight.x + corners.bottomRight.x + corners.bottomLeft.x) / 4,
    y: (corners.topLeft.y + corners.topRight.y + corners.bottomRight.y + corners.bottomLeft.y) / 4,
  };
}

/**
 * Draw perspective dimension callout badges and architectural measurement ticks on the floor quad
 */
export function drawPerspectiveDimensions(
  ctx: CanvasRenderingContext2D,
  corners: QuadCorners,
  size: { width: number; height: number } | null
) {
  if (!size) return;
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

  ctx.save();

  // Bottom edge center (front width)
  const bottomMid = {
    x: (bl.x + br.x) / 2,
    y: (bl.y + br.y) / 2,
  };

  // Right edge center (depth / length)
  const rightMid = {
    x: (tr.x + br.x) / 2,
    y: (tr.y + br.y) / 2,
  };

  // Center badge position
  const center = calculateQuadCenter(corners);
  const areaSqFt = (size.width * size.height).toFixed(0);

  // 1. Draw Subtle Dimension Extension Ticks along bottom
  ctx.strokeStyle = 'rgba(184, 153, 112, 0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);

  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y + 4);
  ctx.lineTo(bl.x, bl.y + 14);
  ctx.moveTo(br.x, br.y + 4);
  ctx.lineTo(br.x, br.y + 14);
  ctx.moveTo(bl.x, bl.y + 9);
  ctx.lineTo(br.x, br.y + 9);
  ctx.stroke();

  // 2. Draw Floor Dimension Tag Badge at Bottom Edge
  const badgeText = `${size.width} ft × ${size.height} ft`;
  const subText = `${areaSqFt} sq ft`;

  ctx.setLineDash([]);
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(badgeText).width;
  const badgeW = Math.max(96, textWidth + 30);
  const badgeH = 22;
  const badgeX = bottomMid.x - badgeW / 2;
  const badgeY = bottomMid.y + 12;

  // Background pill
  ctx.fillStyle = 'rgba(43, 43, 43, 0.92)';
  ctx.strokeStyle = '#B89970';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();

  // Text label
  ctx.fillStyle = '#F5F2EC';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, bottomMid.x - 12, badgeY + badgeH / 2);

  // Sq ft tag
  ctx.font = '600 8.5px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#B89970';
  ctx.fillText(subText, bottomMid.x + badgeW / 2 - 18, badgeY + badgeH / 2);

  // Depth callout tag at right edge
  const depthText = `${size.height}'`;
  ctx.font = '600 9px system-ui, -apple-system, sans-serif';
  const depthW = 26;
  const depthH = 16;
  ctx.fillStyle = 'rgba(43, 43, 43, 0.85)';
  ctx.strokeStyle = 'rgba(184, 153, 112, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rightMid.x + 8, rightMid.y - depthH / 2, depthW, depthH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F5F2EC';
  ctx.fillText(depthText, rightMid.x + 8 + depthW / 2, rightMid.y);

  ctx.restore();
}
