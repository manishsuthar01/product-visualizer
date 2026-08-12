import { notFound } from 'next/navigation';
import { products } from '@/data/products';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Eye, Check, ShieldCheck, SlidersHorizontal } from 'lucide-react';

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductPage({ params }: Params) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);

  if (!product) {
    return notFound();
  }

  const defaultSize = product.sizes[0];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-secondary)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <Link href="/" className="w-8 h-8 rounded-lg bg-[var(--brand-earth)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-base shadow-sm">
              H
            </Link>
            <div>
              <Link href="/" className="text-base font-bold tracking-tight text-[var(--text-primary)] block hover:text-[var(--accent-gold)] transition-colors">
                House of Décor
              </Link>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center space-x-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Catalog</span>
            </Link>
            <Link
              href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
              className="inline-flex items-center space-x-2 rounded-lg bg-[var(--brand-earth)] px-4 py-2 text-xs font-semibold text-[var(--bg-primary)] shadow-sm hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Launch Studio Mode</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          {/* Product Image Stage */}
          <div className="relative h-[480px] w-full overflow-hidden rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] shadow-lg group">
            <Image
              src={product.image}
              alt={product.name}
              fill
              style={{ objectFit: 'contain' }}
              className="p-8 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 left-4 bg-[var(--brand-earth)]/90 backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-semibold text-[var(--bg-primary)] border border-[var(--accent-gold)]/30 shadow flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              Hand-Knotted Luxury Collection
            </div>
          </div>

          {/* Product Info & Visualizer CTA */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold text-[var(--accent-gold)] uppercase tracking-widest block mb-1">
                Rug Specifications & Dimensions
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">{product.name}</h1>
              <p className="mt-2 text-2xl font-bold font-mono text-[var(--text-primary)]">${product.price.toFixed(2)}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Description</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">{product.description}</p>
            </div>

            <div className="space-y-3 pt-2 border-t border-[var(--border-secondary)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Available Sizes</h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Link
                    key={size.label}
                    href={`/visualizer?productId=${product.id}&size=${size.width}x${size.height}`}
                    className="group flex items-center space-x-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-all shadow-sm"
                  >
                    <span>{size.label}</span>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono group-hover:text-[var(--accent-gold)]">
                      ({size.width}' × {size.height}')
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Launch Visualizer CTA */}
            <div className="space-y-3 pt-4 border-t border-[var(--border-secondary)]">
              <Link
                href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
                className="flex w-full items-center justify-center space-x-2.5 rounded-xl bg-[var(--brand-earth)] px-6 py-3.5 text-sm font-semibold text-[var(--bg-primary)] shadow-md hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>Simulate Rug in Studio Visualizer</span>
              </Link>
              
              <p className="text-center text-[11px] text-[var(--text-muted)]">
                Upload room photo or test inside preset environment spaces
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)] py-8 text-center text-xs text-[var(--text-muted)]">
        © 2026 House of Décor. Floor Visualizer Studio Engine.
      </footer>
    </div>
  );
}



