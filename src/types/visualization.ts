export type Point2D = { x: number; y: number };

export type QuadCorners = {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
};

export type ActiveTool = 'corners' | 'floorTexture' | 'brush' | 'box' | 'eraser' | 'wand';

export type VisualizerState = {
  selectedProductId: string | null;
  selectedSize: {
    width: number;
    height: number;
  } | null;
  roomImage: string | null;
  roomImageFile: File | null;
  isCustomRoom: boolean;
  quadCorners: QuadCorners | null;
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  opacity: number;
  brightness: number;
  shadowOpacity: number;
  showOriginal: boolean;
  activeTool: ActiveTool;
  brushSize: number;
  brushHardness: number;       // 0–100: controls feathering softness (100 = hard edge)
  edgeSnap: boolean;           // when true, brush snaps to detected edges
  showMaskPreview: boolean;    // overlay the mask in a tinted color for visibility
  preserveMask: boolean;       // when false, mask auto-clears on room switch
  floorTextureStrength: number; // 0–1: how much floor texture bleeds into the rug (was darkenOpacity)
  wandTolerance: number;       // 0–100: color tolerance for magic wand flood fill
};

export type VisualizerAction =
  | { type: 'SET_PRODUCT'; payload: { productId: string; size: { width: number; height: number } } }
  | { type: 'SET_ROOM_IMAGE'; payload: { image: string; file: File | null } }
  | { type: 'SET_ROOM_SAMPLE'; payload: { image: string } }
  | { type: 'UPLOAD_CUSTOM_ROOM'; payload: { image: string; file: File } }
  | { type: 'SET_QUAD_CORNERS'; payload: { corners: QuadCorners } }
  | { type: 'UPDATE_QUAD_CORNER'; payload: { corner: keyof QuadCorners; x: number; y: number } }
  | { type: 'UPDATE_TRANSFORM'; payload: { x?: number; y?: number; scale?: number; rotation?: number } }
  | { type: 'SET_OPACITY'; payload: { opacity: number } }
  | { type: 'SET_BRIGHTNESS'; payload: { brightness: number } }
  | { type: 'SET_SHADOW_OPACITY'; payload: { shadowOpacity: number } }
  | { type: 'RESET_TRANSFORM' }
  | { type: 'TOGGLE_BEFORE_AFTER' }
  | { type: 'SET_SIZE'; payload: { width: number; height: number } }
  | { type: 'CLEAR_VISUALIZER' }
  | { type: 'SET_ACTIVE_TOOL'; payload: { tool: ActiveTool } }
  | { type: 'SET_BRUSH_SIZE'; payload: { size: number } }
  | { type: 'SET_BRUSH_HARDNESS'; payload: { hardness: number } }
  | { type: 'SET_EDGE_SNAP'; payload: { enabled: boolean } }
  | { type: 'SET_SHOW_MASK_PREVIEW'; payload: { enabled: boolean } }
  | { type: 'SET_PRESERVE_MASK'; payload: { enabled: boolean } }
  | { type: 'SET_FLOOR_TEXTURE_STRENGTH'; payload: { strength: number } }
  | { type: 'SET_WAND_TOLERANCE'; payload: { tolerance: number } };