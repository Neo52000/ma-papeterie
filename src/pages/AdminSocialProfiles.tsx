import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocialProfilesConfig, useUpdateSocialProfilesConfig, type SocialProfilesConfig } from "@/hooks/useSiteGlobals";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ExternalLink, Save, Loader2 } from "lucide-react";

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_business", label: "Google Business Profile" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "pinterest", label: "Pinterest" },
  { value: "other", label: "Autre" },
];

const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  facebook: "https://www.facebook.com/VotrePage",
  instagram: "https://www.instagram.com/votre_compte/",
  google_business: "https://g.page/votre-etablissement",
  twitter: "https://x.com/votre_compte",
  linkedin: "https://www.linkedin.com/company/votre-entreprise",
  youtube: "https://www.youtube.com/@votre-chaine",
  tiktok: "https://www.tiktok.com/@votre_compte",
  pinterest: "https://www.pinterest.fr/votre_compte/",
  other: "https://...",
};

type Profile = SocialProfilesConfig["profiles"][number];

export default function AdminSocialProfiles() {
  const { data: config, isLoading } = useSocialProfilesConfig();
  const updateMutation = useUpdateSocialProfilesConfig();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync from server on first load
  if (config && !initialized) {
    setProfiles(config.profiles || []);
    setInitialized(true);
  }

  const addProfile = () => {
    setProfiles((prev) => [...prev, { platform: "facebook", url: "", label: "" }]);
  };

  const removeProfile = (index: number) => {
    setProfiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProfile = (index: number, field: keyof Profile, value: string) => {
    setProfiles((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const save = () => {
    // Validate URLs
    const invalid = profiles.find((p) => p.url && !p.url.startsWith("https://"));
    if (invalid) {
      toast.error("Toutes les URLs doivent commencer par https://");
      return;
    }

    // Filter out empty entries
    const cleanProfiles = profiles.filter((p) => p.url.trim() !== "");

    updateMutation.mutate(
      { profiles: cleanProfiles },
      {
        onSuccess: () => {
          toast.success("Profils sociaux enregistrés");
          setProfiles(cleanProfiles);
        },
        onError: (err) => {
          toast.error(`Erreur : ${err.message}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AdminLayout title="Réseaux sociaux" description="Gérez vos profils de réseaux sociaux pour le SEO">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Réseaux sociaux" description="Gérez vos profils de réseaux sociaux pour le SEO (schema.org sameAs)">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profils sociaux</CardTitle>
              <CardDescription>
                Ces URLs sont injectées dans le schema LocalBusiness (sameAs) pour améliorer le référencement local et le Knowledge Panel Google.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun profil configuré. Cliquez sur "Ajouter un profil" pour commencer.
                </p>
              )}

              {profiles.map((profile, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <GripVertical className="h-5 w-5 mt-2 text-muted-foreground/50 shrink-0" />

                  <div className="flex-1 grid gap-3 sm:grid-cols-[180px_1fr]">
                    <div>
                      <Label className="text-xs text-muted-foreground">Plateforme</Label>
                      <Select
                        value={profile.platform}
                        onValueChange={(v) => updateProfile(index, "platform", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">URL du profil</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={profile.url}
                          onChange={(e) => updateProfile(index, "url", e.target.value)}
                          placeholder={PLATFORM_PLACEHOLDERS[profile.platform] || "https://..."}
                          className="flex-1"
                        />
                        {profile.url && (
                          <a
                            href={profile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input hover:bg-accent shrink-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5 text-destructive/70 hover:text-destructive shrink-0"
                    onClick={() => removeProfile(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={addProfile}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un profil
                </Button>
                <Button onClick={save} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Impact SEO</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                Les URLs configurées ici sont injectées dans le balisage <strong>schema.org LocalBusiness</strong> sur toutes les pages du site.
              </p>
              <p>
                Cela permet a Google de :
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Afficher vos profils dans le <strong>Knowledge Panel</strong></li>
                <li>Vérifier l'authenticité de votre entreprise</li>
                <li>Améliorer votre <strong>SEO local</strong></li>
              </ul>
            </CardContent>
          </Card>

          {profiles.filter((p) => p.url).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Aperçu sameAs</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                  {JSON.stringify(
                    profiles.filter((p) => p.url).map((p) => p.url),
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
