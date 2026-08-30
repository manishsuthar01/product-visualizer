'use client';

import { useState, useEffect } from 'react';
import { useVisualizerStore } from '@/hooks/useVisualizer';
import { products } from '@/data/products';
import { getProduct } from './RoomVisualizer';
import {
  Move,
  Layers,
  Square,
  Paintbrush,
  Eraser,
  Wand2,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Download,
  Sliders,
  Grid,
  Compass,
  Trash2,
  Magnet,
  Eye,
  EyeOff,
  Lock,
  Undo2,
  Redo2,
  Sun,
  Sunrise,
  Sparkles,
  Columns,
  Bookmark,
  BookmarkPlus,
  Check,
  CheckCheck,
  Copy,
  Ruler,
} from 'lucide-react';

type VisualizerToolbarProps = {
  onExport: () => void;
  onCopySnapshot?: () => void;
  onClearMask: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

interface SavedScene {
  id: string;
  name: string;
  date: string;
  productId: string;
  size: { width: number; height: number };
  quadCorners: any;
  opacity: number;
  brightness: number;
  warmth: number;
  contrast: number;
  saturation: number;
  shadowOpacity: number;
  floorTextureStrength: number;
}

const STORAGE_KEY = 'hod_saved_scenes';

export default function VisualizerToolbar({
  onExport,
  onCopySnapshot,
  onClearMask,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: VisualizerToolbarProps) {
  const {
    selectedProductId,
    selectedSize,
    unitSystem,
    quadCorners,
    dispatch,
    comparisonMode,
    splitPosition,
    opacity,
    brightness,
    warmth,
    contrast,
    saturation,
    shadowOpacity,
    activeTool,
    brushSize,
    brushHardness,
    edgeSnap,
    showMaskPreview,
    preserveMask,
    floorTextureStrength,
    wandTolerance,
    wandContiguous,
  } = useVisualizerStore();

  const currentProduct = getProduct(selectedProductId || undefined);

  // Saved scenes state
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([]);
  const [newSceneName, setNewSceneName] = useState('');
  const [isSavingScene, setIsSavingScene] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  // Curated Atmospheric Lighting Profiles
  const lightingPresets = [
    {
      id: 'daylight',
      label: 'Daylight',
      icon: Sun,
      params: { warmth: 0, contrast: 6, saturation: 4, opacity: 1, shadowOpacity: 0.35, floorTextureStrength: 0.35 },
    },
    {
      id: 'golden',
      label: 'Golden Hour',
      icon: Sunrise,
      params: { warmth: 26, contrast: 14, saturation: 18, opacity: 0.95, shadowOpacity: 0.45, floorTextureStrength: 0.4 },
    },
    {
      id: 'warm',
      label: 'Warm Lamp',
      icon: Sun,
      params: { warmth: 16, contrast: 8, saturation: 6, opacity: 0.95, shadowOpacity: 0.40, floorTextureStrength: 0.35 },
    },
    {
      id: 'nordic',
      label: 'Nordic Cool',
      icon: Sparkles,
      params: { warmth: -18, contrast: -2, saturation: -10, opacity: 1, shadowOpacity: 0.25, floorTextureStrength: 0.3 },
    },
  ];

  // Load saved scenes on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedScenes(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveCurrentScene = () => {
    if (!quadCorners || !selectedProductId || !selectedSize) return;

    const nameToUse =
      newSceneName.trim() || `${currentProduct.name} (${selectedSize.width}×${selectedSize.height}')`;
    const newScene: SavedScene = {
      id: `scene-${Date.now()}`,
      name: nameToUse,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      productId: selectedProductId,
      size: selectedSize,
      quadCorners,
      opacity,
      brightness,
      warmth,
      contrast,
      saturation,
      shadowOpacity,
      floorTextureStrength,
    };

    const updated = [newScene, ...savedScenes.slice(0, 9)];
    setSavedScenes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewSceneName('');
    setIsSavingScene(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleLoadScene = (scene: SavedScene) => {
    dispatch({
      type: 'SET_PRODUCT',
      payload: { productId: scene.productId, size: scene.size },
    });
    if (scene.quadCorners) {
      dispatch({ type: 'SET_QUAD_CORNERS', payload: { corners: scene.quadCorners } });
    }
    dispatch({ type: 'SET_OPACITY', payload: { opacity: scene.opacity ?? 1 } });
    dispatch({ type: 'SET_BRIGHTNESS', payload: { brightness: scene.brightness ?? 0 } });
    dispatch({ type: 'SET_WARMTH', payload: { warmth: scene.warmth ?? 0 } });
    dispatch({ type: 'SET_CONTRAST', payload: { contrast: scene.contrast ?? 0 } });
    dispatch({ type: 'SET_SATURATION', payload: { saturation: scene.saturation ?? 0 } });
    dispatch({ type: 'SET_SHADOW_OPACITY', payload: { shadowOpacity: scene.shadowOpacity ?? 0.6 } });
    dispatch({
      type: 'SET_FLOOR_TEXTURE_STRENGTH',
      payload: { strength: scene.floorTextureStrength ?? 0.35 },
    });
  };

  const handleDeleteScene = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedScenes.filter((s) => s.id !== id);
    setSavedScenes(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      dispatch({
        type: 'SET_PRODUCT',
        payload: { productId: prod.id, size: prod.sizes[0] },
      });
    }
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [width, height] = e.target.value.split('x').map(Number);
    if (!isNaN(width) && !isNaN(height)) {
      dispatch({ type: 'SET_SIZE', payload: { width, height } });
    }
  };

  const handleResetQuad = () => {
    dispatch({ type: 'RESET_TRANSFORM' });
  };

  const handleCopyClick = () => {
    if (onCopySnapshot) {
      onCopySnapshot();
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2500);
    }
  };

  const handleApplyPreset = (preset: 'center' | 'wide' | 'deep' | 'runner') => {
    const container = document.getElementById('visualizer-container');
    const w = container ? container.offsetWidth : 800;
    const h = container ? container.offsetHeight : 600;

    let corners;
    if (preset === 'center') {
      corners = {
        topLeft: { x: w * 0.28, y: h * 0.64 },
        topRight: { x: w * 0.72, y: h * 0.64 },
        bottomRight: { x: w * 0.85, y: h * 0.93 },
        bottomLeft: { x: w * 0.15, y: h * 0.93 },
      };
    } else if (preset === 'wide') {
      corners = {
        topLeft: { x: w * 0.15, y: h * 0.60 },
        topRight: { x: w * 0.85, y: h * 0.60 },
        bottomRight: { x: w * 0.95, y: h * 0.95 },
        bottomLeft: { x: w * 0.05, y: h * 0.95 },
      };
    } else if (preset === 'deep') {
      corners = {
        topLeft: { x: w * 0.38, y: h * 0.50 },
        topRight: { x: w * 0.62, y: h * 0.50 },
        bottomRight: { x: w * 0.88, y: h * 0.94 },
        bottomLeft: { x: w * 0.12, y: h * 0.94 },
      };
    } else {
      corners = {
        topLeft: { x: w * 0.38, y: h * 0.55 },
        topRight: { x: w * 0.62, y: h * 0.55 },
        bottomRight: { x: w * 0.68, y: h * 0.95 },
        bottomLeft: { x: w * 0.32, y: h * 0.95 },
      };
    }

    dispatch({ type: 'SET_QUAD_CORNERS', payload: { corners } });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Comparison & View Switcher */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5 flex items-center justify-between">
          <span>1. View & Compare Mode</span>
          <span className="font-mono text-[10px] text-[var(--accent-gold)]">Hotkey: S</span>
        </label>
        <div className="grid grid-cols-3 gap-1 bg-[var(--bg-tertiary)]/70 p-1 rounded-lg border border-[var(--border-secondary)]">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_COMPARISON_MODE', payload: { mode: 'off' } })}
            className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all ${
              comparisonMode === 'off'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Studio Rug
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_COMPARISON_MODE', payload: { mode: 'split' } })}
            className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
              comparisonMode === 'split'
                ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Split Slider</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_COMPARISON_MODE', payload: { mode: 'toggle' } })}
            className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all ${
              comparisonMode === 'toggle'
                ? 'bg-[var(--accent-terracotta)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Original
          </button>
        </div>

        {/* Quick Position Snaps for Split Slider */}
        {comparisonMode === 'split' && (
          <div className="mt-2 flex items-center justify-between bg-[var(--bg-secondary)] p-2 rounded-md border border-[var(--border-secondary)]">
            <span className="text-[11px] text-[var(--text-secondary)]">Curtain Split:</span>
            <div className="flex gap-1">
              {[0.25, 0.5, 0.75].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_SPLIT_POSITION', payload: { position: pos } })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                    Math.abs(splitPosition - pos) < 0.05
                      ? 'bg-[var(--accent-gold)] text-[var(--bg-primary)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  {pos * 100}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive Layer Tools Selection */}
      <div data-tour="layer-tools">
        <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5">
          2. Foreground Furniture Layers
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'box' } })}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center ${
              activeTool === 'box'
                ? 'border-[var(--brand-earth)] bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-primary)]'
            }`}
          >
            <Square className="w-4 h-4 mb-1" />
            <span className="font-semibold text-[11px]">Box Cutout</span>
            <span className="text-[9px] opacity-70">Hotkey: X</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'brush' } })}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center ${
              activeTool === 'brush'
                ? 'border-[var(--brand-earth)] bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-primary)]'
            }`}
          >
            <Paintbrush className="w-4 h-4 mb-1" />
            <span className="font-semibold text-[11px]">Paint Brush</span>
            <span className="text-[9px] opacity-70">Hotkey: B</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'wand' } })}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center ${
              activeTool === 'wand'
                ? 'border-[var(--brand-earth)] bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-primary)]'
            }`}
          >
            <Wand2 className="w-4 h-4 mb-1" />
            <span className="font-semibold text-[11px]">Magic Wand</span>
            <span className="text-[9px] opacity-70">Hotkey: W</span>
          </button>
        </div>
      </div>

      {/* Magic Wand Tool Options Panel */}
      {activeTool === 'wand' && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Magic Wand Options
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
              <span>Color Tolerance</span>
              <span className="font-mono">{wandTolerance}</span>
            </div>
            <input
              type="range"
              min="5"
              max="90"
              step="1"
              value={wandTolerance}
              onChange={(e) =>
                dispatch({ type: 'SET_WAND_TOLERANCE', payload: { tolerance: parseInt(e.target.value, 10) } })
              }
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
              Lower = stricter match. Higher = selects more similar colors.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-secondary)]">
            <label className="text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
              Contiguous Fill Only
            </label>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'SET_WAND_CONTIGUOUS', payload: { contiguous: !wandContiguous } })
              }
              className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                wandContiguous
                  ? 'bg-[var(--accent-gold)]'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  wandContiguous ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            {wandContiguous
              ? 'Click furniture to select connected region of similar color. Hold Alt to subtract.'
              : 'Click furniture to select ALL matching color pixels across the entire room. Hold Alt to subtract.'}
          </p>
        </div>
      )}

      {/* Paint Brush / Eraser Tool Options Panel */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              {activeTool === 'brush' ? (
                <Paintbrush className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              ) : (
                <Eraser className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" />
              )}
              {activeTool === 'brush' ? 'Foreground Paint Brush' : 'Erase Foreground Mask'}
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
              <span>Brush Diameter</span>
              <span className="font-mono">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={brushSize}
              onChange={(e) =>
                dispatch({ type: 'SET_BRUSH_SIZE', payload: { size: parseInt(e.target.value, 10) } })
              }
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
              <span>Edge Hardness</span>
              <span className="font-mono">{brushHardness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={brushHardness}
              onChange={(e) =>
                dispatch({ type: 'SET_BRUSH_HARDNESS', payload: { hardness: parseInt(e.target.value, 10) } })
              }
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">
              0% = soft feathered edges · 100% = hard pixel edges
            </span>
          </div>

          {activeTool === 'brush' && (
            <div className="flex items-center justify-between pt-1 border-t border-[var(--border-secondary)]">
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
                <Magnet className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                Edge Snap
              </label>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_EDGE_SNAP', payload: { enabled: !edgeSnap } })}
                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  edgeSnap ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    edgeSnap ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mask Management Options */}
      {(activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'wand' || activeTool === 'box') && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Mask Options
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className={`p-1.5 rounded transition-colors ${
                  canUndo
                    ? 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer'
                    : 'text-[var(--text-muted)] cursor-not-allowed opacity-40'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
                className={`p-10 rounded transition-colors ${
                  canRedo
                    ? 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer'
                    : 'text-[var(--text-muted)] cursor-not-allowed opacity-40'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
              {showMaskPreview ? <Eye className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <EyeOff className="w-3.5 h-3.5" />}
              Show Mask Tint
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_SHOW_MASK_PREVIEW', payload: { enabled: !showMaskPreview } })}
              className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                showMaskPreview ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  showMaskPreview ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium cursor-pointer">
              <Lock className="w-3.5 h-3.5" />
              Preserve on Room Switch
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PRESERVE_MASK', payload: { enabled: !preserveMask } })}
              className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                preserveMask ? 'bg-[var(--accent-gold)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  preserveMask ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* 3. Select Rug Product & Size */}
      <div>
        <label htmlFor="rug-product" className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5">
          3. Rug Selection & Size
        </label>
        <select
          id="rug-product"
          value={currentProduct.id}
          onChange={handleProductChange}
          className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-sm focus:border-[var(--border-primary)] focus:outline-none"
        >
          {products.map((prod) => (
            <option key={prod.id} value={prod.id}>
              {prod.name} (${prod.price.toFixed(2)})
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="rug-size" className="block text-[11px] font-medium text-[var(--text-secondary)]">
            Dimensions & Scale
          </label>
          <div className="flex items-center bg-[var(--bg-tertiary)] rounded p-0.5 border border-[var(--border-secondary)]">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_UNIT_SYSTEM', payload: { unitSystem: 'imperial' } })}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                unitSystem === 'imperial' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'text-[var(--text-muted)]'
              }`}
            >
              ft
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_UNIT_SYSTEM', payload: { unitSystem: 'metric' } })}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                unitSystem === 'metric' ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)]' : 'text-[var(--text-muted)]'
              }`}
            >
              m
            </button>
          </div>
        </div>
        <select
          id="rug-size"
          value={selectedSize ? `${selectedSize.width}x${selectedSize.height}` : ''}
          onChange={handleSizeChange}
          className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-sm focus:border-[var(--border-primary)] focus:outline-none"
        >
          {currentProduct.sizes.map((size) => {
            const metricW = (size.width * 0.3048).toFixed(1);
            const metricH = (size.height * 0.3048).toFixed(1);
            const label = unitSystem === 'metric' 
              ? `${size.label} (${metricW}m × ${metricH}m)` 
              : `${size.label} (${size.width}' × ${size.height}')`;
            return (
              <option key={size.label} value={`${size.width}x${size.height}`}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* 4. Floor Alignment Presets */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            4. Perspective Presets
          </label>
          <button
            onClick={handleResetQuad}
            className="inline-flex items-center space-x-1 text-[11px] text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('center')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Center Floor</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('wide')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer"
          >
            <Move className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Wide Area</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('deep')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Deep 3D</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('runner')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Hall Runner</span>
          </button>
        </div>
        
        {/* Orientation Transformations */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'ROTATE_QUAD_90' })}
            className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] py-1.5 text-[11px] font-medium hover:border-[var(--accent-gold)]"
          >
            <RotateCw className="w-3 h-3" />
            <span>Rotate 90°</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'FLIP_QUAD_HORIZONTAL' })}
            className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] py-1.5 text-[11px] font-medium hover:border-[var(--accent-gold)]"
          >
            <FlipHorizontal className="w-3 h-3" />
            <span>Flip Mirror</span>
          </button>
        </div>
      </div>

      {/* 5. Ambient Lighting & Color Temperature Suite */}
      <div data-tour="realism-controls">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>5. Lighting & Color Suite</span>
          </label>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET_COLOR_ADJUSTMENTS' })}
            className="text-[10px] text-[var(--accent-gold)] hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="space-y-3 bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-secondary)]">
          {/* Lighting Profiles Placeholder for logic */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {lightingPresets.map((p) => (
              <button key={p.id} onClick={() => dispatch({ type: 'APPLY_LIGHTING_PRESET', payload: p.params })} className="text-[10px] py-1 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded flex items-center justify-center gap-1">
                <p.icon className="w-3 h-3 text-[var(--accent-gold)]" /> {p.label}
              </button>
            ))}
          </div>

          {/* Warmth / Color Temperature */}
          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
              <span>Color Temperature (Warmth)</span>
              <span className="font-mono">{warmth > 0 ? `+${warmth}` : warmth}</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="2"
              value={warmth}
              onChange={(e) => dispatch({ type: 'SET_WARMTH', payload: { warmth: parseInt(e.target.value, 10) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
              <span>Dynamic Contrast</span>
              <span className="font-mono">{contrast > 0 ? `+${contrast}%` : `${contrast}%`}</span>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              step="1"
              value={contrast}
              onChange={(e) => dispatch({ type: 'SET_CONTRAST', payload: { contrast: parseInt(e.target.value, 10) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
              <span>Color Vibrancy (Saturation)</span>
              <span className="font-mono">{saturation > 0 ? `+${saturation}%` : `${saturation}%`}</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="2"
              value={saturation}
              onChange={(e) =>
                dispatch({ type: 'SET_SATURATION', payload: { saturation: parseInt(e.target.value, 10) } })
              }
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
            />
          </div>

          {/* Opacity & Shadow */}
          <div className="pt-2 border-t border-[var(--border-secondary)] space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
                <span>Rug Opacity</span>
                <span className="font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => dispatch({ type: 'SET_OPACITY', payload: { opacity: parseFloat(e.target.value) } })}
                className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
                <span>Contact Floor Shadow</span>
                <span className="font-mono">{Math.round(shadowOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={shadowOpacity}
                onChange={(e) =>
                  dispatch({ type: 'SET_SHADOW_OPACITY', payload: { shadowOpacity: parseFloat(e.target.value) } })
                }
                className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Saved Design Snapshots */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>6. Saved Layout Scenes</span>
          </label>
          <button
            type="button"
            onClick={() => setIsSavingScene(!isSavingScene)}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-gold)] hover:underline cursor-pointer"
          >
            <BookmarkPlus className="w-3 h-3" />
            <span>{isSavingScene ? 'Cancel' : 'Save Scene'}</span>
          </button>
        </div>

        {isSavingScene && (
          <div className="bg-[var(--bg-tertiary)]/80 p-2.5 rounded-lg border border-[var(--border-secondary)] mb-2 space-y-2">
            <input
              type="text"
              placeholder="e.g., Living Room Layout"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              className="w-full rounded border border-[var(--border-secondary)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
            <button
              type="button"
              onClick={handleSaveCurrentScene}
              className="w-full py-1.5 rounded bg-[var(--brand-earth)] hover:bg-[var(--accent-gold)] text-[var(--bg-primary)] text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirm Save Snapshot
            </button>
          </div>
        )}

        {justSaved && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded mb-2">
            <Check className="w-3.5 h-3.5" />
            <span>Scene layout saved successfully!</span>
          </div>
        )}

        {savedScenes.length > 0 ? (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {savedScenes.map((scene) => (
              <div
                key={scene.id}
                onClick={() => handleLoadScene(scene)}
                className="group flex items-center justify-between p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-all"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-gold)]">
                    {scene.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    {scene.size.width}×{scene.size.height}&apos; · {scene.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteScene(scene.id, e)}
                  title="Delete Snapshot"
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] italic">
            No saved scenes yet. Align your rug and click &quot;Save Scene&quot; to bookmark anytime.
          </p>
        )}
      </div>

      {/* Export & Primary Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
        <button
          onClick={onExport}
          type="button"
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-[var(--brand-earth)] px-3 py-2.5 text-xs font-semibold text-[var(--bg-primary)] shadow hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors cursor-pointer active:scale-98"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export 2× High-Resolution PNG</span>
        </button>

        {onCopySnapshot && (
          <button
            onClick={handleCopyClick}
            type="button"
            className="flex w-full items-center justify-center space-x-2 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer active:scale-98"
          >
            {justCopied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Copy Snapshot to Clipboard</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}