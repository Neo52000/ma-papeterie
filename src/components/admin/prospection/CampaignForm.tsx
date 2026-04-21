import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateProspectCampaign } from "@/hooks/useProspectCampaigns";
import { segmentLabel, type ProspectSegment } from "@/lib/nafToSegment";

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
}

export function CampaignForm({ open, onClose }: CampaignFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [segment, setSegment] = useState<ProspectSegment | "none">("none");
  const [brevoListId, setBrevoListId] = useState("");
  const [brevoWorkflowId, setBrevoWorkflowId] = useState("");
  const createMutation = useCreateProspectCampaign();

  function resetForm() {
    setName("");
    setDescription("");
    setSegment("none");
    setBrevoListId("");
    setBrevoWorkflowId("");
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        target_segment: segment !== "none" ? segment : undefined,
        brevo_list_id: brevoListId ? parseInt(brevoListId, 10) : undefined,
        brevo_workflow_id: brevoWorkflowId ? parseInt(brevoWorkflowId, 10) : undefined,
        status: "draft",
      });
      toast.success("Campagne créée en brouillon");
      resetForm();
      onClose();
    } catch (err) {
      toast.error("Erreur", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle campagne de prospection</DialogTitle>
          <DialogDescription>
            Les IDs Brevo (liste + workflow) doivent être configurés dans Brevo au préalable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Nom *</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Écoles primaires Haute-Marne rentrée 2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-desc">Description</Label>
            <Textarea
              id="campaign-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Objectif, cible, dates..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Segment cible</Label>
            <Select value={segment} onValueChange={(v) => setSegment(v as ProspectSegment | "none")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun segment spécifique</SelectItem>
                <SelectItem value="educational">{segmentLabel("educational")}</SelectItem>
                <SelectItem value="public">{segmentLabel("public")}</SelectItem>
                <SelectItem value="liberal">{segmentLabel("liberal")}</SelectItem>
                <SelectItem value="pme">{segmentLabel("pme")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brevo-list">ID liste Brevo</Label>
              <Input
                id="brevo-list"
                type="number"
                value={brevoListId}
                onChange={(e) => setBrevoListId(e.target.value)}
                placeholder="Ex. 42"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brevo-workflow">ID workflow Brevo</Label>
              <Input
                id="brevo-workflow"
                type="number"
                value={brevoWorkflowId}
                onChange={(e) => setBrevoWorkflowId(e.target.value)}
                placeholder="Ex. 17"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer le brouillon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
