'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useImage from 'use-image';
import Link from 'next/link';
import { useVisualizerStore } from '@/hooks/useVisualizer';
import { useCanvasZoom } from '@/hooks/useCanvasZoom';
import { getProduct } from './RoomVisualizer';
import { sampleRooms } from '@/data/rooms';
import RoomSelector from './RoomSelector';
import VisualizerToolbar from './VisualizerToolbar';
import VisualizerTour from './VisualizerTour';
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
  ZoomIn,
  ZoomOut,
  HelpCircle,
  X,
  Keyboard,
  Sparkles,
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
    wandContiguous,
    showShortcutModal,
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

  // Keyboard modifiers state
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Zoom & Pan Engine
  const {
    zoom,
    pan,
    isPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    screenToCanvas,
  } = useCanvasZoom(1, 1, 4);

  // Track previous room image for conditional mask clearing
  const prevRoomImageRef = useRef<string | null>(null);

  // ─── UNDO / REDO HISTORY ───────────────────────────
  const MAX_HISTORY = 30;
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  /** Save the current mask state to the undo stack */
  const saveMaskSnapshot = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, mask.width, mask.height);
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  /** Undo: restore previous mask state */
  const handleUndo = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask || undoStackRef.current.length === 0) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const currentState = ctx.getImageData(0, 0, mask.width, mask.height);
    redoStackRef.current.push(currentState);
    const prevState = undoStackRef.current.pop()!;
    ctx.putImageData(prevState, 0, 0);
    setHistoryVersion((v) => v + 1);
  }, []);

  /** Redo: restore next mask state */
  const handleRedo = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask || redoStackRef.current.length === 0) return;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const currentState = ctx.getImageData(0, 0, mask.width, mask.height);
    undoStackRef.current.push(currentState);
    const nextState = redoStackRef.current.pop()!;
    ctx.putImageData(nextState, 0, 0);
    setHistoryVersion((v) => v + 1);
  }, []);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, [historyVersion]);

  // ─── KEYBOARD SHORTCUTS ENGINE ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        setIsSpacePressed(true);
        e.preventDefault();
      }
      if (e.key === 'Alt') setIsAltPressed(true);
      if (e.key === 'Shift') setIsShiftPressed(true);

      // Undo / Redo
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

      // Tool Switching Hotkeys
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'corners' } });
            break;
          case 'b':
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'brush' } });
            break;
          case 'w':
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'wand' } });
            break;
          case 'e':
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'eraser' } });
            break;
          case 't':
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'floorTexture' } });
            break;
          case 'x':
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'box' } });
            break;
          case '[':
            dispatch({ type: 'SET_BRUSH_SIZE', payload: { size: Math.max(10, brushSize - 5) } });
            break;
          case ']':
            dispatch({ type: 'SET_BRUSH_SIZE', payload: { size: Math.min(90, brushSize + 5) } });
            break;
          case '?':
            dispatch({ type: 'SET_SHOW_SHORTCUT_MODAL', payload: { open: !showShortcutModal } });
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') setIsSpacePressed(false);
      if (e.key === 'Alt') setIsAltPressed(false);
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, brushSize, showShortcutModal, dispatch]);

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

  // Apply Box Cutout
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
  // FOREGROUND PAINT BRUSH (with Alt subtract support)
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
      const isEraserMode = activeTool === 'eraser' || isAltPressed;

      // ── ERASER / SUBTRACT MODE ──
      if (isEraserMode) {
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
              const normalizedDist = minDist / radius;
              const hardnessFactor = brushHardness / 100;
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
              const minDist = Math.sqrt(minDistSq);
              const normalizedDist = minDist / radius;
              const hardnessFactor = brushHardness / 100;
              const falloff = Math.max(0, 1 - Math.pow(normalizedDist, 0.5 + hardnessFactor * 2.5));

              let edgeFactor = 1.0;
              if (edgeMap) {
                const es = getEdgeStrength(edgeMap, canvasX, canvasY, 30);
                edgeFactor = Math.max(0.15, es);
              }

              const alpha = Math.round(255 * falloff * edgeFactor);

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
    [roomImageKonva, brushSize, brushHardness, activeTool, containerSize, edgeSnap, isAltPressed]
  );

  // ─────────────────────────────────────────────────────
  // MAGIC WAND (supports contiguous & global fill mode)
  // ─────────────────────────────────────────────────────
  const applyMagicWand = useCallback(
    (clickPos: Point2D) => {
      const mask = maskCanvasRef.current;
      if (!mask || !roomImageKonva) return;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      const width = containerSize.width;
      const height = containerSize.height;

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
      const tolSq = tolerance * tolerance * 3;

      const isSubtract = isAltPressed;

      if (wandContiguous) {
        // Contiguous 4-connected flood fill
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
            if (isSubtract) {
              maskPixels[pixIdx + 3] = 0;
            } else {
              maskPixels[pixIdx] = roomPixels[pixIdx];
              maskPixels[pixIdx + 1] = roomPixels[pixIdx + 1];
              maskPixels[pixIdx + 2] = roomPixels[pixIdx + 2];
              maskPixels[pixIdx + 3] = 255;
            }

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
      } else {
        // Global color match across whole room
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pixIdx = (y * width + x) * 4;
            const dr = roomPixels[pixIdx] - seedR;
            const dg = roomPixels[pixIdx + 1] - seedG;
            const db = roomPixels[pixIdx + 2] - seedB;
            if (dr * dr + dg * dg + db * db <= tolSq) {
              if (isSubtract) {
                maskPixels[pixIdx + 3] = 0;
              } else {
                maskPixels[pixIdx] = roomPixels[pixIdx];
                maskPixels[pixIdx + 1] = roomPixels[pixIdx + 1];
                maskPixels[pixIdx + 2] = roomPixels[pixIdx + 2];
                maskPixels[pixIdx + 3] = 255;
              }
            }
          }
        }
      }

      maskCtx.putImageData(maskImgData, 0, 0);
    },
    [roomImageKonva, containerSize, wandTolerance, wandContiguous, isAltPressed]
  );

  // Perspective Vanishing Point Grid Helper
  const drawPerspectiveGrid = (ctx: CanvasRenderingContext2D, corners: QuadCorners) => {
    const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

    ctx.save();
    ctx.strokeStyle = 'rgba(184, 153, 112, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    const steps = 4;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const leftPt = {
        x: (1 - t) * tl.x + t * bl.x,
        y: (1 - t) * tl.y + t * bl.y,
      };
      const rightPt = {
        x: (1 - t) * tr.x + t * br.x,
        y: (1 - t) * tr.y + t * br.y,
      };
      ctx.beginPath();
      ctx.moveTo(leftPt.x, leftPt.y);
      ctx.lineTo(rightPt.x, rightPt.y);
      ctx.stroke();

      const topPt = {
        x: (1 - t) * tl.x + t * tr.x,
        y: (1 - t) * tl.y + t * tr.y,
      };
      const bottomPt = {
        x: (1 - t) * bl.x + t * br.x,
        y: (1 - t) * bl.y + t * br.y,
      };
      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(bottomPt.x, bottomPt.y);
      ctx.stroke();
    }
    ctx.restore();
  };

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

  // ─────────────────────────────────────────────────────
  // MAIN CANVAS RENDER LOOP (with Zoom/Pan & Dual Ring Cursor)
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Zoom & Pan transform matrix
    ctx.save();
    if (zoom > 1 || pan.x !== 0 || pan.y !== 0) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.translate(cx + pan.x, cy + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    }

    // LAYER 1: Room Background Image
    if (roomImageKonva) {
      ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
    }

    // LAYER 2–5: Rug composite
    if (rugImageKonva && quadCorners && !showOriginal) {
      // LAYER 2: Contact Floor Shadow
      drawQuadShadow(ctx, quadCorners, shadowOpacity);

      // LAYER 3: Perspective-warped Rug
      drawPerspectiveQuad(ctx, rugImageKonva, quadCorners, 16, opacity);

      // LAYER 4: Floor Texture Blend
      if (floorTextureStrength > 0 && roomImageKonva) {
        const rugOffscreen = document.createElement('canvas');
        rugOffscreen.width = canvas.width;
        rugOffscreen.height = canvas.height;
        const rugCtx = rugOffscreen.getContext('2d');
        if (rugCtx) {
          drawPerspectiveQuad(rugCtx, rugImageKonva, quadCorners, 16, 1);

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

      // LAYER 5: Foreground Mask Overlay
      if (maskCanvasRef.current) {
        ctx.drawImage(maskCanvasRef.current, 0, 0);
      }

      // MASK PREVIEW
      if (showMaskPreview && maskCanvasRef.current) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = canvas.width;
        previewCanvas.height = canvas.height;
        const previewCtx = previewCanvas.getContext('2d');
        if (previewCtx) {
          previewCtx.drawImage(maskCanvasRef.current, 0, 0);
          previewCtx.globalCompositeOperation = 'source-atop';
          previewCtx.fillStyle = 'rgba(99, 102, 241, 0.45)';
          previewCtx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(previewCanvas, 0, 0);
        }
      }

      // LAYER 6: UI — Quad Handles, Box Preview, Dual-Ring Cursor, Perspective Grid
      if (activeTool === 'corners') {
        drawPerspectiveGrid(ctx, quadCorners);
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
        const isEraserMode = activeTool === 'eraser' || isAltPressed;
        const outerRadius = brushSize / 2;
        const innerRadius = (brushSize / 2) * (brushHardness / 100);

        ctx.save();
        // 1. Outer Ring (Full Diameter)
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isEraserMode ? '#f43f5e' : '#6366f1';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        // 2. Inner Core Ring (Hardness core boundary)
        if (brushHardness < 100 && innerRadius > 1) {
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, innerRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isEraserMode ? 'rgba(244, 63, 94, 0.6)' : 'rgba(99, 102, 241, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.stroke();
        }

        // 3. Center Dot
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = isEraserMode ? '#f43f5e' : '#6366f1';
        ctx.fill();

        // Subtraction indicator if Alt or Shift held
        if (isAltPressed) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#f43f5e';
          ctx.fillText('–', mousePos.x + outerRadius + 4, mousePos.y + 4);
        } else if (isShiftPressed) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#6366f1';
          ctx.fillText('+', mousePos.x + outerRadius + 4, mousePos.y + 4);
        }

        ctx.restore();
      } else if (activeTool === 'wand' && mousePos) {
        // Wand Cursor
        ctx.save();
        ctx.strokeStyle = isAltPressed ? '#f43f5e' : '#f59e0b';
        ctx.lineWidth = 1.5;
        const s = 10;
        ctx.beginPath();
        ctx.moveTo(mousePos.x - s, mousePos.y);
        ctx.lineTo(mousePos.x + s, mousePos.y);
        ctx.moveTo(mousePos.x, mousePos.y - s);
        ctx.lineTo(mousePos.x, mousePos.y + s);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 4, 0, Math.PI * 2);
        ctx.setLineDash([2, 2]);
        ctx.stroke();

        if (isAltPressed) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#f43f5e';
          ctx.fillText('–', mousePos.x + 12, mousePos.y + 4);
        }

        ctx.restore();
      }
    }

    ctx.restore(); // restore zoom & pan matrix
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
    brushHardness,
    floorTextureStrength,
    showMaskPreview,
    mousePos,
    isMouseDown,
    boxStart,
    boxCurrent,
    historyVersion,
    zoom,
    pan,
    isAltPressed,
    isShiftPressed,
  ]);



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

  // Mouse Event Handlers mapped through Zoom screenToCanvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Pan mode (Space key or middle click)
    if (isSpacePressed || e.button === 1) {
      startPan({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY, rect, containerSize.width, containerSize.height);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      updatePan({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY, rect, containerSize.width, containerSize.height);

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
    if (isPanning) {
      endPan();
      return;
    }
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
    const pos = screenToCanvas(touch.clientX, touch.clientY, rect, containerSize.width, containerSize.height);

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
    const pos = screenToCanvas(touch.clientX, touch.clientY, rect, containerSize.width, containerSize.height);

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
        data-tour="canvas-stage"
        className="relative flex-1 bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden min-h-[500px]"
      >
        {/* Floating Canvas Top Bar */}
        <div
          data-tour="studio-actions"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1 bg-[var(--bg-secondary)]/90 backdrop-blur-md p-1 rounded-lg border border-[var(--border-secondary)] shadow-md text-[var(--text-primary)] text-xs"
        >
          <button
            type="button"
            title="Corner Perspective Tool (C)"
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
            title="Floor Texture Blend (T)"
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
            title="Box Cutout Tool (X)"
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
            title="Foreground Paint Brush (B)"
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
            title="Magic Wand Select (W)"
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
            title="Eraser Mask (E)"
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

          {/* Zoom Controls */}
          <button
            type="button"
            title="Zoom In"
            onClick={zoomIn}
            className="p-2 rounded hover:bg-[var(--bg-primary)] transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Zoom Out"
            onClick={zoomOut}
            className="p-2 rounded hover:bg-[var(--bg-primary)] transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {zoom > 1 && (
            <button
              type="button"
              title="Reset Zoom (100%)"
              onClick={resetZoom}
              className="px-1.5 py-1 text-[11px] font-mono font-medium rounded hover:bg-[var(--bg-primary)] text-[var(--accent-gold)] transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
          )}

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

          <button
            type="button"
            title="Keyboard Shortcuts Cheat Sheet (?)"
            onClick={() => dispatch({ type: 'SET_SHOW_SHORTCUT_MODAL', payload: { open: true } })}
            className="p-2 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Interactive Studio Guide"
            onClick={() => window.dispatchEvent(new CustomEvent('hod:restart-tour'))}
            className="p-2 rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className={`shadow-xl border border-[var(--border-secondary)] ${
            isSpacePressed || isPanning
              ? isPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : activeTool === 'corners'
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
            {activeTool === 'corners' && <span>Drag corner handles · Vanishing point guides enabled</span>}
            {activeTool === 'floorTexture' && <span>Floor texture blends room lighting into rug surface</span>}
            {activeTool === 'box' && <span>Drag box over furniture to bring it above the rug</span>}
            {activeTool === 'brush' && <span>Paint furniture · Hold Alt to subtract · [ / ] to resize</span>}
            {activeTool === 'wand' && <span>Click furniture to select · Hold Alt to subtract region</span>}
            {activeTool === 'eraser' && <span>Erase painted mask areas</span>}
            {zoom > 1 && <span className="font-mono text-[var(--accent-gold)]">({Math.round(zoom * 100)}% Zoom)</span>}
          </div>
        )}

        {showOriginal && (
          <div className="absolute top-4 right-4 pointer-events-none bg-[var(--accent-terracotta)] text-[var(--bg-primary)] backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-bold shadow">
            BEFORE (Original Image)
          </div>
        )}

        {/* KEYBOARD SHORTCUTS CHEAT SHEET MODAL */}
        {showShortcutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl shadow-2xl w-full max-w-md p-5 text-[var(--text-primary)] relative space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-secondary)] pb-3">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Keyboard className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span>Studio Keyboard Shortcuts</span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_SHOW_SHORTCUT_MODAL', payload: { open: false } })}
                  className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Corner Tool</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">C</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Paint Brush</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">B</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Magic Wand</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">W</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Eraser Tool</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">E</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Floor Texture</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">T</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Box Cutout</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">X</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Undo Action</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">Ctrl + Z</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Redo Action</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">Ctrl + Shift + Z</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Resize Brush</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]"> [ / ] </kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60">
                  <span className="text-[var(--text-secondary)]">Subtract Mask</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">Hold Alt</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]/60 col-span-2">
                  <span className="text-[var(--text-secondary)]">Pan Zoomed Canvas</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] font-mono font-bold text-[10px]">Space + Drag</kbd>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-secondary)] flex justify-between items-center">
                <span className="text-[11px] text-[var(--text-muted)]">Need a walkthrough?</span>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_SHOW_SHORTCUT_MODAL', payload: { open: false } });
                    window.dispatchEvent(new CustomEvent('hod:restart-tour'));
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[var(--brand-earth)] text-[var(--bg-primary)] hover:bg-[var(--accent-gold)] hover:text-[var(--brand-earth)] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[var(--accent-gold)]" />
                  <span>Start Guided Tour</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* First-time Onboarding Walkthrough */}
        <VisualizerTour />
      </div>
    </div>
  );
}