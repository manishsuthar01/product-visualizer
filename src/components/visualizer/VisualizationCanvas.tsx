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
    dispatch,
  } = useVisualizerStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentProduct = getProduct(selectedProductId || undefined);
  const rugImageUrl = currentProduct.image as string;

  const [rugImageKonva] = useImage(rugImageUrl, 'anonymous');
  const [roomImageKonva] = useImage(roomImage || '', 'anonymous');

  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [activeCorner, setActiveCorner] = useState<keyof QuadCorners | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<keyof QuadCorners | null>(null);

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

      // Find current room in sampleRooms for pre-tuned 3D floor quad
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
        // Default floor quad in lower 35% of room (3D perspective trapezoid)
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

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Room Background Image
    if (roomImageKonva) {
      ctx.drawImage(roomImageKonva, 0, 0, canvas.width, canvas.height);
    }

    // 2. Draw 3D Perspective Rug & Contact Floor Shadow
    if (rugImageKonva && quadCorners && !showOriginal) {
      // Draw Floor Contact Shadow
      drawQuadShadow(ctx, quadCorners, shadowOpacity);

      // Draw 3D Perspective Rug Quad
      drawPerspectiveQuad(ctx, rugImageKonva, quadCorners, 16, opacity);

      // 3. Draw Quad Outline & 4-Corner Interactive Handles
      drawQuadHandles(ctx, quadCorners, hoveredCorner, activeCorner);
    }
  }, [roomImageKonva, rugImageKonva, quadCorners, opacity, shadowOpacity, showOriginal, hoveredCorner, activeCorner]);

  // Helper: Draw quad bounding lines and 4 interactive corner handle circles
  const drawQuadHandles = (
    ctx: CanvasRenderingContext2D,
    corners: QuadCorners,
    hovered: keyof QuadCorners | null,
    active: keyof QuadCorners | null
  ) => {
    const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = corners;

    // Outer Connecting Lines
    ctx.save();
    ctx.strokeStyle = '#6366f1'; // Indigo-500
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.stroke();

    // Render Corner Handles
    const handleList: { key: keyof QuadCorners; point: Point2D; label: string }[] = [
      { key: 'topLeft', point: tl, label: 'Top-Left' },
      { key: 'topRight', point: tr, label: 'Top-Right' },
      { key: 'bottomRight', point: br, label: 'Bottom-Right' },
      { key: 'bottomLeft', point: bl, label: 'Bottom-Left' },
    ];

    for (const h of handleList) {
      const isSelected = active === h.key || hovered === h.key;
      const radius = isSelected ? 12 : 9;

      // Glow / Ring
      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.3)';
      ctx.fill();

      // Outer Handle Circle
      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#4f46e5' : '#ffffff';
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Inner Dot
      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#ffffff' : '#4f46e5';
      ctx.fill();
    }

    ctx.restore();
  };

  // Hit-testing corner handles (radius ~22px)
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

  // Canvas Mouse Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const hit = getCornerAtPos(mousePos);
    if (hit) {
      setActiveCorner(hit);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (activeCorner) {
      // Clamp coordinates to canvas bounds
      const clampedX = Math.max(0, Math.min(containerSize.width, mousePos.x));
      const clampedY = Math.max(0, Math.min(containerSize.height, mousePos.y));

      dispatch({
        type: 'UPDATE_QUAD_CORNER',
        payload: { corner: activeCorner, x: clampedX, y: clampedY },
      });
    } else {
      const hit = getCornerAtPos(mousePos);
      setHoveredCorner(hit);
    }
  };

  const handleMouseUp = () => {
    setActiveCorner(null);
  };

  // Canvas Touch Event Handlers for Mobile Devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showOriginal || !quadCorners || e.touches.length === 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    const hit = getCornerAtPos(pos);
    if (hit) {
      setActiveCorner(hit);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!activeCorner || showOriginal || !quadCorners || e.touches.length === 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    const pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    const clampedX = Math.max(0, Math.min(containerSize.width, pos.x));
    const clampedY = Math.max(0, Math.min(containerSize.height, pos.y));

    dispatch({
      type: 'UPDATE_QUAD_CORNER',
      payload: { corner: activeCorner, x: clampedX, y: clampedY },
    });
  };

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create offscreen canvas for clean export without handle indicators
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
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <p className="text-gray-600">
          No product selected. Please return to the{' '}
          <Link href="/" className="text-indigo-600 font-semibold underline">
            homepage catalog
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] overflow-hidden">
      {/* Sidebar Controls */}
      <aside className="w-full lg:w-88 bg-white p-5 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Visualizer Studio</h2>
            <p className="text-xs text-gray-500">3D Floor Perspective & Alignment</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            3D Floor Warp
          </span>
        </div>

        <RoomSelector />
        <VisualizerToolbar onExport={handleExport} />
      </aside>

      {/* Canvas Studio Area */}
      <div
        ref={containerRef}
        id="visualizer-container"
        className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden min-h-[500px]"
      >
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
          className={`shadow-2xl ${
            activeCorner ? 'cursor-grabbing' : hoveredCorner ? 'cursor-grab' : 'cursor-crosshair'
          }`}
        />

        {/* Floating Instruction Banner */}
        {quadCorners && !showOriginal && (
          <div className="absolute top-4 right-4 pointer-events-none flex items-center space-x-2 bg-slate-900/85 text-white backdrop-blur-md px-3.5 py-2 rounded-full text-xs font-medium border border-white/10 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
            <span>Drag 4 Corner Handles on the floor to match room perspective</span>
          </div>
        )}

        {showOriginal && (
          <div className="absolute top-4 right-4 pointer-events-none bg-amber-500/90 text-white backdrop-blur-md px-3.5 py-2 rounded-full text-xs font-bold shadow-lg">
            BEFORE (Original Room)
          </div>
        )}
      </div>
    </div>
  );
}