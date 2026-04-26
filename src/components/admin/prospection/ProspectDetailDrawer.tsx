import { useState } from "react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, Globe, UserCheck, Loader2, Save, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { TagsEditor } from "./TagsEditor";
import { useProspect } from "@/hooks/useProspects";
import {
  useUpdateProspect,
  useLogProspectInteraction,
  useConvertProspect,
} from "@/hooks/useProspectMutations";
import type { ProspectRow, ProspectStatus } from "@/hooks/useProspects";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ProspectDetailDrawerProps {
  prospect: ProspectRow | null;
  open: boolean;
  onClose: () => void;
}

export function ProspectDetailDrawer({ prospect, open, onClose }: ProspectDetailDrawerProps) {
  const { data: detail } = useProspect(prospect?.id ?? null);
  const updateMutation = useUpdateProspect();
  const logMutation = useLogProspectInteraction();
  const convertMutation = useConvertProspect();

  const [notes, setNotes] = useState(prospect?.notes ?? "");
  const [tags, setTags] = useState<string[]>(prospect?.tags ?? []);
  const [contactEmail, setContactEmail] = useState(prospect?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(prospect?.contact_phone ?? "");
  const [website, setWebsite] = useState(prospect?.website ?? "");
  const [status, setStatus] = useState<ProspectStatus>(prospect?.status ?? "new");
  const [interactionText, setInteractionText] = useState("");
  const [interactionChannel, setInteractionChannel] = useState<"email" | "phone" | "visit" | "web">("phone");

  // Sync local state quand le prospect change
  if (prospect && prospect.id !== detail?.prospect.id) {
    setNotes(prospect.notes ?? "");
    setTags(prospect.tags ?? []);
    setContactEmail(prospect.contact_email ?? "");
    setContactPhone(prospect.contact_phone ?? "");
    setWebsite(prospect.website ?? "");
    setStatus(prospect.status);
  }

  if (!prospect) return null;

  async function handleSave() {
    if (!prospect) return;
    try {
      await updateMutation.mutateAsync({
        id: prospect.id,
        status,
        tags,
        notes: notes || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        website: website || null,
      });
      toast.success("Prospect mis à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  async function handleLogInteraction() {
    if (!prospect || !interactionText.trim()) return;
    try {
      await logMutation.mutateAsync({
        prospect_id: prospect.id,
        channel: interactionChannel,
        direction: "outbound",
        description: interactionText.trim(),
      });
      setInteractionText("");
      toast.success("Interaction enregistrée");
    } catch (err) {
      toast.error("Erreur", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  async function handleConvert() {
    if (!prospect) return;
    if (!confirm(`Convertir ${prospect.name} en client B2B ?\n\nCela créera un compte b2b_accounts et transférera l'historique de prospection.`)) return;
    try {
      const result = await convertMutation.mutateAsync({
        prospect_id: prospect.id,
        display_name: prospect.name,
      });
      toast.success("Prospect converti en client", {
        description: `Compte B2B créé (ID: ${result.b2b_account_id.slice(0, 8)}...)`,
      });
      onClose();
    } catch (err) {
      toast.error("Conversion impossible", {
        description: err instanceof Error ? err.message : "",
      });
    }
  }

  const address = prospect.address;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{prospect.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">SIREN {prospect.siren}</Badge>
            {prospect.client_segment && (
              <Badge variant="secondary" className="capitalize">{prospect.client_segment}</Badge>
            )}
            {prospect.score !== null && (
              <Badge variant="default">Score {prospect.score}/100</Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Infos SIRENE */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Informations INSEE</h3>
            <Card>
              <CardContent className="pt-4 text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">NAF :</span>
                  <span>{prospect.naf_code ?? "—"} {prospect.naf_label && `— ${prospect.naf_label}`}</span>
                  <span className="text-muted-foreground">Forme :</span>
                  <span>{prospect.legal_form ?? "—"}</span>
                  <span className="text-muted-foreground">Effectif :</span>
                  <span>{prospect.employee_range ?? "—"}</span>
                  <span className="text-muted-foreground">Créée :</span>
                  <span>{prospect.founded_date ?? "—"}</span>
                  <span className="text-muted-foreground">Adresse :</span>
                  <span>
                    {address?.street}<br />
                    {address?.zip} {address?.city}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Statut + assignation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Suivi commercial</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="status">Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProspectStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="qualified">Qualifié</SelectItem>
                    <SelectItem value="contacted">Contacté</SelectItem>
                    <SelectItem value="engaged">Engagé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                    <SelectItem value="unreachable">Injoignable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Téléphone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="email"
                  placeholder="Email (à compléter manuellement)"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Site web"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagsEditor tags={tags} onChange={setTags} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, objections, historique discussion..."
            />
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer les modifications
          </Button>

          <Separator />

          {/* Journal interactions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Journal des interactions</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select
                  value={interactionChannel}
                  onValueChange={(v) => setInteractionChannel(v as "email" | "phone" | "visit" | "web")}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Téléphone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="visit">Visite</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Note sur l'échange..."
                  value={interactionText}
                  onChange={(e) => setInteractionText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogInteraction()}
                />
                <Button
                  size="sm"
                  onClick={handleLogInteraction}
                  disabled={!interactionText.trim() || logMutation.isPending}
                >
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {detail?.interactions?.length ? (
                detail.interactions.map((i) => (
                  <Card key={i.id}>
                    <CardContent className="pt-3 pb-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{i.channel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(i.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {i.description && <p className="text-sm">{i.description}</p>}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune interaction enregistrée.
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Conversion */}
          {prospect.status !== "converted" ? (
            <Button
              variant="default"
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              className="w-full"
            >
              {convertMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Convertir en client B2B
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="text-center py-2">
              <Badge variant="default">
                <UserCheck className="h-3 w-3 mr-1" /> Converti en client
              </Badge>
              {prospect.converted_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  le {new Date(prospect.converted_at).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
