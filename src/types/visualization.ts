export type Point2D = { x: number; y: number };

export type QuadCorners = {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
};

export type ActiveTool = 'corners' | 'floorTexture' | 'brush' | 'box' | 'eraser' | 'wand';

export type ComparisonMode = 'off' | 'toggle' | 'split';

export type SplitType = 'original-vs-rug' | 'rug-vs-rug';

export type UnitSystem = 'imperial' | 'metric';

export type VisualizerState = {
  selectedProductId: string | null;
  selectedSize: {
    width: number;
    height: number;
  } | null;
  compareProductId: string | null; // secondary rug for A/B split comparison
  splitType: SplitType;           // 'original-vs-rug' or 'rug-vs-rug'
  unitSystem: UnitSystem;      // 'imperial' (ft) or 'metric' (m/cm)
  roomImage: string | null;
  roomImageFile: File | null;
  isCustomRoom: boolean;
  roomBrightness: number;      // -30 to 30: background room exposure calibration
  roomWarmth: number;          // -30 to 30: background room temperature calibration
  quadCorners: QuadCorners | null;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  opacity: number;
  brightness: number;
  warmth: number;              // -50 to 50: cool daylight to golden warm glow
  contrast: number;            // -30 to 30: soft to high dynamic contrast
  saturation: number;          // -50 to 50: muted tone to rich vibrancy
  shadowOpacity: number;
  showOriginal: boolean;
  comparisonMode: ComparisonMode; // 'off' (rug), 'toggle' (original), 'split' (interactive divider)
  splitPosition: number;       // 0 to 1: position of split comparison curtain
  showDimensionsOverlay: boolean; // projected 3D perspective dimensions on floor quad
  activeTool: ActiveTool;
  brushSize: number;
  brushHardness: number;       // 0–100: controls feathering softness (100 = hard edge)
  edgeSnap: boolean;           // when true, brush snaps to detected edges
  showMaskPreview: boolean;    // overlay the mask in a tinted color for visibility
  preserveMask: boolean;       // when false, mask auto-clears on room switch
  floorTextureStrength: number; // 0–1: how much floor texture bleeds into the rug (was darkenOpacity)
  wandTolerance: number;       // 0–100: color tolerance for magic wand flood fill
  wandContiguous: boolean;      // true = flood fill contiguous region, false = fill all matching pixels in room
  showShortcutModal: boolean;   // true = display keyboard shortcuts cheat sheet
};

export type VisualizerAction =
  | { type: 'SET_PRODUCT'; payload: { productId: string; size: { width: number; height: number } } }
  | { type: 'SET_COMPARE_PRODUCT'; payload: { productId: string | null } }
  | { type: 'SET_SPLIT_TYPE'; payload: { splitType: SplitType } }
  | { type: 'SET_ROOM_IMAGE'; payload: { image: string; file: File | null } }
  | { type: 'SET_ROOM_SAMPLE'; payload: { image: string } }
  | { type: 'UPLOAD_CUSTOM_ROOM'; payload: { image: string; file: File } }
  | { type: 'SET_ROOM_BRIGHTNESS'; payload: { brightness: number } }
  | { type: 'SET_ROOM_WARMTH'; payload: { warmth: number } }
  | { type: 'SET_QUAD_CORNERS'; payload: { corners: QuadCorners } }
  | { type: 'UPDATE_QUAD_CORNER'; payload: { corner: keyof QuadCorners; x: number; y: number } }
  | { type: 'ROTATE_QUAD_90' }
  | { type: 'FLIP_QUAD_HORIZONTAL' }
  | { type: 'FLIP_QUAD_VERTICAL' }
  | { type: 'UPDATE_TRANSFORM'; payload: { x?: number; y?: number; scale?: number; rotation?: number } }
  | { type: 'SET_OPACITY'; payload: { opacity: number } }
  | { type: 'SET_BRIGHTNESS'; payload: { brightness: number } }
  | { type: 'SET_WARMTH'; payload: { warmth: number } }
  | { type: 'SET_CONTRAST'; payload: { contrast: number } }
  | { type: 'SET_SATURATION'; payload: { saturation: number } }
  | { type: 'APPLY_LIGHTING_PRESET'; payload: { warmth: number; contrast: number; saturation: number; opacity?: number; shadowOpacity?: number; floorTextureStrength?: number } }
  | { type: 'RESET_COLOR_ADJUSTMENTS' }
  | { type: 'SET_SHADOW_OPACITY'; payload: { shadowOpacity: number } }
  | { type: 'RESET_TRANSFORM' }
  | { type: 'TOGGLE_BEFORE_AFTER' }
  | { type: 'SET_COMPARISON_MODE'; payload: { mode: ComparisonMode } }
  | { type: 'SET_SPLIT_POSITION'; payload: { position: number } }
  | { type: 'SET_SHOW_DIMENSIONS_OVERLAY'; payload: { enabled: boolean } }
  | { type: 'SET_UNIT_SYSTEM'; payload: { unitSystem: UnitSystem } }
  | { type: 'SET_SIZE'; payload: { width: number; height: number } }
  | { type: 'CLEAR_VISUALIZER' }
  | { type: 'SET_ACTIVE_TOOL'; payload: { tool: ActiveTool } }
  | { type: 'SET_BRUSH_SIZE'; payload: { size: number } }
  | { type: 'SET_BRUSH_HARDNESS'; payload: { hardness: number } }
  | { type: 'SET_EDGE_SNAP'; payload: { enabled: boolean } }
  | { type: 'SET_SHOW_MASK_PREVIEW'; payload: { enabled: boolean } }
  | { type: 'SET_PRESERVE_MASK'; payload: { enabled: boolean } }
  | { type: 'SET_FLOOR_TEXTURE_STRENGTH'; payload: { strength: number } }
  | { type: 'SET_WAND_TOLERANCE'; payload: { tolerance: number } }
  | { type: 'SET_WAND_CONTIGUOUS'; payload: { contiguous: boolean } }
  | { type: 'SET_SHOW_SHORTCUT_MODAL'; payload: { open: boolean } };