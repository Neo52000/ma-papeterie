import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FileSearch, Edit, Trash2, Eye, Loader2, Send } from "lucide-react";

const requestTypes = [
  {
    value: "access",
    label: "Droit d'accès",
    description: "Obtenir une copie de toutes les données vous concernant",
    icon: Eye,
  },
  {
    value: "rectification",
    label: "Droit de rectification",
    description: "Corriger des données inexactes ou incomplètes",
    icon: Edit,
  },
  {
    value: "deletion",
    label: "Droit à l'effacement",
    description: "Demander la suppression de vos données personnelles",
    icon: Trash2,
  },
  {
    value: "export",
    label: "Droit à la portabilité",
    description: "Recevoir vos données dans un format structuré",
    icon: FileSearch,
  },
];

export function GdprRequestForm() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un type de demande",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Vous devez être connecté pour soumettre une demande");
      }

      const { error } = await supabase
        .from("gdpr_requests")
        .insert({
          user_id: user.id,
          request_type: selectedType,
          notes: details || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre demande RGPD a été enregistrée. Nous la traiterons dans les meilleurs délais.",
      });

      // Reset form
      setSelectedType("");
      setDetails("");
      
      // Refresh the requests list
      queryClient.invalidateQueries({ queryKey: ["gdpr-requests"] });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Nouvelle demande RGPD
        </CardTitle>
        <CardDescription>
          Exercez vos droits conformément au Règlement Général sur la Protection des Données (RGPD)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Type de demande</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={setSelectedType}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {requestTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Label
                    key={type.value}
                    htmlFor={type.value}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Précisions (optionnel)</Label>
            <Textarea
              id="details"
              placeholder="Ajoutez des détails sur votre demande si nécessaire..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Par exemple, précisez les données concernées ou les informations à rectifier.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Délai de traitement : 30 jours maximum
            </p>
            <Button type="submit" disabled={isSubmitting || !selectedType}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
