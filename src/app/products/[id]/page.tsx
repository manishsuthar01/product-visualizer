import { notFound } from 'next/navigation';
import { products } from '@/data/products';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <Link href="/" className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              H
            </Link>
            <div>
              <Link href="/" className="text-xl font-bold tracking-tight text-slate-900 block hover:text-indigo-600 transition-colors">
                House of Décor
              </Link>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← Back to Catalog
            </Link>
            <Link
              href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
              className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95"
            >
              <span>Visualizer Studio</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          {/* Product Image Stage */}
          <div className="relative h-[450px] w-full overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200/80 shadow-lg group">
            <Image
              src={product.image}
              alt={product.name}
              fill
              style={{ objectFit: 'contain' }}
              className="p-8 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow">
              Premium Hand-Knotted
            </div>
          </div>

          {/* Product Info & Visualizer CTA */}
          <div className="space-y-8">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">
                Luxury Rug Collection
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{product.name}</h1>
              <p className="mt-3 text-3xl font-extrabold text-slate-900">${product.price.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Description</h3>
              <p className="text-slate-600 leading-relaxed text-base">{product.description}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Available Dimensions</h3>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((size) => (
                  <Link
                    key={size.label}
                    href={`/visualizer?productId=${product.id}&size=${size.width}x${size.height}`}
                    className="group flex items-center space-x-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    <span>{size.label}</span>
                    <span className="text-xs text-slate-400 group-hover:text-indigo-500">
                      ({size.width}' × {size.height}')
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Launch Visualizer CTA */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Link
                href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
                className="flex w-full items-center justify-center space-x-3 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-xl hover:bg-indigo-700 hover:shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>View Rug in Your Room</span>
              </Link>
              
              <p className="text-center text-xs text-slate-500">
                Upload your room photo or test with our sample rooms live in Studio
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © 2026 House of Décor. Demo purpose only.
      </footer>
    </div>
  );
}

