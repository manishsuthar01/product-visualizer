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
