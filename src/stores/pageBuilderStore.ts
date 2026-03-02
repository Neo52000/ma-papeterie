import { create } from "zustand";
import type { ContentBlock, StaticPage } from "@/hooks/useStaticPages";

type ViewMode = "desktop" | "mobile";
type EditorTab = "blocks" | "settings" | "seo" | "schema";

interface PageBuilderState {
  page: Partial<StaticPage> | null;
  blocks: ContentBlock[];
  isDirty: boolean;

  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  viewMode: ViewMode;
  activeTab: EditorTab;

  undoStack: ContentBlock[][];
  redoStack: ContentBlock[][];

  // Page actions
  setPage: (page: Partial<StaticPage>) => void;
  setPageField: <K extends keyof StaticPage>(key: K, value: StaticPage[K]) => void;

  // Block actions
  setBlocks: (blocks: ContentBlock[]) => void;
  addBlock: (block: ContentBlock, atIndex?: number) => void;
  updateBlock: (id: string, patch: Partial<ContentBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (id: string) => void;

  // Selection
  selectBlock: (id: string | null) => void;
  hoverBlock: (id: string | null) => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tab: EditorTab) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;

  // State
  markClean: () => void;
  reset: () => void;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

export const usePageBuilderStore = create<PageBuilderState>((set, get) => {
  function pushUndo() {
    const { blocks, undoStack } = get();
    set({ undoStack: [...undoStack.slice(-49), blocks], redoStack: [] });
  }

  return {
    page: null,
    blocks: [],
    isDirty: false,

    selectedBlockId: null,
    hoveredBlockId: null,
    viewMode: "desktop",
    activeTab: "blocks",

    undoStack: [],
    redoStack: [],

    setPage: (page) => set({ page }),
    setPageField: (key, value) =>
      set((s) => ({ page: { ...s.page, [key]: value }, isDirty: true })),

    setBlocks: (blocks) => set({ blocks, isDirty: false, undoStack: [], redoStack: [] }),

    addBlock: (block, atIndex) => {
      pushUndo();
      set((s) => {
        const blocks = [...s.blocks];
        const idx = atIndex ?? blocks.length;
        blocks.splice(idx, 0, block);
        return { blocks, isDirty: true, selectedBlockId: block.id, activeTab: "settings" };
      });
    },

    updateBlock: (id, patch) => {
      pushUndo();
      set((s) => ({
        blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } as ContentBlock : b)),
        isDirty: true,
      }));
    },

    removeBlock: (id) => {
      pushUndo();
      set((s) => ({
        blocks: s.blocks.filter((b) => b.id !== id),
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
        isDirty: true,
      }));
    },

    moveBlock: (fromIndex, toIndex) => {
      pushUndo();
      set((s) => ({
        blocks: arrayMove(s.blocks, fromIndex, toIndex),
        isDirty: true,
      }));
    },

    duplicateBlock: (id) => {
      pushUndo();
      set((s) => {
        const idx = s.blocks.findIndex((b) => b.id === id);
        if (idx === -1) return s;
        const clone = { ...JSON.parse(JSON.stringify(s.blocks[idx])), id: crypto.randomUUID() };
        const blocks = [...s.blocks];
        blocks.splice(idx + 1, 0, clone);
        return { blocks, isDirty: true, selectedBlockId: clone.id };
      });
    },

    selectBlock: (id) => set({ selectedBlockId: id, activeTab: id ? "settings" : "blocks" }),
    hoverBlock: (id) => set({ hoveredBlockId: id }),

    setViewMode: (viewMode) => set({ viewMode }),
    setActiveTab: (activeTab) => set({ activeTab }),

    undo: () => {
      const { undoStack, blocks } = get();
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      set((s) => ({
        blocks: prev,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, blocks],
        isDirty: true,
      }));
    },

    redo: () => {
      const { redoStack, blocks } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      set((s) => ({
        blocks: next,
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, blocks],
        isDirty: true,
      }));
    },

    markClean: () => set({ isDirty: false }),
    reset: () =>
      set({
        page: null,
        blocks: [],
        isDirty: false,
        selectedBlockId: null,
        hoveredBlockId: null,
        viewMode: "desktop",
        activeTab: "blocks",
        undoStack: [],
        redoStack: [],
      }),
  };
});
