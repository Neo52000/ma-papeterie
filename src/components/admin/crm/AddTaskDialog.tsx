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
import { useAddTask } from "@/hooks/admin/useClientTasks";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId?: string;
  pipelineId?: string;
  quoteId?: string;
}

export function AddTaskDialog({ open, onOpenChange, profileId, pipelineId, quoteId }: Props) {
  const [type, setType] = useState("call");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState("normal");

  const addTask = useAddTask();

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!dueDate) {
      toast.error("La date d'echeance est requise");
      return;
    }

    addTask.mutate(
      {
        profileId,
        pipelineId,
        quoteId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        priority,
      },
      {
        onSuccess: () => {
          toast.success("Tache creee");
          setTitle("");
          setDescription("");
          onOpenChange(false);
        },
        onError: () => toast.error("Erreur lors de la creation"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creer une tache</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Appel</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="follow_up">Relance</SelectItem>
                  <SelectItem value="quote_relance">Relance devis</SelectItem>
                  <SelectItem value="visit">Visite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Priorite</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Titre *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tache"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Echeance *</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={addTask.isPending}>
            {addTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Creer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
