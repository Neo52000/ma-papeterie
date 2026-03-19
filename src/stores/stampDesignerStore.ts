import { create } from 'zustand';
import type { StampModel, StampLine, StampLogo, StampShape, StampClipart } from '@/components/stamp-designer/types';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from '@/components/stamp-designer/constants';

function uid(): string {
  return crypto.randomUUID();
}

interface StampDesignerState {
  // Model selection
  selectedModel: StampModel | null;

  // Design content
  lines: StampLine[];
  logo: StampLogo | null;
  shapes: StampShape[];
  cliparts: StampClipart[];

  // Options
  inkColor: string;
  caseColor: string;

  // UI state
  step: 'select' | 'design' | 'preview';
  selectedElementId: string | null;
  previewDataUrl: string | null;

  // Actions — model
  selectModel: (model: StampModel) => void;
  goBackToSelect: () => void;

  // Actions — lines
  addLine: () => void;
  updateLine: (id: string, updates: Partial<StampLine>) => void;
  removeLine: (id: string) => void;

  // Actions — logo
  setLogo: (file: File, dataUrl: string) => void;
  removeLogo: () => void;
  updateLogoPosition: (updates: Partial<Pick<StampLogo, 'x' | 'y' | 'width' | 'height'>>) => void;

  // Actions — shapes
  addShape: (type: StampShape['type']) => void;
  updateShape: (id: string, updates: Partial<StampShape>) => void;
  removeShape: (id: string) => void;

  // Actions — cliparts
  addClipart: (name: string, svgPath: string) => void;
  updateClipart: (id: string, updates: Partial<StampClipart>) => void;
  removeClipart: (id: string) => void;

  // Actions — options
  setInkColor: (color: string) => void;
  setCaseColor: (color: string) => void;

  // Actions — UI
  setStep: (step: 'select' | 'design' | 'preview') => void;
  selectElement: (id: string | null) => void;
  setPreviewDataUrl: (url: string) => void;
  deleteSelectedElement: () => void;

  // Actions — global
  reset: () => void;
}

const initialState = {
  selectedModel: null,
  lines: [] as StampLine[],
  logo: null as StampLogo | null,
  shapes: [] as StampShape[],
  cliparts: [] as StampClipart[],
  inkColor: 'noir',
  caseColor: 'noir',
  step: 'select' as const,
  selectedElementId: null as string | null,
  previewDataUrl: null as string | null,
};

export const useStampDesignerStore = create<StampDesignerState>((set, get) => ({
  ...initialState,

  selectModel: (model) =>
    set({
      selectedModel: model,
      step: 'design',
      inkColor: model.available_ink_colors[0] || 'noir',
      caseColor: model.available_case_colors[0] || 'noir',
      lines: [
        {
          id: uid(),
          text: '',
          fontFamily: DEFAULT_FONT,
          fontSize: DEFAULT_FONT_SIZE,
          bold: false,
          italic: false,
          alignment: 'center',
        },
      ],
    }),

  goBackToSelect: () => set({ ...initialState }),

  // Lines
  addLine: () => {
    const { lines, selectedModel } = get();
    if (selectedModel && lines.length >= selectedModel.max_lines) return;
    set({
      lines: [
        ...lines,
        {
          id: uid(),
          text: '',
          fontFamily: DEFAULT_FONT,
          fontSize: DEFAULT_FONT_SIZE,
          bold: false,
          italic: false,
          alignment: 'center',
        },
      ],
    });
  },

  updateLine: (id, updates) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  removeLine: (id) =>
    set((s) => ({
      lines: s.lines.filter((l) => l.id !== id),
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    })),

  // Logo
  setLogo: (file, dataUrl) =>
    set({
      logo: { file, dataUrl, storageKey: null, x: 10, y: 10, width: 40, height: 40 },
    }),

  removeLogo: () => set({ logo: null }),

  updateLogoPosition: (updates) =>
    set((s) => ({
      logo: s.logo ? { ...s.logo, ...updates } : null,
    })),

  // Shapes
  addShape: (type) =>
    set((s) => ({
      shapes: [
        ...s.shapes,
        { id: uid(), type, x: 20, y: 20, width: 40, height: type === 'line' ? 2 : 30, rotation: 0 },
      ],
    })),

  updateShape: (id, updates) =>
    set((s) => ({
      shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...updates } : sh)),
    })),

  removeShape: (id) =>
    set((s) => ({
      shapes: s.shapes.filter((sh) => sh.id !== id),
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    })),

  // Cliparts
  addClipart: (name, svgPath) =>
    set((s) => ({
      cliparts: [
        ...s.cliparts,
        { id: uid(), name, svgPath, x: 20, y: 20, width: 30, height: 30 },
      ],
    })),

  updateClipart: (id, updates) =>
    set((s) => ({
      cliparts: s.cliparts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  removeClipart: (id) =>
    set((s) => ({
      cliparts: s.cliparts.filter((c) => c.id !== id),
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    })),

  // Options
  setInkColor: (color) => set({ inkColor: color }),
  setCaseColor: (color) => set({ caseColor: color }),

  // UI
  setStep: (step) => set({ step }),
  selectElement: (id) => set({ selectedElementId: id }),
  setPreviewDataUrl: (url) => set({ previewDataUrl: url }),

  deleteSelectedElement: () => {
    const { selectedElementId, lines, shapes, cliparts, logo } = get();
    if (!selectedElementId) return;
    if (selectedElementId === 'logo' && logo) {
      set({ logo: null, selectedElementId: null });
      return;
    }
    if (lines.some((l) => l.id === selectedElementId)) {
      set({
        lines: lines.filter((l) => l.id !== selectedElementId),
        selectedElementId: null,
      });
      return;
    }
    if (shapes.some((s) => s.id === selectedElementId)) {
      set({
        shapes: shapes.filter((s) => s.id !== selectedElementId),
        selectedElementId: null,
      });
      return;
    }
    if (cliparts.some((c) => c.id === selectedElementId)) {
      set({
        cliparts: cliparts.filter((c) => c.id !== selectedElementId),
        selectedElementId: null,
      });
    }
  },

  reset: () => set(initialState),
}));
