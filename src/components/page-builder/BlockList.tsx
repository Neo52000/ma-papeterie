import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { usePageBuilderStore } from "@/stores/pageBuilderStore";
import { SortableBlockItem } from "./SortableBlockItem";

export function BlockList() {
  const { blocks, moveBlock } = usePageBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlock(oldIndex, newIndex);
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <p>Aucun bloc pour le moment.</p>
        <p className="mt-1">Cliquez sur un bloc ci-dessus pour commencer.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-0.5">
          {blocks.map((block) => (
            <SortableBlockItem key={block.id} block={block} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
