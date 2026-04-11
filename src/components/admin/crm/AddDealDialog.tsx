import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateDeal } from "@/hooks/admin/usePipeline";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDealDialog({ open, onOpenChange }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [source, setSource] = useState("site_web");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [probability, setProbability] = useState("10");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");

  const createDeal = useCreateDeal();

  const handleSubmit = () => {
    if (!companyName.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }

    createDeal.mutate(
      {
        companyName: companyName.trim(),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        source,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        probability: parseInt(probability) || 10,
        notes: notes.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextActionDate: nextActionDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Deal cree");
          setCompanyName("");
          setContactName("");
          setContactEmail("");
          setContactPhone("");
          setEstimatedValue("");
          setNotes("");
          setNextAction("");
          setNextActionDate("");
          onOpenChange(false);
        },
        onError: () => toast.error("Erreur lors de la creation"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau deal B2B</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Entreprise *</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom de l'entreprise"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Contact</label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nom du contact"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@entreprise.fr"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Telephone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="03 XX XX XX XX"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site_web">Site web</SelectItem>
                  <SelectItem value="prospection_locale">Prospection locale</SelectItem>
                  <SelectItem value="recommandation">Recommandation</SelectItem>
                  <SelectItem value="salon">Salon</SelectItem>
                  <SelectItem value="mairie">Mairie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Valeur estimee (EUR)</label>
              <Input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="5000"
                step="100"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Probabilite (%)</label>
              <Input
                type="number"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Prochaine action</label>
              <Input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Appeler le responsable"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, besoins specifiques..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={createDeal.isPending}>
            {createDeal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Creer le deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
