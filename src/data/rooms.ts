import { StaticImageData } from "next/image";

export type NormalizedQuad = {
  topLeft: { u: number; v: number };
  topRight: { u: number; v: number };
  bottomRight: { u: number; v: number };
  bottomLeft: { u: number; v: number };
};

export type Room = {
  id: string;
  name: string;
  image: string | StaticImageData;
  thumbnail: string | StaticImageData;
  defaultQuad: NormalizedQuad;
};

export const sampleRooms: Room[] = [
  {
    id: "living-room-01",
    name: "Modern Living Room",
    image: "/rooms/living-room-01.webp",
    thumbnail: "/rooms/living-room-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.28, v: 0.65 },
      topRight: { u: 0.72, v: 0.65 },
      bottomRight: { u: 0.88, v: 0.94 },
      bottomLeft: { u: 0.12, v: 0.94 },
    },
  },
  {
    id: "luxury-room-01",
    name: "Luxury Living Room",
    image: "/rooms/luxury-room-01.webp",
    thumbnail: "/rooms/luxury-room-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.30, v: 0.62 },
      topRight: { u: 0.70, v: 0.62 },
      bottomRight: { u: 0.85, v: 0.92 },
      bottomLeft: { u: 0.15, v: 0.92 },
    },
  },
  {
    id: "bedroom-01",
    name: "Neutral Bedroom",
    image: "/rooms/bedroom-01.webp",
    thumbnail: "/rooms/bedroom-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.25, v: 0.60 },
      topRight: { u: 0.75, v: 0.60 },
      bottomRight: { u: 0.90, v: 0.92 },
      bottomLeft: { u: 0.10, v: 0.92 },
    },
  },
  {
    id: "modern-room-01",
    name: "Contemporary Space",
    image: "/rooms/modern-room-01.webp",
    thumbnail: "/rooms/modern-room-01-thumb.webp",
    defaultQuad: {
      topLeft: { u: 0.22, v: 0.64 },
      topRight: { u: 0.78, v: 0.64 },
      bottomRight: { u: 0.92, v: 0.95 },
      bottomLeft: { u: 0.08, v: 0.95 },
    },
  },
];