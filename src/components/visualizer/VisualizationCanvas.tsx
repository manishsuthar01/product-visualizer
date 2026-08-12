'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useImage from 'use-image';
import Link from 'next/link';
import { useVisualizerStore } from '@/hooks/useVisualizer';
import { getProduct } from './RoomVisualizer';
import { sampleRooms } from '@/data/rooms';
import RoomSelector from './RoomSelector';
import VisualizerToolbar from './VisualizerToolbar';
import { drawPerspectiveQuad, drawQuadShadow, QuadCorners, Point2D } from '@/lib/visualization/quadWarp';
import { getEdgeMap, getEdgeStrength, clearEdgeMapCache } from '@/lib/visualization/edgeDetection';
import {
  Move,
  Square,
  Paintbrush,
  Eraser,
  Layers,
  Eye,
  Download,
  Info,
  Wand2,
  Undo2,
  Redo2,
} from 'lucide-react';

interface VisualizationCanvasProps {
  initialProductId?: string | null;
  initialSize?: { width: number; height: number } | null;
}

export default function VisualizationCanvas({ initialProductId, initialSize }: VisualizationCanvasProps) {
  const {
    selectedProductId,
    selectedSize,
    roomImage,
    quadCorners,
    opacity,
    shadowOpacity,
    showOriginal,
    activeTool,
    brushSize,
    brushHardness,
    edgeSnap,
    showMaskPreview,
    preserveMask,
    floorTextureStrength,
    wandTolerance,
    dispatch,
  } = useVisualizerStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentProduct = getProduct(selectedProductId || undefined);
  const rugImageUrl = currentProduct.image as string;

  const [rugImageKonva] = useImage(rugImageUrl, 'anonymous');
  const [roomImageKonva] = useImage(roomImage || '', 'anonymous');

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [activeCorner, setActiveCorner] = useState<keyof QuadCorners | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<keyof QuadCorners | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePos, setMousePos] = useState<Point2D | null>(null);
  const [boxStart, setBoxStart] = useState<Point2D | null>(null);
  const [boxCurrent, setBoxCurrent] = useState<Point2D | null>(null);

  // Track previous room image for conditional mask clearing
  const prevRoomImageRef = useRef<string | null>(null);

  // ─── UNDO / REDO HISTORY ───────────────────────────
  const MAX_HISTORY = 30;
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0); // bumped to trigger re-render for button states

  /** Save the current mask state to the undo stack (call BEFORE modifying the mask). */
  const saveMaskSnapshot = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, mask.width, mask.height);
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift(); // drop oldest
    }
    // Any new action invalidates the redo stack
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  /** Undo: restore previous mask state. */
  const handleUndo = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask || undoStackRef.current.length === 0) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    // Save current state to redo stack
    const currentState = ctx.getImageData(0, 0, mask.width, mask.height);
    redoStackRef.current.push(currentState);
    // Restore previous state
    const prevState = undoStackRef.current.pop()!;
    ctx.putImageData(prevState, 0, 0);
    setHistoryVersion((v) => v + 1);
  }, []);

  /** Redo: restore next mask state. */
  const handleRedo = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask || redoStackRef.current.length === 0) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    // Save current state to undo stack
    const currentState = ctx.getImageData(0, 0, mask.width, mask.height);
    undoStackRef.current.push(currentState);
    // Restore next state
    const nextState = redoStackRef.current.pop()!;
    ctx.putImageData(nextState, 0, 0);
    setHistoryVersion((v) => v + 1);
  }, []);

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Initialize offscreen mask canvas
  useEffect(() => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    maskCanvasRef.current.width = containerSize.width;
    maskCanvasRef.current.height = containerSize.height;
  }, [containerSize]);

  // Clear mask canvas helper (with undo snapshot)
  const clearMask = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (ctx) {
      saveMaskSnapshot();
      ctx.clearRect(0, 0, mask.width, mask.height);
    }
  }, [saveMaskSnapshot]);

  // Clear mask when room changes (unless preserveMask is enabled)
  useEffect(() => {
    if (prevRoomImageRef.current !== null && prevRoomImageRef.current !== roomImage) {
      if (!preserveMask) {
        clearMask();
      }
      clearEdgeMapCache();
    }
    prevRoomImageRef.current = roomImage;
  }, [roomImage, preserveMask, clearMask]);

  // ─────────────────────────────────────────────────────
  // BOX CUTOUT: copies room pixels into mask within a rect
  // ─────────────────────────────────────────────────────
  const applyBoxCutout = useCallback(
    (p1: Point2D, p2: Point2D) => {
      const mask = maskCanvasRef.current;
      if (!mask || !roomImageKonva) return;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      const bx = Math.max(0, Math.floor(Math.min(p1.x, p2.x)));
      const by = Math.max(0, Math.floor(Math.min(p1.y, p2.y)));
      const bw = Math.min(containerSize.width - bx, Math.ceil(Math.abs(p2.x - p1.x)));
      const bh = Math.min(containerSize.height - by, Math.ceil(Math.abs(p2.y - p1.y)));

      if (bw <= 10 || bh <= 10) return;

      maskCtx.save();
      maskCtx.drawImage(roomImageKonva, bx, by, bw, bh, bx, by, bw, bh);
      maskCtx.restore();
    },
    [roomImageKonva, containerSize]
  );

  // Initialize product and room on mount if not set
  useEffect(() => {
    const productIdToSet = initialProductId || currentProduct.id;
    if (!selectedProductId && productIdToSet) {
      dispatch({
        type: 'SET_PRODUCT',
        payload: { productId: productIdToSet, size: initialSize || currentProduct.sizes[0] },
      });
    }
    if (!roomImage) {
      dispatch({ type: 'SET_ROOM_SAMPLE', payload: { image: sampleRooms[0].image as string } });
    }
  }, [selectedProductId, initialProductId, initialSize, roomImage, dispatch, currentProduct]);

  // Update container dimensions on window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute default 3D floor quad when room or container size changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0 && !quadCorners) {
      const w = containerSize.width;
      const h = containerSize.height;

      const roomSample = sampleRooms.find((r) => r.image === roomImage);
      if (roomSample && roomSample.defaultQuad) {
        const q = roomSample.defaultQuad;
        dispatch({
          type: 'SET_QUAD_CORNERS',
          payload: {
            corners: {
              topLeft: { x: q.topLeft.u * w, y: q.topLeft.v * h },
              topRight: { x: q.topRight.u * w, y: q.topRight.v * h },
              bottomRight: { x: q.bottomRight.u * w, y: q.bottomRight.v * h },
              bottomLeft: { x: q.bottomLeft.u * w, y: q.bottomLeft.v * h },
            },
          },
        });
      } else {
        dispatch({
          type: 'SET_QUAD_CORNERS',
          payload: {
            corners: {
              topLeft: { x: w * 0.25, y: h * 0.65 },
              topRight: { x: w * 0.75, y: h * 0.65 },
              bottomRight: { x: w * 0.88, y: h * 0.94 },
              bottomLeft: { x: w * 0.12, y: h * 0.94 },
            },
          },
        });
      }
    }
  }, [containerSize.width, containerSize.height, roomImage, quadCorners, dispatch]);

  // ─────────────────────────────────────────────────────
  // PURE FOREGROUND PAINT BRUSH (no color keying!)
  // Copies room pixels directly onto the mask canvas.
  // The user paints furniture; those pixels show on top of rug.
  // ─────────────────────────────────────────────────────
  const applyBrushSegment = useCallback(
    (p1: Point2D, p2: Point2D) => {
      const mask = maskCanvasRef.current;
      if (!mask || !roomImageKonva) return;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      const width = containerSize.width;
      const height = containerSize.height;
      const radius = Math.round(brushSize / 2);

      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.3)));

      const minX = Math.max(0, Math.floor(Math.min(p1.x, p2.x) - radius));
      const minY = Math.max(0, Math.floor(Math.min(p1.y, p2.y) - radius));
      const maxX = Math.min(width, Math.ceil(Math.max(p1.x, p2.x) + radius));
      const maxY = Math.min(height, Math.ceil(Math.max(p1.y, p2.y) + radius));
      const bboxW = maxX - minX;
      const bboxH = maxY - minY;

      if (bboxW <= 0 || bboxH <= 0) return;

      const strokePoints: Point2D[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        strokePoints.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
        });
      }

      const radSq = radius * radius;

      // ── ERASER MODE ──
      if (activeTool === 'eraser') {
        const maskImgData = maskCtx.getImageData(minX, minY, bboxW, bboxH);
        const maskPixels = maskImgData.data;

        for (let y = 0; y < bboxH; y++) {
          const canvasY = minY + y;
          for (let x = 0; x < bboxW; x++) {
            const canvasX = minX + x;

            let minDistSq = Infinity;
            for (let k = 0; k < strokePoints.length; k++) {
              const dx = canvasX - strokePoints[k].x;
              const dy = canvasY - strokePoints[k].y;
              const dSq = dx * dx + dy * dy;
              if (dSq < minDistSq) minDistSq = dSq;
            }

            if (minDistSq <= radSq) {
              const idx = (y * bboxW + x) * 4;
              const minDist = Math.sqrt(minDistSq);
              // Hardness controls the falloff curve
              const normalizedDist = minDist / radius;
              const hardnessFactor = brushHardness / 100;
              // At 100% hardness: flat 1.0 until edge, then sharp drop
              // At 0% hardness: smooth gaussian-like falloff
              const falloff = Math.max(0, 1 - Math.pow(normalizedDist, 0.5 + hardnessFactor * 2.5));
              const eraseAmount = Math.round(220 * falloff);
              maskPixels[idx + 3] = Math.max(0, maskPixels[idx + 3] - eraseAmount);
            }
          }
        }
        maskCtx.putImageData(maskImgData, minX, minY);
        return;
      }

      // ── FOREGROUND PAINT BRUSH MODE ──
      if (activeTool === 'brush') {
        // Get room pixels to copy
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.drawImage(roomImageKonva, 0, 0, width, height);

        const roomImgData = tempCtx.getImageData(minX, minY, bboxW, bboxH);
        const roomPixels = roomImgData.data;

        const maskImgData = maskCtx.getImageData(minX, minY, bboxW, bboxH);
        const maskPixels = maskImgData.data;

        // Optionally get edge map for edge snapping
        const edgeMap = edgeSnap ? getEdgeMap(roomImageKonva, width, height) : null;

        for (let y = 0; y < bboxH; y++) {
          const canvasY = minY + y;
          for (let x = 0; x < bboxW; x++) {
            const canvasX = minX + x;

            let minDistSq = Infinity;
            for (let k = 0; k < strokePoints.length; k++) {
              const dx = canvasX - strokePoints[k].x;
              const dy = canvasY - strokePoints[k].y;
              const dSq = dx * dx + dy * dy;
              if (dSq < minDistSq) minDistSq = dSq;
            }

            if (minDistSq <= radSq) {
              const idx = (y * bboxW + x) * 4;

              // Hardness-based falloff
              const minDist = Math.sqrt(minDistSq);
              const normalizedDist = minDist / radius;
              const hardnessFactor = brushHardness / 100;
              const falloff = Math.max(0, 1 - Math.pow(normalizedDist, 0.5 + hardnessFactor * 2.5));

              // Edge snap: modulate alpha by edge strength
              let edgeFactor = 1.0;
              if (edgeMap) {
                const es = getEdgeStrength(edgeMap, canvasX, canvasY, 30);
                // Allow full painting on edges, reduce away from edges
                edgeFactor = Math.max(0.15, es); // keep a minimum so brush isn't totally invisible off-edge
              }

              const alpha = Math.round(255 * falloff * edgeFactor);

              // Only increase alpha, never decrease (accumulative painting)
              if (alpha > maskPixels[idx + 3]) {
                maskPixels[idx] = roomPixels[idx];
                maskPixels[idx + 1] = roomPixels[idx + 1];
                maskPixels[idx + 2] = roomPixels[idx + 2];
                maskPixels[idx + 3] = alpha;
              }
            }
          }
        }

        maskCtx.putImageData(maskImgData, minX, minY);
      }
    },
    [roomImageKonva, brushSize, brushHardness, activeTool, containerSize, edgeSnap]
  );

  // ─────────────────────────────────────────────────────
  // MAGIC WAND: Flood-fill selection of similar-colored regions
  // Copies all connected similar-color room pixels into the mask.
  // ─────────────────────────────────────────────────────
  const applyMagicWand = useCallback(
    (clickPos: Point2D) => {
      const mask = maskCanvasRef.current;
      if (!mask || !roomImageKonva) return;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      const width = containerSize.width;
      const height = containerSize.height;

      // Get room pixels
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      tempCtx.drawImage(roomImageKonva, 0, 0, width, height);
      const roomImgData = tempCtx.getImageData(0, 0, width, height);
      const roomPixels = roomImgData.data;

      const maskImgData = maskCtx.getImageData(0, 0, width, height);
      const maskPixels = maskImgData.data;

      const startX = Math.round(clickPos.x);
      const startY = Math.round(clickPos.y);
      if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

      const startIdx = (startY * width + startX) * 4;
      const seedR = roomPixels[startIdx];
      const seedG = roomPixels[startIdx + 1];
      const seedB = roomPixels[startIdx + 2];

      const tolerance = wandTolerance;
      const tolSq = tolerance * tolerance * 3; // per-channel tolerance squared * 3 channels

      // Visited bitmap
      const visited = new Uint8Array(width * height);
      const stack: number[] = [startX, startY];
      visited[startY * width + startX] = 1;

      while (stack.length > 0) {
        const cy = stack.pop()!;
        const cx = stack.pop()!;

        const pixIdx = (cy * width + cx) * 4;
        const dr = roomPixels[pixIdx] - seedR;
        const dg = roomPixels[pixIdx + 1] - seedG;
        const db = roomPixels[pixIdx + 2] - seedB;
        const distSq = dr * dr + dg * dg + db * db;

        if (distSq <= tolSq) {
          // Copy room pixel into mask
          maskPixels[pixIdx] = roomPixels[pixIdx];
          maskPixels[pixIdx + 1] = roomPixels[pixIdx + 1];
          maskPixels[pixIdx + 2] = roomPixels[pixIdx + 2];
          maskPixels[pixIdx + 3] = 255;

          // Push neighbors (4-connected)
          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny * width + nx]) {
              visited[ny * width + nx] = 1;
              stack.push(nx, ny);
            }
          }
        }
      }

      // Apply soft edge anti-aliasing to the wand selection border
      // We do a simple 2-pixel feather on the selection boundary
      const feathered = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (maskPixels[idx + 3] === 255 && visited[y * width + x]) {
            // Check if this is a border pixel (has a non-selected neighbor)
            let isBorder = false;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) { isBorder = true; break; }
              const nIdx = (ny * width + nx) * 4;
              if (maskPixels[nIdx + 3] === 0 || !visited[ny * width + nx]) { isBorder = true; break; }
            }
            if (isBorder) feathered[y * width + x] = 1;
          }
        }
      }

      // Soften border pixels
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (feathered[y * width + x]) {
            const idx = (y * width + x) * 4;
            maskPixels[idx + 3] = 180; // slightly transparent border
          }
        }
      }

      maskCtx.putImageData(maskImgData, 0, 0);
    },
    [roomImageKonva, containerSize, wandTolerance]
  );

  // ─────────────────────────────────────────────────────
  // MAIN CANVAS RENDER LOOP
  // Layer order: Room → Shadow → Rug → Floor Texture → Mask → UI
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // LAYER 1: Room Background Image
    if (roomImageKonva) {
      ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
    }

    // LAYER 2–5: Rug composite (only if rug + corners are set and not in "show original" mode)
    if (rugImageKonva && quadCorners && !showOriginal) {
      // LAYER 2: Contact Floor Shadow
      drawQuadShadow(ctx, quadCorners, shadowOpacity);

      // LAYER 3: Perspective-warped Rug
      drawPerspectiveQuad(ctx, rugImageKonva, quadCorners, 16, opacity);

      // LAYER 4: Floor Texture Blend (clipped to rug quad ONLY)
      // Uses multiply blend on an offscreen canvas, then composites result
      // This makes the rug pick up floor lighting/grain without becoming transparent
      if (floorTextureStrength > 0 && roomImageKonva) {
        const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = quadCorners;

        // Create offscreen canvas with just the rug rendered on it
        const rugOffscreen = document.createElement('canvas');
        rugOffscreen.width = canvas.width;
        rugOffscreen.height = canvas.height;
        const rugCtx = rugOffscreen.getContext('2d');
        if (rugCtx) {
          // Draw rug on offscreen
          drawPerspectiveQuad(rugCtx, rugImageKonva, quadCorners, 16, 1);

          // Create another offscreen for the multiply blend
          const blendOffscreen = document.createElement('canvas');
          blendOffscreen.width = canvas.width;
          blendOffscreen.height = canvas.height;
          const blendCtx = blendOffscreen.getContext('2d');
          if (blendCtx) {
            // Draw the rug first
            blendCtx.drawImage(rugOffscreen, 0, 0);

            // Multiply the room image on top — this darkens the rug
            // where the floor is dark, and preserves where the floor is light
            blendCtx.globalCompositeOperation = 'multiply';
            blendCtx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);

            // Now clip the result to only the rug shape using destination-in
            blendCtx.globalCompositeOperation = 'destination-in';
            blendCtx.drawImage(rugOffscreen, 0, 0);

            // Composite this blended result onto the main canvas at controlled strength
            ctx.save();
            ctx.globalAlpha = floorTextureStrength;
            ctx.drawImage(blendOffscreen, 0, 0);
            ctx.restore();
          }
        }
      }

      // LAYER 5: Foreground Mask Overlay (furniture cutouts ON TOP of rug)
      if (maskCanvasRef.current) {
        ctx.drawImage(maskCanvasRef.current, 0, 0);
      }

      // MASK PREVIEW: tinted overlay showing what the user has painted
      if (showMaskPreview && maskCanvasRef.current) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = canvas.width;
        previewCanvas.height = canvas.height;
        const previewCtx = previewCanvas.getContext('2d');
        if (previewCtx) {
          previewCtx.drawImage(maskCanvasRef.current, 0, 0);
          // Tint the mask with a color overlay
          previewCtx.globalCompositeOperation = 'source-atop';
          previewCtx.fillStyle = 'rgba(99, 102, 241, 0.45)'; // indigo tint
          previewCtx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(previewCanvas, 0, 0);
        }
      }

      // LAYER 6: UI — Quad Handles, Box Preview, Brush Cursor
      if (activeTool === 'corners') {
        drawQuadHandles(ctx, quadCorners, hoveredCorner, activeCorner);
      } else if (activeTool === 'box' && boxStart && boxCurrent) {
        ctx.save();
        const bx = Math.min(boxStart.x, boxCurrent.x);
        const by = Math.min(boxStart.y, boxCurrent.y);
        const bw = Math.abs(boxCurrent.x - boxStart.x);
        const bh = Math.abs(boxCurrent.y - boxStart.y);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.restore();
      } else if ((activeTool === 'brush' || activeTool === 'eraser') && mousePos) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.strokeStyle = activeTool === 'brush' ? '#6366f1' : '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        // Draw center dot
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = activeTool === 'brush' ? '#6366f1' : '#f43f5e';
        ctx.fill();
        ctx.restore();
      } else if (activeTool === 'wand' && mousePos) {
        // Crosshair cursor for wand
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        const s = 10;
        ctx.beginPath();
        ctx.moveTo(mousePos.x - s, mousePos.y);
        ctx.lineTo(mousePos.x + s, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - s);
        ctx.lineTo(mousePos.x, mousePos.y + s);
        ctx.stroke();
        // Small circle
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 4, 0, Math.PI * 2);
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [
    roomImageKonva,
    rugImageKonva,
    quadCorners,
    opacity,
    shadowOpacity,
    showOriginal,
    hoveredCorner,
    activeCorner,
    activeTool,
    brushSize,
    floorTextureStrength,
    showMaskPreview,
    mousePos,
    isMouseDown,
    boxStart,
    boxCurrent,
    historyVersion,
  ]);

  const drawQuadHandles = (
    ctx: CanvasRenderingContext2D,
    corners: QuadCorners,
    hovered: keyof QuadCorners | null,
    active: keyof QuadCorners | null
  ) => {
    const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

    ctx.save();
    ctx.strokeStyle = '#B89970';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.stroke();

    const handleList: { key: keyof QuadCorners; point: Point2D }[] = [
      { key: 'topLeft', point: tl },
      { key: 'topRight', point: tr },
      { key: 'bottomRight', point: br },
      { key: 'bottomLeft', point: bl },
    ];

    for (const h of handleList) {
      const isSelected = active === h.key || hovered === h.key;
      const radius = isSelected ? 8 : 6;

      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(184, 153, 112, 0.35)' : 'rgba(43, 43, 43, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#B89970' : '#F5F2EC';
      ctx.strokeStyle = '#3A312B';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  };

  const getCornerAtPos = (pos: Point2D): keyof QuadCorners | null => {
    if (!quadCorners) return null;
    const hitRadiusSq = 24 * 24;
    const corners: (keyof QuadCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    for (const c of corners) {
      const pt = quadCorners[c];
      const dx = pos.x - pt.x;
      const dy = pos.y - pt.y;
      if (dx * dx + dy * dy <= hitRadiusSq) {
        return c;
      }
    }
    return null;
  };

  const lastPosRef = useRef<Point2D | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    setIsMouseDown(true);
    setMousePos(pos);
    lastPosRef.current = pos;

    if (activeTool === 'box') {
      saveMaskSnapshot(); // save before box cutout
      setBoxStart(pos);
      setBoxCurrent(pos);
    } else if (activeTool === 'brush' || activeTool === 'eraser') {
      saveMaskSnapshot(); // save before brush stroke
      applyBrushSegment(pos, pos);
    } else if (activeTool === 'wand') {
      saveMaskSnapshot(); // save before wand fill
      applyMagicWand(pos);
    } else {
      const hit = getCornerAtPos(pos);
      if (hit) setActiveCorner(hit);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    setMousePos(pos);

    if (isMouseDown && activeTool === 'box') {
      setBoxCurrent(pos);
    } else if (isMouseDown && (activeTool === 'brush' || activeTool === 'eraser')) {
      const prev = lastPosRef.current || pos;
      applyBrushSegment(prev, pos);
      lastPosRef.current = pos;
    } else if (activeTool === 'corners') {
      if (activeCorner) {
        const clampedX = Math.max(0, Math.min(containerSize.width, pos.x));
        const clampedY = Math.max(0, Math.min(containerSize.height, pos.y));
        dispatch({
          type: 'UPDATE_QUAD_CORNER',
          payload: { corner: activeCorner, x: clampedX, y: clampedY },
        });
      } else {
        const hit = getCornerAtPos(pos);
        setHoveredCorner(hit);
      }
    }
  };

  const handleMouseUp = () => {
    if (isMouseDown && activeTool === 'box' && boxStart && boxCurrent) {
      applyBoxCutout(boxStart, boxCurrent);
    }
    setIsMouseDown(false);
    setActiveCorner(null);
    lastPosRef.current = null;
    setBoxStart(null);
    setBoxCurrent(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners || e.touches.length === 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    setIsMouseDown(true);
    setMousePos(pos);
    lastPosRef.current = pos;

    if (activeTool === 'box') {
      saveMaskSnapshot();
      setBoxStart(pos);
      setBoxCurrent(pos);
    } else if (activeTool === 'brush' || activeTool === 'eraser') {
      saveMaskSnapshot();
      applyBrushSegment(pos, pos);
    } else if (activeTool === 'wand') {
      saveMaskSnapshot();
      applyMagicWand(pos);
    } else {
      const hit = getCornerAtPos(pos);
      if (hit) setActiveCorner(hit);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners || e.touches.length === 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    setMousePos(pos);

    if (isMouseDown && activeTool === 'box') {
      setBoxCurrent(pos);
    } else if (isMouseDown && (activeTool === 'brush' || activeTool === 'eraser')) {
      const prev = lastPosRef.current || pos;
      applyBrushSegment(prev, pos);
      lastPosRef.current = pos;
    } else if (activeTool === 'corners' && activeCorner) {
      const clampedX = Math.max(0, Math.min(containerSize.width, pos.x));
      const clampedY = Math.max(0, Math.min(containerSize.height, pos.y));
      dispatch({
        type: 'UPDATE_QUAD_CORNER',
        payload: { corner: activeCorner, x: clampedX, y: clampedY },
      });
    }
  };

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width * 2;
    exportCanvas.height = canvas.height * 2;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);

    if (roomImageKonva) {
      ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
    }

    if (rugImageKonva && quadCorners && !showOriginal) {
      drawQuadShadow(ctx, quadCorners, shadowOpacity);
      drawPerspectiveQuad(ctx, rugImageKonva, quadCorners, 24, opacity);

      // Floor texture blend for export too
      if (floorTextureStrength > 0 && roomImageKonva) {
        const rugOffscreen = document.createElement('canvas');
        rugOffscreen.width = canvas.width;
        rugOffscreen.height = canvas.height;
        const rugCtx = rugOffscreen.getContext('2d');
        if (rugCtx) {
          drawPerspectiveQuad(rugCtx, rugImageKonva, quadCorners, 24, 1);
          const blendOffscreen = document.createElement('canvas');
          blendOffscreen.width = canvas.width;
          blendOffscreen.height = canvas.height;
          const blendCtx = blendOffscreen.getContext('2d');
          if (blendCtx) {
            blendCtx.drawImage(rugOffscreen, 0, 0);
            blendCtx.globalCompositeOperation = 'multiply';
            blendCtx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
            blendCtx.globalCompositeOperation = 'destination-in';
            blendCtx.drawImage(rugOffscreen, 0, 0);
            ctx.save();
            ctx.globalAlpha = floorTextureStrength;
            ctx.drawImage(blendOffscreen, 0, 0);
            ctx.restore();
          }
        }
      }

      if (maskCanvasRef.current) {
        ctx.drawImage(maskCanvasRef.current, 0, 0, canvas.width, canvas.height);
      }
    }

    const uri = exportCanvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `${currentProduct.id}-floor-visualization.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentProduct.id, roomImageKonva, rugImageKonva, quadCorners, showOriginal, opacity, shadowOpacity, floorTextureStrength]);

  if (!selectedProductId || !selectedSize) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">
        <p className="text-sm">
          No product selected. Please return to the{' '}
          <Link href="/" className="text-[var(--accent-gold)] font-semibold underline">
            homepage catalog
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-53px)] overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-80 bg-[var(--bg-secondary)] p-4 border-b lg:border-b-0 lg:border-r border-[var(--border-secondary)] overflow-y-auto flex-shrink-0 z-10">
        <RoomSelector />
        <VisualizerToolbar
          onExport={handleExport}
          onClearMask={clearMask}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </aside>

      {/* Canvas Studio Area */}
      <div
        ref={containerRef}
        id="visualizer-container"
        className="relative flex-1 bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden min-h-[500px]"
      >
        {/* Floating Canvas Top Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 bg-[var(--bg-secondary)]/90 backdrop-blur-md p-1 rounded-lg border border-[var(--border-secondary)] shadow-md text-[var(--text-primary)] text-xs">
          <button
            type="button"
            title="Corner Perspective Tool"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'corners' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'corners' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Align</span>
          </button>

          <button
            type="button"
            title="Floor Texture Blend"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'floorTexture' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'floorTexture' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Texture</span>
          </button>

          <button
            type="button"
            title="Box Cutout Tool"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'box' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'box' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Box</span>
          </button>

          <button
            type="button"
            title="Foreground Paint Brush"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'brush' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'brush' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Brush</span>
          </button>

          <button
            type="button"
            title="Magic Wand Select"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'wand' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'wand' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wand</span>
          </button>

          <button
            type="button"
            title="Eraser Mask"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'eraser' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'eraser' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Erase</span>
          </button>

          <div className="w-px h-4 bg-[var(--border-secondary)] mx-1"></div>

          <button
            type="button"
            title="Undo (Ctrl+Z)"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-2 rounded transition-colors ${
              canUndo ? 'hover:bg-[var(--bg-primary)]' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Redo (Ctrl+Shift+Z)"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-2 rounded transition-colors ${
              canRedo ? 'hover:bg-[var(--bg-primary)]' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-[var(--border-secondary)] mx-1"></div>

          <button
            type="button"
            title="Toggle Compare"
            onClick={() => dispatch({ type: 'TOGGLE_BEFORE_AFTER' })}
            className={`p-2 rounded transition-colors ${
              showOriginal ? 'bg-[var(--accent-terracotta)]/20 text-[var(--accent-terracotta)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Export Image"
            onClick={handleExport}
            className="p-2 rounded hover:bg-[var(--bg-primary)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={containerSize.width}
          height={containerSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className={`shadow-xl border border-[var(--border-secondary)] ${
            activeTool === 'corners'
              ? activeCorner
                ? 'cursor-grabbing'
                : hoveredCorner
                ? 'cursor-grab'
                : 'cursor-crosshair'
              : activeTool === 'wand'
              ? 'cursor-crosshair'
              : 'cursor-none'
          }`}
        />

        {/* Floating Tool Status Indicator */}
        {quadCorners && !showOriginal && (
          <div className="absolute bottom-4 right-4 pointer-events-none flex items-center space-x-2 bg-[var(--bg-secondary)]/90 text-[var(--text-primary)] backdrop-blur-md px-3 py-1.5 rounded-md text-[11px] font-medium border border-[var(--border-secondary)] shadow-sm">
            <Info className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            {activeTool === 'corners' && <span>Drag 4 corner handles to match floor perspective</span>}
            {activeTool === 'floorTexture' && <span>Floor texture blends room lighting into rug surface</span>}
            {activeTool === 'box' && <span>Drag box over furniture to bring it above the rug</span>}
            {activeTool === 'brush' && <span>Paint furniture to render it above the rug layer</span>}
            {activeTool === 'wand' && <span>Click furniture to auto-select similar-colored region</span>}
            {activeTool === 'eraser' && <span>Erase painted areas to reveal rug underneath</span>}
          </div>
        )}

        {showOriginal && (
          <div className="absolute top-4 right-4 pointer-events-none bg-[var(--accent-terracotta)] text-[var(--bg-primary)] backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-bold shadow">
            BEFORE (Original Image)
          </div>
        )}
      </div>
    </div>
  );
}