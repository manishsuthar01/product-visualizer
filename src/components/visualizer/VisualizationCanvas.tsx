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
import {
  Move,
  Square,
  Paintbrush,
  Eraser,
  Sparkles,
  Eye,
  Download,
  Info,
  Maximize2,
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
    maskThreshold,
    darkenOpacity,
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

  // Initialize offscreen mask canvas
  useEffect(() => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    maskCanvasRef.current.width = containerSize.width;
    maskCanvasRef.current.height = containerSize.height;
  }, [containerSize]);

  // Clear mask canvas helper
  const clearMask = useCallback(() => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, mask.width, mask.height);
    }
  }, []);

  // Clear mask when room changes
  useEffect(() => {
    clearMask();
  }, [roomImage, clearMask]);

  // Apply Table Box Cutout with 100% straight clean edges
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

  // Sample average floor color from room image inside the floor quad
  const getFloorColor = useCallback(() => {
    if (!roomImageKonva) return { r: 160, g: 150, b: 140 };

    const width = containerSize.width;
    const height = containerSize.height;
    if (width <= 0 || height <= 0) return { r: 160, g: 150, b: 140 };

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = width;
    sampleCanvas.height = height;
    const sCtx = sampleCanvas.getContext('2d');
    if (!sCtx) return { r: 160, g: 150, b: 140 };

    sCtx.drawImage(roomImageKonva, 0, 0, width, height);

    let sampleX = Math.round(width * 0.5);
    let sampleY = Math.round(height * 0.8);
    if (quadCorners) {
      sampleX = Math.round((quadCorners.topLeft.x + quadCorners.topRight.x + quadCorners.bottomRight.x + quadCorners.bottomLeft.x) / 4);
      sampleY = Math.round((quadCorners.topLeft.y + quadCorners.topRight.y + quadCorners.bottomRight.y + quadCorners.bottomLeft.y) / 4);
    }

    const startX = Math.max(0, sampleX - 15);
    const startY = Math.max(0, sampleY - 15);
    const sampleData = sCtx.getImageData(startX, startY, 30, 30).data;

    let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;
    for (let i = 0; i < sampleData.length; i += 4) {
      rTotal += sampleData[i];
      gTotal += sampleData[i + 1];
      bTotal += sampleData[i + 2];
      count++;
    }
    return {
      r: Math.round(rTotal / count),
      g: Math.round(gTotal / count),
      b: Math.round(bTotal / count),
    };
  }, [roomImageKonva, quadCorners, containerSize]);

  // Apply Smart Floor-Keyed Furniture Extractor Brush with Soft Feathering
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
      const maskImgData = maskCtx.getImageData(minX, minY, bboxW, bboxH);
      const maskPixels = maskImgData.data;

      // Gentle Soft Eraser Mode
      if (activeTool === 'eraser') {
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
              const falloff = Math.max(0, 1 - minDist / radius);
              const eraseAmount = Math.round(180 * falloff);
              maskPixels[idx + 3] = Math.max(0, maskPixels[idx + 3] - eraseAmount);
            }
          }
        }
        maskCtx.putImageData(maskImgData, minX, minY);
        return;
      }

      // Smooth Edge-Preserving Smart Extractor Brush Mode
      if (activeTool === 'brush') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        tempCtx.drawImage(roomImageKonva, 0, 0, width, height);

        const roomImgData = tempCtx.getImageData(minX, minY, bboxW, bboxH);
        const roomPixels = roomImgData.data;
        const floorCol = getFloorColor();

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
              const r = roomPixels[idx];
              const g = roomPixels[idx + 1];
              const b = roomPixels[idx + 2];

              const colorDist = Math.sqrt(
                (r - floorCol.r) ** 2 +
                (g - floorCol.g) ** 2 +
                (b - floorCol.b) ** 2
              );

              // Smooth feathering from center to brush edge
              const minDist = Math.sqrt(minDistSq);
              const falloff = Math.max(0, 1 - minDist / radius);
              const softAlpha = Math.round(255 * Math.pow(falloff, 0.7));

              if (colorDist >= maskThreshold) {
                maskPixels[idx] = r;
                maskPixels[idx + 1] = g;
                maskPixels[idx + 2] = b;
                maskPixels[idx + 3] = Math.max(maskPixels[idx + 3], softAlpha);
              }
            }
          }
        }

        maskCtx.putImageData(maskImgData, minX, minY);
      }
    },
    [roomImageKonva, brushSize, activeTool, containerSize, maskThreshold, getFloorColor]
  );

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Room Background Image
    if (roomImageKonva) {
      ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
    }

    // 2. Draw 3D Perspective Rug & Contact Floor Shadow
    if (rugImageKonva && quadCorners && !showOriginal) {
      drawQuadShadow(ctx, quadCorners, shadowOpacity);
      drawPerspectiveQuad(ctx, rugImageKonva, quadCorners, 16, opacity);

      // 3A. Draw Auto Darken Layer (Clipped to Floor Area so Rug stays bright and vibrant!)
      if (activeTool === 'darken' && roomImageKonva && quadCorners) {
        const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = quadCorners;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tl.x - 20, tl.y - 40);
        ctx.lineTo(tr.x + 20, tr.y - 40);
        ctx.lineTo(br.x + 40, br.y + 40);
        ctx.lineTo(bl.x - 40, bl.y + 40);
        ctx.closePath();
        ctx.clip();

        ctx.globalCompositeOperation = 'darken';
        ctx.globalAlpha = darkenOpacity;
        ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // 3B. Draw Foreground Mask Overlay (Furniture / Box Cutouts sitting ON TOP of rug)
      if (maskCanvasRef.current) {
        ctx.drawImage(maskCanvasRef.current, 0, 0);
      }

      // 4. Draw Quad Handles, Box Cutout Preview, or Brush Ring Cursor
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
    darkenOpacity,
    mousePos,
    isMouseDown,
    boxStart,
    boxCurrent,
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
      setBoxStart(pos);
      setBoxCurrent(pos);
    } else if (activeTool === 'brush' || activeTool === 'eraser') {
      applyBrushSegment(pos, pos);
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
      setBoxStart(pos);
      setBoxCurrent(pos);
    } else if (activeTool === 'brush' || activeTool === 'eraser') {
      applyBrushSegment(pos, pos);
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
  }, [currentProduct.id, roomImageKonva, rugImageKonva, quadCorners, showOriginal, opacity, shadowOpacity]);

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
        <VisualizerToolbar onExport={handleExport} onClearMask={clearMask} />
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
            title="Auto Darken Depth Layer"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'darken' } })}
            className={`p-2 rounded flex items-center space-x-1.5 font-medium transition-colors ${
              activeTool === 'darken' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Blend</span>
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
            title="Smart Edge Brush"
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
              : 'cursor-none'
          }`}
        />

        {/* Floating Tool Status Indicator */}
        {quadCorners && !showOriginal && (
          <div className="absolute bottom-4 right-4 pointer-events-none flex items-center space-x-2 bg-[var(--bg-secondary)]/90 text-[var(--text-primary)] backdrop-blur-md px-3 py-1.5 rounded-md text-[11px] font-medium border border-[var(--border-secondary)] shadow-sm">
            <Info className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            {activeTool === 'corners' && <span>Drag 4 Corner handles to match floor perspective</span>}
            {activeTool === 'darken' && <span>Auto darkening active - preserves object depth</span>}
            {activeTool === 'box' && <span>Drag box over coffee table or bench to extract clean edges</span>}
            {activeTool === 'brush' && <span>Paint table legs to render them above the rug</span>}
            {activeTool === 'eraser' && <span>Paint over cutout areas to erase layer mask</span>}
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