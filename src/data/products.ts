import { StaticImageData } from "next/image";

export type ProductSize = {
  label: string;
  width: number; // in feet
  height: number; // in feet
};

export type Product = {
  id: string;
  name: string;
  category?: 'Traditional' | 'Modern' | 'Heritage' | 'Coastal';
  material?: string;
  badge?: string;
  image: string | StaticImageData; // Use string for public path or StaticImageData
  price: number;
  description: string;
  sizes: ProductSize[];
};

export const products: Product[] = [
  {
    id: "rug-001",
    name: "Ivory Heritage Rug",
    category: "Heritage",
    material: "100% Organic New Zealand Wool",
    badge: "Best Seller",
    image: "/products/ivory-heritage-rug.webp",
    price: 399.99,
    description: "A classic ivory rug with intricate patterns, perfect for adding a touch of elegance to any living space.",
    sizes: [
      { label: "5 × 8 ft", width: 5, height: 8 },
      { label: "6 × 9 ft", width: 6, height: 9 },
      { label: "8 × 10 ft", width: 8, height: 10 },
      { label: "9 × 12 ft", width: 9, height: 12 },
    ],
  },
  {
    id: "rug-002",
    name: "Sandstone Traditional Rug",
    category: "Traditional",
    material: "Hand-Knotted Semi-Worsted Wool",
    badge: "Artisan Heritage",
    image: "/products/sandstone-rug.webp",
    price: 499.99,
    description: "Hand-knotted sandstone rug featuring traditional motifs, bringing warmth and character to your home.",
    sizes: [
      { label: "5 × 8 ft", width: 5, height: 8 },
      { label: "8 × 10 ft", width: 8, height: 10 },
      { label: "9 × 12 ft", width: 9, height: 12 },
    ],
  },
  {
    id: "rug-003",
    name: "Modern Geometric Rug",
    category: "Modern",
    material: "Plush High-Density Microfiber",
    badge: "Contemporary",
    image: "/products/modern-geometric-rug.webp",
    price: 299.99,
    description: "Contemporary rug with a bold geometric pattern, ideal for modern interiors.",
    sizes: [
      { label: "4 × 6 ft", width: 4, height: 6 },
      { label: "5 × 8 ft", width: 5, height: 8 },
      { label: "6 × 9 ft", width: 6, height: 9 },
    ],
  },
  {
    id: "rug-004",
    name: "Coastal Jute Blend Rug",
    category: "Coastal",
    material: "Natural Raw Jute & Cotton Weft",
    badge: "Eco Natural",
    image: "/products/coastal-jute-rug.webp",
    price: 249.99,
    description: "A natural jute blend rug with a casual coastal vibe, perfect for sunrooms or relaxed living areas.",
    sizes: [
      { label: "3 × 5 ft", width: 3, height: 5 },
      { label: "5 × 8 ft", width: 5, height: 8 },
    ],
  },
];