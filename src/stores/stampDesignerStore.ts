import { create } from 'zustand';
import type { StampModel, StampLine, StampLogo, StampShape, StampClipart, StampTemplate, StampWarning } from '@/components/stamp-designer/types';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE, MM_TO_PX } from '@/components/stamp-designer/constants';

function uid(): string {
  return crypto.randomUUID();
}

function makeDefaultLine(text = ''): StampLine {
  return {
    id: uid(),
    text,
    fontFamily: DEFAULT_FONT,
    fontSize: DEFAULT_FONT_SIZE,
    bold: false,
    italic: false,
    alignment: 'center',
  };
}

/** Compute validation warnings based on current state */
function computeWarnings(
  lines: StampLine[],
  selectedModel: StampModel | null,
): StampWarning[] {
  const warnings: StampWarning[] = [];
  if (!selectedModel) return warnings;

  const hasAnyText = lines.some((l) => l.text.trim().length > 0);
  if (!hasAnyText) {
    warnings.push({ type: 'empty', message: 'Saisissez votre texte pour commencer.' });
    return warnings;
  }

  const stampWidthPx = selectedModel.width_mm * MM_TO_PX;

  lines.forEach((line, index) => {
    if (!line.text.trim()) return;

    // Approximate text width check (0.55 average char width ratio)
    const approxWidth = line.text.length * line.fontSize * MM_TO_PX * 0.8 * 0.55;
    if (approxWidth > stampWidthPx * 0.95) {
      warnings.push({
        type: 'overflow',
        message: `Ligne ${index + 1} : texte trop long, il risque de dépasser la zone.`,
        lineIndex: index,
      });
    }

    if (line.fontSize < 10) {
      warnings.push({
        type: 'too-small',
        message: `Ligne ${index + 1} : taille trop petite, texte difficilement lisible.`,
        lineIndex: index,
      });
    }
  });

  return warnings;
}

interface StampDesignerState {
  // Model selection
  selectedModel: StampModel | null;

  // Design content
  lines: StampLine[];
  textInput: string;
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
  zoom: number;
  warnings: StampWarning[];
  selectedTemplate: string | null;

  // Actions — model
  selectModel: (model: StampModel) => void;
  switchModel: (model: StampModel) => void;
  goBackToSelect: () => void;

  // Actions — text
  setTextInput: (text: string) => void;
  addLine: () => void;
  updateLine: (id: string, updates: Partial<StampLine>) => void;
  removeLine: (id: string) => void;

  // Actions — templates
  applyTemplate: (template: StampTemplate) => void;

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
  setZoom: (level: number) => void;
  deleteSelectedElement: () => void;

  // Actions — global
  reset: () => void;
}

const initialState = {
  selectedModel: null as StampModel | null,
  lines: [] as StampLine[],
  textInput: '',
  logo: null as StampLogo | null,
  shapes: [] as StampShape[],
  cliparts: [] as StampClipart[],
  inkColor: 'noir',
  caseColor: 'noir',
  step: 'select' as const,
  selectedElementId: null as string | null,
  previewDataUrl: null as string | null,
  zoom: 1,
  warnings: [] as StampWarning[],
  selectedTemplate: null as string | null,
};

export const useStampDesignerStore = create<StampDesignerState>((set, get) => ({
  ...initialState,

  selectModel: (model) =>
    set({
      selectedModel: model,
      step: 'design',
      inkColor: model.available_ink_colors[0] || 'noir',
      caseColor: model.available_case_colors[0] || 'noir',
      textInput: '',
      lines: [makeDefaultLine()],
      logo: null,
      shapes: [],
      cliparts: [],
      zoom: 1,
      warnings: [],
      selectedTemplate: null,
      selectedElementId: null,
      previewDataUrl: null,
    }),

  switchModel: (model) => {
    const { lines, textInput } = get();
    // Preserve existing text, clamp lines to new max_lines
    const clampedLines = lines.slice(0, model.max_lines);
    const clampedTextInput = textInput
      .split('\n')
      .slice(0, model.max_lines)
      .join('\n');
    set({
      selectedModel: model,
      lines: clampedLines.length > 0 ? clampedLines : [makeDefaultLine()],
      textInput: clampedTextInput,
      inkColor: model.available_ink_colors[0] || 'noir',
      caseColor: model.available_case_colors[0] || 'noir',
      warnings: computeWarnings(clampedLines, model),
    });
  },

  goBackToSelect: () => set({ ...initialState }),

  // Text input → lines sync
  setTextInput: (text) => {
    const { selectedModel, lines: currentLines } = get();
    const maxLines = selectedModel?.max_lines ?? 10;
    const rawLines = text.split('\n').slice(0, maxLines);

    const newLines: StampLine[] = rawLines.map((lineText, i) => {
      const existing = currentLines[i];
      if (existing) {
        return { ...existing, text: lineText };
      }
      return makeDefaultLine(lineText);
    });

    // Ensure at least one line
    if (newLines.length === 0) {
      newLines.push(makeDefaultLine());
    }

    set({
      textInput: rawLines.join('\n'),
      lines: newLines,
      selectedTemplate: null,
      warnings: computeWarnings(newLines, selectedModel),
    });
  },

  // Lines
  addLine: () => {
    const { lines, selectedModel, textInput } = get();
    if (selectedModel && lines.length >= selectedModel.max_lines) return;
    const newLines = [...lines, makeDefaultLine()];
    set({
      lines: newLines,
      textInput: textInput + (textInput ? '\n' : ''),
    });
  },

  updateLine: (id, updates) => {
    const { selectedModel } = get();
    set((s) => {
      const newLines = s.lines.map((l) => (l.id === id ? { ...l, ...updates } : l));
      // If text was updated, sync textInput
      const newTextInput = updates.text !== undefined
        ? newLines.map((l) => l.text).join('\n')
        : s.textInput;
      return {
        lines: newLines,
        textInput: newTextInput,
        warnings: updates.text !== undefined || updates.fontSize !== undefined
          ? computeWarnings(newLines, selectedModel)
          : s.warnings,
      };
    });
  },

  removeLine: (id) =>
    set((s) => {
      const newLines = s.lines.filter((l) => l.id !== id);
      return {
        lines: newLines,
        textInput: newLines.map((l) => l.text).join('\n'),
        selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
        warnings: computeWarnings(newLines, s.selectedModel),
      };
    }),

  // Templates
  applyTemplate: (template) => {
    const { selectedModel } = get();
    const maxLines = selectedModel?.max_lines ?? 10;
    const templateLines = template.lines.slice(0, maxLines);
    const text = templateLines.join('\n');
    const newLines = templateLines.map((lineText) => makeDefaultLine(lineText));
    set({
      textInput: text,
      lines: newLines,
      selectedTemplate: template.id,
      warnings: computeWarnings(newLines, selectedModel),
    });
  },

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
  setZoom: (level) => set({ zoom: Math.max(0.5, Math.min(2, level)) }),

  deleteSelectedElement: () => {
    const { selectedElementId, lines, shapes, cliparts, logo } = get();
    if (!selectedElementId) return;
    if (selectedElementId === 'logo' && logo) {
      set({ logo: null, selectedElementId: null });
      return;
    }
    if (lines.some((l) => l.id === selectedElementId)) {
      const newLines = lines.filter((l) => l.id !== selectedElementId);
      set({
        lines: newLines,
        textInput: newLines.map((l) => l.text).join('\n'),
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
