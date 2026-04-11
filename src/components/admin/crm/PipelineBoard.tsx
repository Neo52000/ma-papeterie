import { useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineDealCard } from "./PipelineDealCard";
import {
  PIPELINE_STAGES,
  useUpdateDealStage,
  type PipelineDeal,
} from "@/hooks/admin/usePipeline";
import { toast } from "sonner";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

// ── Droppable Column ──────────────────────────────────────────────────

function StageColumn({
  stage,
  deals,
  onDealClick,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  deals: PipelineDeal[];
  onDealClick: (deal: PipelineDeal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const totalWeighted = deals.reduce((sum, d) => sum + (d.weighted_value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] max-w-[280px] rounded-lg border ${
        isOver ? "ring-2 ring-primary bg-primary/5" : "bg-muted/30"
      }`}
    >
      <div className={`p-3 rounded-t-lg ${stage.color} text-white`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{stage.label}</h3>
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
            {deals.length}
          </span>
        </div>
        <p className="text-xs opacity-80 mt-0.5">{fmtPrice(totalWeighted)}</p>
      </div>
      <ScrollArea className="flex-1 p-2 min-h-[200px] max-h-[calc(100vh-320px)]">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {deals.map((deal) => (
              <SortableDealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal)} />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

// ── Sortable Deal Card ────────────────────────────────────────────────

function SortableDealCard({ deal, onClick }: { deal: PipelineDeal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { deal },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PipelineDealCard deal={deal} onClick={onClick} />
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────

interface Props {
  deals: PipelineDeal[];
  isLoading: boolean;
  onDealClick: (deal: PipelineDeal) => void;
}

export function PipelineBoard({ deals, isLoading, onDealClick }: Props) {
  const [activeDeal, setActiveDeal] = useState<PipelineDeal | null>(null);
  const updateStage = useUpdateDealStage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const dealsByStage = useCallback(
    (stageKey: string) => deals.filter((d) => d.stage === stageKey),
    [deals],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = active.id as string;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    // Determine target stage: either the column droppable or a deal in that column
    let targetStage = over.id as string;
    const targetDeal = deals.find((d) => d.id === over.id);
    if (targetDeal) targetStage = targetDeal.stage;

    if (deal.stage === targetStage) return;

    // Validate stage is a known pipeline stage
    if (!PIPELINE_STAGES.some((s) => s.key === targetStage)) return;

    updateStage.mutate(
      { dealId, stage: targetStage },
      {
        onSuccess: () => {
          const stageLabel = PIPELINE_STAGES.find((s) => s.key === targetStage)?.label;
          toast.success(`Deal deplace vers "${stageLabel}"`);
        },
        onError: () => toast.error("Erreur lors du deplacement"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage.key} className="min-w-[240px] space-y-2">
            <Skeleton className="h-12 w-full rounded-t-lg" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            deals={dealsByStage(stage.key)}
            onDealClick={onDealClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && <PipelineDealCard deal={activeDeal} />}
      </DragOverlay>
    </DndContext>
  );
}
