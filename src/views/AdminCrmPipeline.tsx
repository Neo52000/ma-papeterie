import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePipeline, type PipelineDeal } from "@/hooks/admin/usePipeline";
import { PipelineBoard } from "@/components/admin/crm/PipelineBoard";
import { PipelineKPIs } from "@/components/admin/crm/PipelineKPIs";
import { AddDealDialog } from "@/components/admin/crm/AddDealDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Phone, Calendar, DollarSign, StickyNote } from "lucide-react";

const fmtPrice = (v: number | null) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v ?? 0);

export default function AdminCrmPipeline() {
  const { data: deals, isLoading } = usePipeline();
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Pipeline B2B</h1>
          <Button onClick={() => setShowAddDeal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau deal
          </Button>
        </div>

        {/* KPIs */}
        <PipelineKPIs deals={deals ?? []} />

        {/* Kanban Board */}
        <PipelineBoard
          deals={deals ?? []}
          isLoading={isLoading}
          onDealClick={setSelectedDeal}
        />

        {/* Mobile: list view fallback */}
        <div className="lg:hidden space-y-2">
          {(deals ?? []).map((deal) => (
            <div
              key={deal.id}
              className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedDeal(deal)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{deal.company_name}</span>
                <Badge variant="outline" className="text-xs">{deal.stage}</Badge>
              </div>
              {deal.estimated_value != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtPrice(deal.estimated_value)} - {deal.probability}%
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add deal dialog */}
      <AddDealDialog open={showAddDeal} onOpenChange={setShowAddDeal} />

      {/* Deal detail sheet */}
      <Sheet open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedDeal && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedDeal.company_name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <Badge variant="outline" className="capitalize">{selectedDeal.stage}</Badge>

                {selectedDeal.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {selectedDeal.contact_name}
                  </div>
                )}
                {selectedDeal.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {selectedDeal.contact_email}
                  </div>
                )}
                {selectedDeal.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {selectedDeal.contact_phone}
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valeur estimee</p>
                    <p className="font-semibold">{fmtPrice(selectedDeal.estimated_value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Probabilite</p>
                    <p className="font-semibold">{selectedDeal.probability}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valeur ponderee</p>
                    <p className="font-semibold">{fmtPrice(selectedDeal.weighted_value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source</p>
                    <p className="font-semibold capitalize">{selectedDeal.source ?? "-"}</p>
                  </div>
                </div>

                {selectedDeal.next_action && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Prochaine action
                      </p>
                      <p className="font-medium mt-1">{selectedDeal.next_action}</p>
                      {selectedDeal.next_action_date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedDeal.next_action_date).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {selectedDeal.notes && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />
                        Notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{selectedDeal.notes}</p>
                    </div>
                  </>
                )}

                {selectedDeal.lost_reason && (
                  <>
                    <Separator />
                    <div className="text-sm p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-700 font-medium">Raison de la perte</p>
                      <p className="text-red-600 mt-1">{selectedDeal.lost_reason}</p>
                    </div>
                  </>
                )}

                <p className="text-xs text-muted-foreground">
                  Cree le {new Date(selectedDeal.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
