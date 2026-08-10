'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { products } from '@/data/products';

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
    <div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-lg bg-gray-100">
      <p className="text-sm text-gray-500">Loading visualizer...</p>
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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
            House of Décor
          </Link>
          <h1 className="text-sm font-medium text-gray-600">Room Visualizer</h1>
        </div>
      </header>

      {/* Main Content Area */}
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
