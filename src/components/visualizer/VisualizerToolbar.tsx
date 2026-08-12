'use client';

import { useVisualizerStore } from '@/hooks/useVisualizer';
import { products } from '@/data/products';
import { getProduct } from './RoomVisualizer';
import {
  Move,
  Sparkles,
  Square,
  Paintbrush,
  Eraser,
  RotateCcw,
  Eye,
  Download,
  Sliders,
  Sun,
  Grid,
  Compass,
  Trash2,
} from 'lucide-react';

type VisualizerToolbarProps = {
  onExport: () => void;
  onClearMask: () => void;
};

export default function VisualizerToolbar({ onExport, onClearMask }: VisualizerToolbarProps) {
  const {
    selectedProductId,
    selectedSize,
    dispatch,
    showOriginal,
    opacity,
    shadowOpacity,
    activeTool,
    brushSize,
    darkenOpacity,
    maskThreshold,
  } = useVisualizerStore();

  const currentProduct = getProduct(selectedProductId || undefined);

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

  const handleToggleBeforeAfter = () => {
    dispatch({ type: 'TOGGLE_BEFORE_AFTER' });
  };

  return (
    <div className="space-y-5 text-[var(--text-primary)]">
      {/* 2. Interactive Studio Tools Selector */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-2">
          2. Object & Layer Tools
        </label>
        
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)] mb-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'corners' } })}
            className={`flex flex-col items-center py-2 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'corners'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Move className="w-4 h-4 mb-1" />
            <span>Corner Align</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'darken' } })}
            className={`flex flex-col items-center py-2 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'darken'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-1" />
            <span>Auto Blend</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'box' } })}
            className={`flex flex-col items-center py-2 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'box'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Square className="w-4 h-4 mb-1" />
            <span>Box Cutout</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)]">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'brush' } })}
            className={`flex flex-col items-center py-1.5 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'brush'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5 mb-0.5" />
            <span>Smart Brush</span>
          </button>

          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: { tool: 'eraser' } })}
            className={`flex flex-col items-center py-1.5 px-1 rounded text-[11px] font-medium transition-all ${
              activeTool === 'eraser'
                ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5 mb-0.5" />
            <span>Erase Mask</span>
          </button>
        </div>
      </div>

      {/* Auto Darken Tool Options Panel */}
      {activeTool === 'darken' && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Depth Blend Layer
            </span>
            <span className="text-[11px] font-mono font-medium text-[var(--text-secondary)]">
              {Math.round(darkenOpacity * 100)}%
            </span>
          </div>

          <div>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={darkenOpacity}
              onChange={(e) => dispatch({ type: 'SET_DARKEN_OPACITY', payload: { opacity: parseFloat(e.target.value) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            Preserves table legs, shadows, and furniture structure seamlessly over the rug quad.
          </p>
        </div>
      )}

      {/* Table Box Cutout Tool Options Panel */}
      {activeTool === 'box' && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Rectangular Box Mask
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
            Click and drag a rectangular region over furniture to extract sharp 90° edges above the floor rug layer.
          </p>
        </div>
      )}

      {/* Smart Brush Tool Options Panel */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="bg-[var(--bg-tertiary)]/70 p-3 rounded-lg border border-[var(--border-secondary)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              {activeTool === 'brush' ? <Paintbrush className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <Eraser className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" />}
              {activeTool === 'brush' ? 'Edge Extraction Brush' : 'Erase Cutout Mask'}
            </span>
            <button
              type="button"
              onClick={onClearMask}
              className="text-[11px] font-medium text-[var(--accent-terracotta)] hover:underline flex items-center gap-1"
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
              onChange={(e) => dispatch({ type: 'SET_BRUSH_SIZE', payload: { size: parseInt(e.target.value, 10) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
            />
          </div>

          {activeTool === 'brush' && (
            <div>
              <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                <span>Keying Sensitivity</span>
                <span className="font-mono">{maskThreshold}</span>
              </div>
              <input
                type="range"
                min="10"
                max="75"
                step="5"
                value={maskThreshold}
                onChange={(e) => dispatch({ type: 'SET_MASK_THRESHOLD', payload: { threshold: parseInt(e.target.value, 10) } })}
                className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-secondary)] rounded-lg appearance-none"
              />
              <span className="text-[10px] text-[var(--text-muted)] block mt-1">
                Higher sensitivity isolates fine metal legs from background floor color.
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Select Rug Product */}
      <div>
        <label htmlFor="rug-product" className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5">
          3. Select Rug Model
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

      {/* Select Rug Size */}
      <div>
        <label htmlFor="rug-size" className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
          Dimensions & Scale
        </label>
        <select
          id="rug-size"
          value={selectedSize ? `${selectedSize.width}x${selectedSize.height}` : ''}
          onChange={handleSizeChange}
          className="w-full rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-sm focus:border-[var(--border-primary)] focus:outline-none"
        >
          {currentProduct.sizes.map((size) => (
            <option key={size.label} value={`${size.width}x${size.height}`}>
              {size.label} ({size.width}' × {size.height}')
            </option>
          ))}
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
            className="inline-flex items-center space-x-1 text-[11px] text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Quad</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('center')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Grid className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Center Floor</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('wide')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Move className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Wide Area</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('deep')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Compass className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Deep Perspective</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('runner')}
            className="flex items-center space-x-2 rounded-md border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Hallway Runner</span>
          </button>
        </div>
      </div>

      {/* 5. Floor Lighting & Depth */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider block mb-1.5">
          5. Lighting & Shadows
        </label>
        <div className="space-y-3 bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-secondary)]">
          <div>
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1 font-medium">
              <span>Texture Blend / Opacity</span>
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
              onChange={(e) => dispatch({ type: 'SET_SHADOW_OPACITY', payload: { shadowOpacity: parseFloat(e.target.value) } })}
              className="w-full accent-[var(--accent-gold)] cursor-pointer h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Studio Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
        <button
          onClick={handleToggleBeforeAfter}
          type="button"
          className={`flex w-full items-center justify-center space-x-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            showOriginal
              ? 'border-[var(--accent-terracotta)] bg-[var(--accent-terracotta)]/15 text-[var(--accent-terracotta)]'
              : 'border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-primary)]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showOriginal ? 'Showing Before (Original)' : 'Toggle Compare View'}</span>
        </button>

        <button
          onClick={onExport}
          type="button"
          className="flex w-full items-center justify-center space-x-2 rounded-md bg-[var(--brand-earth)] px-3 py-2.5 text-xs font-semibold text-[var(--bg-primary)] shadow hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Render PNG</span>
        </button>
      </div>
    </div>
  );
}