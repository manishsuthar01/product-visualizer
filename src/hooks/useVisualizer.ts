import { create } from 'zustand';
import { VisualizerState, VisualizerAction } from '@/types/visualization';

type VisualizerStore = VisualizerState & {
  dispatch: (action: VisualizerAction) => void;
};

const initialState: VisualizerState = {
  selectedProductId: null,
  selectedSize: null,
  roomImage: null,
  roomImageFile: null,
  isCustomRoom: false,
  quadCorners: null,
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  opacity: 1,
  brightness: 0,
  shadowOpacity: 0.6,
  showOriginal: false,
  activeTool: 'corners',
  brushSize: 35,
  brushHardness: 85,
  edgeSnap: false,
  showMaskPreview: false,
  preserveMask: false,
  floorTextureStrength: 0.35,
  wandTolerance: 32,
  wandContiguous: true,
  showShortcutModal: false,
};

export const useVisualizerStore = create<VisualizerStore>((set) => ({
  ...initialState,
  dispatch: (action: VisualizerAction) =>
    set((state) => {
      switch (action.type) {
        case 'SET_PRODUCT':
          return {
            selectedProductId: action.payload.productId,
            selectedSize: action.payload.size,
          };
        case 'SET_ROOM_IMAGE':
          return {
            roomImage: action.payload.image,
            roomImageFile: action.payload.file,
            isCustomRoom: !!action.payload.file,
            quadCorners: null, // Reset to compute new default floor quad
          };
        case 'SET_ROOM_SAMPLE':
          return {
            roomImage: action.payload.image,
            roomImageFile: null,
            isCustomRoom: false,
            quadCorners: null, // Reset to compute room default floor quad
            // Mask clearing is handled in the canvas component based on preserveMask
          };
        case 'UPLOAD_CUSTOM_ROOM':
          return {
            roomImage: action.payload.image,
            roomImageFile: action.payload.file,
            isCustomRoom: true,
            quadCorners: null,
          };
        case 'SET_QUAD_CORNERS':
          return {
            quadCorners: action.payload.corners,
          };
        case 'UPDATE_QUAD_CORNER': {
          if (!state.quadCorners) return state;
          const { corner, x, y } = action.payload;
          return {
            quadCorners: {
              ...state.quadCorners,
              [corner]: { x, y },
            },
          };
        }
        case 'UPDATE_TRANSFORM':
          return {
            transform: { ...state.transform, ...action.payload },
          };
        case 'SET_OPACITY':
          return { opacity: action.payload.opacity };
        case 'SET_BRIGHTNESS':
          return { brightness: action.payload.brightness };
        case 'SET_SHADOW_OPACITY':
          return { shadowOpacity: action.payload.shadowOpacity };
        case 'SET_ACTIVE_TOOL':
          return { activeTool: action.payload.tool };
        case 'SET_BRUSH_SIZE':
          return { brushSize: action.payload.size };
        case 'SET_BRUSH_HARDNESS':
          return { brushHardness: action.payload.hardness };
        case 'SET_EDGE_SNAP':
          return { edgeSnap: action.payload.enabled };
        case 'SET_SHOW_MASK_PREVIEW':
          return { showMaskPreview: action.payload.enabled };
        case 'SET_PRESERVE_MASK':
          return { preserveMask: action.payload.enabled };
        case 'SET_FLOOR_TEXTURE_STRENGTH':
          return { floorTextureStrength: action.payload.strength };
        case 'SET_WAND_TOLERANCE':
          return { wandTolerance: action.payload.tolerance };
        case 'SET_WAND_CONTIGUOUS':
          return { wandContiguous: action.payload.contiguous };
        case 'SET_SHOW_SHORTCUT_MODAL':
          return { showShortcutModal: action.payload.open };
        case 'RESET_TRANSFORM':
          return {
            quadCorners: null, // Forces re-computation of default floor quad
            transform: { ...initialState.transform },
            opacity: 1,
            brightness: 0,
            shadowOpacity: 0.6,
            floorTextureStrength: 0.35,
          };
        case 'TOGGLE_BEFORE_AFTER':
          return { showOriginal: !state.showOriginal };
        case 'SET_SIZE':
          return {
            selectedSize: action.payload,
          };
        case 'CLEAR_VISUALIZER':
          return { ...initialState };
        default:
          return state;
      }
    }),
}));
