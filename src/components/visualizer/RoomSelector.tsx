'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { sampleRooms } from '@/data/rooms';
import { useVisualizerStore } from '@/hooks/useVisualizer';
import { UploadCloud, RotateCcw, Check } from 'lucide-react';

export default function RoomSelector() {
  const { roomImage, isCustomRoom, dispatch } = useVisualizerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectRoom = (image: string) => {
    dispatch({ type: 'SET_ROOM_SAMPLE', payload: { image } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        dispatch({
          type: 'UPLOAD_CUSTOM_ROOM',
          payload: { image: dataUrl, file },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="mb-5 space-y-4" data-tour="room-environment">
      {/* Upload Room Photo Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            1. Room Environment
          </label>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-3.5 border border-dashed rounded-lg cursor-pointer transition-all ${
            isDragging
              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
              : isCustomRoom
              ? 'border-[var(--accent-terracotta)]/50 bg-[var(--accent-terracotta)]/10'
              : 'border-[var(--border-secondary)] hover:border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <div className="flex items-center space-x-2 text-[var(--text-primary)] font-medium">
            <UploadCloud className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="text-xs font-semibold">
              {isCustomRoom ? 'Custom Room Loaded' : 'Upload Custom Room Photo'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Drag & drop or browse image (JPG, PNG)
          </p>
        </div>
      </div>

      {/* Sample Rooms Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Preset Environments
          </span>
          {isCustomRoom && (
            <button
              onClick={() => handleSelectRoom(sampleRooms[0].image as string)}
              className="inline-flex items-center space-x-1 text-[11px] text-[var(--accent-gold)] hover:text-[var(--accent-gold-hover)] font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {sampleRooms.map((room) => {
            const isSelected = !isCustomRoom && roomImage === room.image;
            return (
              <button
                key={room.id}
                type="button"
                className={`relative h-18 w-full overflow-hidden rounded-md border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--border-primary)] ring-1 ring-[var(--border-primary)]'
                    : 'border-[var(--border-secondary)] hover:border-[var(--border-primary)] opacity-85 hover:opacity-100'
                }`}
                onClick={() => handleSelectRoom(room.image as string)}
              >
                <Image
                  src={room.thumbnail as string}
                  alt={room.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="160px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-earth)]/85 via-[var(--brand-earth)]/20 to-transparent p-2 flex items-end">
                  <span className="text-[11px] font-medium text-[var(--bg-primary)] line-clamp-1">
                    {room.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 bg-[var(--accent-gold)] text-[var(--brand-earth)] p-0.5 rounded shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}



