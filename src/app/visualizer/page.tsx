import RoomVisualizer from '@/components/visualizer/RoomVisualizer';

export default async function VisualizerPage({
  searchParams,
}: {
  searchParams: Promise<{
    productId?: string;
    size?: string;
  }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <RoomVisualizer searchParams={resolvedParams} />
    </div>
  );
}

