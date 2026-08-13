import ProductCard from '@/components/products/ProductCard';
import { products } from '@/data/products';
import Link from 'next/link';
import { Sparkles, UploadCloud, SlidersHorizontal, Eye, ArrowRight, Layers, Grid } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-secondary)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-earth)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-base shadow-sm">
              H
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[var(--text-primary)] block">
                House of Décor
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium tracking-wider uppercase block">
                Professional Visualizer Suite
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/visualizer"
              className="inline-flex items-center space-x-2 rounded-lg bg-[var(--brand-earth)] px-4 py-2 text-xs font-semibold text-[var(--bg-primary)] shadow-sm hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Launch Visualizer Studio</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--bg-secondary)] via-[var(--bg-tertiary)] to-[var(--bg-primary)] text-[var(--text-primary)] py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-secondary)]">
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center space-x-2 rounded-full bg-[var(--bg-primary)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-gold)] border border-[var(--border-secondary)] mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>3D Floor Perspective & CAD Depth Engine</span>
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-[var(--text-primary)] leading-tight">
            Visualize Luxury Rugs <br className="hidden sm:inline" />
            <span className="text-[var(--accent-gold)] font-serif italic">
              In Real Space Perspective
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--text-secondary)] leading-relaxed font-normal">
            Enterprise room visualizer suite. Select high-end rug designs, upload custom interior photography, align perspective quads, and render realistic floor blend simulations.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/visualizer?productId=${products[0].id}&size=${products[0].sizes[0].width}x${products[0].sizes[0].height}`}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-lg bg-[var(--brand-earth)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] shadow-md hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
            >
              <span>Open Studio Visualizer</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#catalog"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            >
              <Grid className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Browse Catalog ({products.length})</span>
            </a>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-secondary)] shadow-sm hover:border-[var(--border-primary)] transition-all">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--accent-gold)] flex items-center justify-center mb-4">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Custom Room Photography</h3>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              Upload client living room or commercial interior photography to render high-resolution rug placement in actual rooms.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-secondary)] shadow-sm hover:border-[var(--border-primary)] transition-all">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--accent-gold)] flex items-center justify-center mb-4">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">CAD 4-Corner Alignment</h3>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              Precision perspective warping, horizontal skewing, contact floor shadow controls, and auto-darken depth layer extraction.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-secondary)] shadow-sm hover:border-[var(--border-primary)] transition-all">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] text-[var(--accent-gold)] flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Object Layering & Export</h3>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              Extract coffee table legs or furniture above the rug using box cutouts or smart brushes, then export high-resolution PNGs.
            </p>
          </div>
        </div>
      </section>

      {/* Rug Collection Catalog */}
      <main id="catalog" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[var(--border-secondary)]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Rug Catalog & Specification
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Select any design to inspect product specifications or launch direct visualization studio mode
            </p>
          </div>
          <span className="mt-2 sm:mt-0 text-xs font-semibold text-[var(--accent-gold)] font-mono">
            {products.length} Products Available
          </span>
        </div>

        <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)] py-10 text-center text-xs text-[var(--text-muted)]">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-semibold text-[var(--text-primary)] mb-1">House of Décor — Floor Visualizer Studio</p>
          <p>© 2026 House of Décor. Built with Next.js, HTML5 Canvas 2D & Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
}



