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
    title: 'Lighting, Warmth & Shadows',
    description:
      'Calibrate color temperature (warm incandescent to cool daylight), contrast, and contact shadows to blend perfectly into room ambient lighting.',
    targetSelector: '[data-tour="realism-controls"]',
    shortcut: 'Adjust Warmth, Contrast & Shadow depth',
    placement: 'right',
  },
  {
    id: 'studio-actions',
    title: 'Split Compare & Export',
    description:
      'Use Split Slider (Hotkey: S) to drag a before/after comparison curtain side-by-side, then export a crisp 2× high-resolution PNG render.',
    targetSelector: '[data-tour="studio-actions"]',
    shortcut: 'Press S for Split Compare · ? for all shortcuts',
    placement: 'bottom',
  },
];
