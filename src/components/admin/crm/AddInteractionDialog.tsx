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
import { useAddInteraction } from "@/hooks/admin/useClientInteractions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  userId: string;
}

export function AddInteractionDialog({ open, onOpenChange, profileId, userId }: Props) {
  const [type, setType] = useState("note");
  const [channel, setChannel] = useState("web");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const addInteraction = useAddInteraction();

  const handleSubmit = () => {
    if (!subject.trim()) {
      toast.error("Le sujet est requis");
      return;
    }

    addInteraction.mutate(
      {
        profileId,
        userId,
        interactionType: type,
        channel,
        subject: subject.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Interaction ajoutee");
          setSubject("");
          setDescription("");
          onOpenChange(false);
        },
        onError: () => toast.error("Erreur lors de l'ajout"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une interaction</DialogTitle>
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
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Appel</SelectItem>
                  <SelectItem value="email_sent">Email</SelectItem>
                  <SelectItem value="visit">Visite</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Canal</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="phone">Telephone</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Sujet *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'interaction"
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
          <Button onClick={handleSubmit} disabled={addInteraction.isPending}>
            {addInteraction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
