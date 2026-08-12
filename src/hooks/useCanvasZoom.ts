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
