import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Mail, Phone, Building2, MapPin, Tag, Star,
  TrendingUp, Target, X, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClientProfile } from "@/hooks/admin/useClientProfile";

const RFM_BADGES: Record<string, { label: string; className: string }> = {
  champion: { label: "Champion", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  loyal: { label: "Loyal", className: "bg-blue-100 text-blue-800 border-blue-300" },
  promising: { label: "Prometteur", className: "bg-green-100 text-green-800 border-green-300" },
  at_risk: { label: "A risque", className: "bg-orange-100 text-orange-800 border-orange-300" },
  lost: { label: "Perdu", className: "bg-red-100 text-red-800 border-red-300" },
  new: { label: "Nouveau", className: "bg-slate-100 text-slate-800 border-slate-300" },
};

const fmtPrice = (v: number | null) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v ?? 0);

interface Props {
  profile: ClientProfile | null;
  isLoading: boolean;
}

export function ClientProfileCard({ profile, isLoading }: Props) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  const rfmBadge = RFM_BADGES[profile.rfm_segment ?? "new"] ?? RFM_BADGES.new;
  const initials = (profile.display_name ?? profile.email ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const addTag = async () => {
    if (!newTag.trim()) return;
    const updatedTags = [...(profile.tags ?? []), newTag.trim()];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ tags: updatedTags })
      .eq("id", profile.id);
    if (error) {
      toast.error("Erreur lors de l'ajout du tag");
    } else {
      toast.success("Tag ajoute");
      setNewTag("");
      queryClient.invalidateQueries({ queryKey: ["client-profile", profile.id] });
    }
  };

  const removeTag = async (tag: string) => {
    const updatedTags = (profile.tags ?? []).filter((t) => t !== tag);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ tags: updatedTags })
      .eq("id", profile.id);
    if (error) {
      toast.error("Erreur lors de la suppression du tag");
    } else {
      queryClient.invalidateQueries({ queryKey: ["client-profile", profile.id] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Profil client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-lg">{profile.display_name ?? "Client"}</h3>
          <Badge variant="outline" className={rfmBadge.className}>
            <Star className="h-3 w-3 mr-1" />
            {rfmBadge.label}
          </Badge>
        </div>

        <Separator />

        {/* Contact info */}
        <div className="space-y-2 text-sm">
          {profile.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{profile.client_type ?? "b2c"}</span>
          </div>
          {profile.lead_source && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{profile.lead_source}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Commandes</p>
            <p className="text-lg font-bold">{profile.total_orders}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">CA total</p>
            <p className="text-lg font-bold">{fmtPrice(profile.total_spent)}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Panier moy.</p>
            <p className="text-lg font-bold">{fmtPrice(profile.avg_basket)}</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">CLV</p>
            <p className="text-lg font-bold">{fmtPrice(profile.clv)}</p>
          </div>
        </div>

        {/* Engagement Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Engagement
            </span>
            <span className="text-sm font-semibold">{profile.engagement_score}/100</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${profile.engagement_score}%` }}
            />
          </div>
        </div>

        {/* RFM Scores */}
        {profile.rfm && (
          <div>
            <p className="text-sm font-medium flex items-center gap-1 mb-2">
              <Target className="h-3 w-3" />
              Scores RFM
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-1 bg-muted rounded">
                <p className="text-muted-foreground">R</p>
                <p className="font-bold">{profile.rfm.recency_score ?? "-"}</p>
              </div>
              <div className="p-1 bg-muted rounded">
                <p className="text-muted-foreground">F</p>
                <p className="font-bold">{profile.rfm.frequency_score ?? "-"}</p>
              </div>
              <div className="p-1 bg-muted rounded">
                <p className="text-muted-foreground">M</p>
                <p className="font-bold">{profile.rfm.monetary_score ?? "-"}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Tags */}
        <div>
          <p className="text-sm font-medium flex items-center gap-1 mb-2">
            <Tag className="h-3 w-3" />
            Tags
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {(profile.tags ?? []).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Nouveau tag"
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && addTag()}
            />
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={addTag}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
