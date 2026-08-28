import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/products';
import { Eye, ArrowRight } from 'lucide-react';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const defaultSize = product.sizes[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-secondary)] shadow-sm hover:shadow-md transition-all duration-200 hover:border-[var(--border-primary)]">
      <Link href={`/products/${product.id}`} className="relative h-60 w-full overflow-hidden bg-[var(--bg-tertiary)] block">
        <Image
          src={product.image}
          alt={product.name}
          fill
          style={{ objectFit: "cover" }}
          className="transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {product.badge && (
          <div className="absolute top-3 left-3">
            <span className="rounded-md bg-[var(--brand-earth)]/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent-gold)] shadow-sm border border-[var(--accent-gold)]/30 uppercase tracking-wider">
              {product.badge}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="rounded-md bg-[var(--bg-primary)]/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] shadow-sm border border-[var(--border-secondary)]">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-wider">
              {product.category || 'Collection'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {product.sizes.length} Sizes
            </span>
          </div>
          <Link href={`/products/${product.id}`}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] flex flex-col gap-2">
          <Link
            href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
            className="flex items-center justify-center space-x-2 rounded-lg bg-[var(--brand-earth)] py-2 px-3 text-xs font-medium text-[var(--bg-primary)] shadow-sm hover:bg-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Launch Visualizer Studio</span>
            <ArrowRight className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>
    </div>
  );
}



