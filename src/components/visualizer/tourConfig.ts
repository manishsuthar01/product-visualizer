export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  shortcut?: string;
  placement?: TourPlacement;
}

export const TOUR_STORAGE_KEY = 'hod_visualizer_tour_completed';

export const tourSteps: TourStep[] = [
  {
    id: 'room-environment',
    title: 'Choose Your Room',
    description:
      'Select a preset room environment or upload a photo of your own space to test rugs in real-life rooms.',
    targetSelector: '[data-tour="room-environment"]',
    placement: 'right',
  },
  {
    id: 'canvas-stage',
    title: 'Align Rug to Floor',
    description:
      'Drag the 4 corner handles on the canvas to match your room’s floor perspective, or apply quick Perspective Presets.',
    targetSelector: '[data-tour="canvas-stage"]',
    shortcut: 'Press C for Corner Tool',
    placement: 'bottom',
  },
  {
    id: 'layer-tools',
    title: 'Layer Furniture in Front',
    description:
      'Use Box Cutout, Paint Brush, or Magic Wand to seamlessly bring coffee tables and furniture legs above the rug.',
    targetSelector: '[data-tour="layer-tools"]',
    shortcut: 'Hotkeys: X for Box · B for Brush · W for Wand',
    placement: 'right',
  },
  {
    id: 'realism-controls',
    title: 'Floor Texture & Lighting',
    description:
      'Blend the room floor’s grain and lighting into the rug surface and calibrate contact shadows for authentic realism.',
    targetSelector: '[data-tour="realism-controls"]',
    shortcut: 'Hotkey: T for Floor Texture',
    placement: 'right',
  },
  {
    id: 'studio-actions',
    title: 'Compare & Export',
    description:
      'Toggle Before/After view to evaluate your design, then export a crisp 2× high-resolution PNG render.',
    targetSelector: '[data-tour="studio-actions"]',
    shortcut: 'Press ? anytime for keyboard shortcuts',
    placement: 'bottom',
  },
];
