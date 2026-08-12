'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { products } from '@/data/products';
import { Layers, ArrowLeft, SlidersHorizontal, ShieldCheck } from 'lucide-react';

// Dynamically import the visualization canvas (Konva) only on the client
const VisualizationCanvas = dynamic(
  () => import('./VisualizationCanvas'),
  { ssr: false, loading: () => <CanvasSkeleton /> }
);

type RoomVisualizerProps = {
  searchParams: {
    productId?: string;
    size?: string;
  };
};

function CanvasSkeleton() {
  return (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)]">
      <div className="flex items-center space-x-2 text-xs">
        <div className="w-4 h-4 rounded-full border-2 border-[var(--accent-gold)] border-t-transparent animate-spin"></div>
        <span>Initializing Studio Engine...</span>
      </div>
    </div>
  );
}

export default function RoomVisualizer({ searchParams }: RoomVisualizerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse initial size from URL params, e.g. "5x8" -> { width: 5, height: 8 }
  const initialSize = (() => {
    const sizeParam = searchParams.size;
    if (!sizeParam) return null;
    const parts = sizeParam.split('x');
    if (parts.length !== 2) return null;
    const w = parseInt(parts[0], 10);
    const h = parseInt(parts[1], 10);
    if (isNaN(w) || isNaN(h)) return null;
    return { width: w, height: h };
  })();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Studio Header Bar */}
      <header className="border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)]/90 backdrop-blur-md px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Catalog</span>
            </Link>
            <div className="h-4 w-px bg-[var(--border-secondary)]"></div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-[var(--brand-earth)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-xs">
                H
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                House of Décor
              </span>
              <span className="text-[var(--text-muted)] text-xs">/</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Floor Visualizer Studio
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[11px] font-medium text-[var(--text-primary)]">
              <ShieldCheck className="w-3 h-3 text-[var(--accent-gold)]" />
              <span>CAD Engine Ready</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio Canvas & Inspector Area */}
      <main className="flex-1">
        {mounted && (
          <VisualizationCanvas
            initialProductId={searchParams.productId}
            initialSize={initialSize}
          />
        )}
        {!mounted && <CanvasSkeleton />}
      </main>
    </div>
  );
}

// Helper: find a product by ID
export function getProduct(id: string | undefined) {
  if (!id) return products[0];
  return products.find((p) => p.id === id) || products[0];
}


