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
