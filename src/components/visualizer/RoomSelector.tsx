'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { sampleRooms } from '@/data/rooms';
import { useVisualizerStore } from '@/hooks/useVisualizer';

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
    <div className="mb-6 space-y-4">
      {/* Upload Room Photo Section */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-2">
          1. Choose Room Photo
        </h3>
        
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
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/50'
              : isCustomRoom
              ? 'border-emerald-500 bg-emerald-50/30'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-100/50'
          }`}
        >
          <div className="flex items-center space-x-2 text-gray-700 font-medium">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold">
              {isCustomRoom ? 'Uploaded Room Photo' : 'Upload Your Room Photo'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Drag & drop or click to upload JPG, PNG
          </p>
        </div>
      </div>

      {/* Sample Rooms Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Or Pick Sample Room
          </span>
          {isCustomRoom && (
            <button
              onClick={() => handleSelectRoom(sampleRooms[0].image as string)}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Reset to Sample
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
                className={`relative h-20 w-full overflow-hidden rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                    : 'border-gray-200 hover:border-gray-400'
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-2 flex items-end">
                  <span className="text-xs font-medium text-white line-clamp-1">
                    {room.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-indigo-600 text-white p-0.5 rounded-full shadow">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
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

