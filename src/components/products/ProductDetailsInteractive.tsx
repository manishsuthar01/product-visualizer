'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/data/products';
import { useFavorites } from '@/hooks/useFavorites';
import { Eye, Check, Copy, Share2, Sparkles, CheckCircle2, Heart } from 'lucide-react';

interface ProductDetailsInteractiveProps {
  product: Product;
}

export default function ProductDetailsInteractive({ product }: ProductDetailsInteractiveProps) {
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [sharedLink, setSharedLink] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(product.id);

  const currentSize = product.sizes[selectedSizeIndex] || product.sizes[0];

  const handleCopySpecs = async () => {
    const wMetric = (currentSize.width * 0.3048).toFixed(1);
    const hMetric = (currentSize.height * 0.3048).toFixed(1);
    const text = `✨ ${product.name}
Collection: ${product.category || 'Luxury Decor'}
Selected Size: ${currentSize.label} (${currentSize.width}' × ${currentSize.height}' / ${wMetric}m × ${hMetric}m)
Material: ${product.material || 'Authentic Premium Wool'}
Price: $${product.price.toFixed(2)}
House of Décor — Floor Visualizer Studio`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSpec(true);
      setTimeout(() => setCopiedSpec(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${product.name} — House of Décor`,
            text: product.description,
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          setSharedLink(true);
          setTimeout(() => setSharedLink(false), 2500);
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-[var(--accent-gold)] uppercase tracking-widest block">
            {product.category || 'Luxury Collection'} · Artisan Specification
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              title={favorited ? "Remove from wishlist" : "Add to wishlist"}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                favorited
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-secondary)] hover:border-rose-400 text-[var(--text-secondary)] hover:text-rose-500'
              }`}
            >
              <Heart className={`w-3 h-3 ${favorited ? 'fill-rose-600' : ''}`} />
              <span>{favorited ? 'Saved' : 'Wishlist'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopySpecs}
              title="Copy Spec Sheet"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:border-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {copiedSpec ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Spec Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-[var(--accent-gold)]" />
                  <span>Copy Specs</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              title="Share Rug"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:border-[var(--accent-gold)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {sharedLink ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3 text-[var(--accent-gold)]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">{product.name}</h1>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">${product.price.toFixed(2)}</span>
          <span className="text-xs text-[var(--text-muted)] font-medium">Free insured freight & 30-day in-home trial</span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
        <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Description</h3>
        <p className="text-[var(--text-secondary)] leading-relaxed text-sm">{product.description}</p>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-secondary)]">
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Material</span>
          <span className="text-xs font-medium text-[var(--text-primary)] mt-0.5 block">{product.material || '100% Fine Handspun Wool'}</span>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Construction</span>
          <span className="text-xs font-medium text-[var(--text-primary)] mt-0.5 block">Hand-Knotted Artisan Weave</span>
        </div>
      </div>

      {/* Size Selector with Unit Toggle */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-secondary)]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Available Sizes</h3>
          <div className="flex items-center bg-[var(--bg-secondary)] rounded-md p-0.5 border border-[var(--border-secondary)]">
            <button
              type="button"
              onClick={() => setUnitSystem('imperial')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                unitSystem === 'imperial'
                  ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Feet (ft)
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem('metric')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                unitSystem === 'metric'
                  ? 'bg-[var(--brand-earth)] text-[var(--bg-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Metric (m / cm)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {product.sizes.map((size, idx) => {
            const isSelected = selectedSizeIndex === idx;
            const metricW = (size.width * 0.3048).toFixed(1);
            const metricH = (size.height * 0.3048).toFixed(1);
            const area = unitSystem === 'metric'
              ? `${(size.width * size.height * 0.092903).toFixed(1)} m²`
              : `${size.width * size.height} sq ft`;

            return (
              <button
                key={size.label}
                type="button"
                onClick={() => setSelectedSizeIndex(idx)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-tertiary)] border-[var(--accent-gold)] shadow-sm ring-1 ring-[var(--accent-gold)]'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-secondary)] hover:border-[var(--border-primary)]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{size.label}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                  {unitSystem === 'metric' ? `${metricW}m × ${metricH}m` : `${size.width}' × ${size.height}'`} · {area}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch Visualizer CTA */}
      <div className="space-y-3 pt-3 border-t border-[var(--border-secondary)]">
        <Link
          href={`/visualizer?productId=${product.id}&size=${currentSize.width}x${currentSize.height}`}
          className="flex w-full items-center justify-center space-x-2.5 rounded-xl bg-[var(--brand-earth)] px-6 py-3.5 text-sm font-semibold text-[var(--bg-primary)] shadow-md hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-all active:scale-95"
        >
          <Eye className="w-4 h-4" />
          <span>Simulate {currentSize.label} in Studio Visualizer</span>
          <Sparkles className="w-3.5 h-3.5 opacity-70" />
        </Link>

        <p className="text-center text-[11px] text-[var(--text-muted)]">
          Upload custom room photo or test inside preset 3D perspective interior spaces
        </p>
      </div>
    </div>
  );
}
