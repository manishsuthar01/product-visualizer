import ProductCard from '@/components/products/ProductCard';
import { products } from '@/data/products';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              H
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block">
                House of Décor
              </span>
              <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">
                Luxury Rug Visualizer
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/visualizer"
              className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all hover:shadow-indigo-500/25 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Launch Studio</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/20 mb-6">
            ✨ Interactive Room Visualizer Studio
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-tight">
            See Rugs in Your Room <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
              Before You Buy
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed">
            Experience realistic augmented visualization. Pick sample living spaces or upload your own room photo, adjust perspective & floor lighting, and find the perfect rug size for your home.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/visualizer?productId=${products[0].id}&size=${products[0].sizes[0].width}x${products[0].sizes[0].height}`}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-bold text-white shadow-lg hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95"
            >
              Try Room Visualizer Demo
            </Link>
            <a
              href="#catalog"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-7 py-3.5 text-base font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
            >
              Browse Catalog ({products.length} Rugs)
            </a>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl mb-4">
              📸
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upload Room Photo</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Upload your own living room, bedroom, or entryway photo to visualize how any rug looks in your real space.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl mb-4">
              📐
            </div>
            <h3 className="text-lg font-bold text-slate-900">Perspective & Lighting</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Fine-tune horizontal skew, vertical floor tilt, drop shadow, and opacity for realistic floor placement.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-xl mb-4">
              🖼️
            </div>
            <h3 className="text-lg font-bold text-slate-900">Before / After & Export</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Instantly toggle before and after views to compare room transformations, and download high-res PNG designs.
            </p>
          </div>
        </div>
      </section>

      {/* Rug Collection Catalog */}
      <main id="catalog" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Luxury Rug Collection
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select any rug to view details or try it live in your room
            </p>
          </div>
          <span className="mt-2 sm:mt-0 text-sm font-semibold text-indigo-600">
            {products.length} Products Available
          </span>
        </div>

        <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-semibold text-slate-700 mb-1">House of Décor — Room Visualizer Demo</p>
          <p>© 2026 House of Décor. Built with Next.js, Konva & Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
}

