'use client';

import { useVisualizerStore } from '@/hooks/useVisualizer';
import { products } from '@/data/products';
import { getProduct } from './RoomVisualizer';

type VisualizerToolbarProps = {
  onExport: () => void;
};

export default function VisualizerToolbar({ onExport }: VisualizerToolbarProps) {
  const {
    selectedProductId,
    selectedSize,
    dispatch,
    showOriginal,
    opacity,
    shadowOpacity,
    quadCorners,
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
      // Runner / Narrow
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
    <div className="space-y-6">
      {/* 2. Select Rug Product */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-2">
          2. Choose Rug Design
        </h3>
        <select
          id="rug-product"
          value={currentProduct.id}
          onChange={handleProductChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        <label htmlFor="rug-size" className="block text-xs font-semibold text-gray-600 mb-1">
          Rug Dimensions
        </label>
        <select
          id="rug-size"
          value={selectedSize ? `${selectedSize.width}x${selectedSize.height}` : ''}
          onChange={handleSizeChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {currentProduct.sizes.map((size) => (
            <option key={size.label} value={`${size.width}x${size.height}`}>
              {size.label} ({size.width}' × {size.height}')
            </option>
          ))}
        </select>
      </div>

      {/* 3. 3D Floor Perspective Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">
            3. Floor Presets
          </h3>
          <button
            onClick={handleResetQuad}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            Reset Corners
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleApplyPreset('center')}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors text-left"
          >
            📍 Center Floor
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('wide')}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors text-left"
          >
            ↔️ Wide Area
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('deep')}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors text-left"
          >
            ↗️ Deep Room
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('runner')}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors text-left"
          >
            🚶 Hallway Runner
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          💡 You can also drag the 4 corner handles directly on the canvas to match any floor angle!
        </p>
      </div>

      {/* 4. Floor Lighting & Blending */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-2">
          4. Floor Lighting & Depth
        </h3>
        <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1 font-medium">
              <span>Texture Blend / Opacity</span>
              <span>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => dispatch({ type: 'SET_OPACITY', payload: { opacity: parseFloat(e.target.value) } })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1 font-medium">
              <span>Contact Floor Shadow</span>
              <span>{Math.round(shadowOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={shadowOpacity}
              onChange={(e) => dispatch({ type: 'SET_SHADOW_OPACITY', payload: { shadowOpacity: parseFloat(e.target.value) } })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={handleToggleBeforeAfter}
          type="button"
          className={`flex w-full items-center justify-center space-x-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm ${
            showOriginal
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{showOriginal ? 'Showing Before (Original)' : 'Toggle Before / After'}</span>
        </button>

        <button
          onClick={onExport}
          type="button"
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download High-Res PNG</span>
        </button>
      </div>
    </div>
  );
}