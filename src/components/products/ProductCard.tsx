import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/products';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const defaultSize = product.sizes[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
      <Link href={`/products/${product.id}`} className="relative h-64 w-full overflow-hidden bg-slate-100 block">
        <Image
          src={product.image}
          alt={product.name}
          fill
          style={{ objectFit: "cover" }}
          className="transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        <div className="absolute top-3 right-3">
          <span className="rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-slate-900 shadow">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
          <Link
            href={`/visualizer?productId=${product.id}&size=${defaultSize.width}x${defaultSize.height}`}
            className="flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-2.5 px-3 text-xs font-bold text-white shadow hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View in Your Room</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

