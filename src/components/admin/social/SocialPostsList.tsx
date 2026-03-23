import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStandaloneCampaigns, type StandaloneCampaign } from '@/hooks/useSocialMedia';
import { SocialPostEditor } from './SocialPostEditor';
import {
  Loader2,
  Facebook,
  Instagram,
  Linkedin,
  X,
  MessageCircle,
  Search,
  Calendar,
  ImageIcon,
} from 'lucide-react';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  x: X,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-600',
  x: 'text-gray-900',
  linkedin: 'text-blue-700',
  whatsapp: 'text-green-600',
};

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  detected: { label: 'Détecté', variant: 'bg-gray-100 text-gray-700' },
  generated: { label: 'Généré', variant: 'bg-blue-100 text-blue-700' },
  draft: { label: 'Brouillon', variant: 'bg-gray-100 text-gray-700' },
  approved: { label: 'Approuvé', variant: 'bg-blue-100 text-blue-700' },
  published: { label: 'Publié', variant: 'bg-green-100 text-green-700' },
  failed: { label: 'Échec', variant: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulé', variant: 'bg-gray-100 text-gray-500' },
};

export function SocialPostsList() {
  const { data: campaigns, isLoading } = useStandaloneCampaigns();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<StandaloneCampaign | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const filtered = (campaigns || []).filter((c) => {
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="detected">Détecté</SelectItem>
            <SelectItem value="generated">Généré</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucune publication standalone trouvée.</p>
            <p className="text-sm mt-1">Créez votre premier post dans l'onglet "Nouveau post".</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => {
            const status = STATUS_LABELS[campaign.status] || STATUS_LABELS.detected;
            const posts = campaign.social_posts || [];
            const publishedCount = posts.filter((p) => p.status === 'published').length;
            const totalCount = posts.length;

            return (
              <Card key={campaign.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: thumbnail + info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {campaign.media_urls && campaign.media_urls.length > 0 ? (
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                          <img
                            src={campaign.media_urls[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm truncate">
                          {campaign.title || 'Publication sans titre'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] ${status.variant}`}>{status.label}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(campaign.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          {totalCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {publishedCount}/{totalCount} publié(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: platform dots + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex gap-1">
                        {posts.map((post) => {
                          const Icon = PLATFORM_ICONS[post.platform] || MessageCircle;
                          const color = PLATFORM_COLORS[post.platform] || 'text-gray-500';
                          return (
                            <div
                              key={post.id}
                              title={`${post.platform}: ${post.status}`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                post.status === 'published' ? 'bg-green-50' :
                                post.status === 'failed' ? 'bg-red-50' :
                                post.status === 'scheduled' ? 'bg-purple-50' :
                                'bg-gray-50'
                              }`}
                            >
                              <Icon className={`w-3 h-3 ${color}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign detail dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.title || 'Détails de la campagne'}</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              {/* Context info */}
              {selectedCampaign.raw_context && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedCampaign.raw_context.product && (
                    <div><span className="text-muted-foreground">Produit :</span> {selectedCampaign.raw_context.product}</div>
                  )}
                  {selectedCampaign.raw_context.promo && (
                    <div><span className="text-muted-foreground">Promo :</span> {selectedCampaign.raw_context.promo}</div>
                  )}
                  {selectedCampaign.raw_context.occasion && (
                    <div><span className="text-muted-foreground">Occasion :</span> {selectedCampaign.raw_context.occasion}</div>
                  )}
                  {selectedCampaign.raw_context.tone && (
                    <div><span className="text-muted-foreground">Ton :</span> {selectedCampaign.raw_context.tone}</div>
                  )}
                </div>
              )}

              {/* Posts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(selectedCampaign.social_posts || []).map((post) => (
                  <SocialPostEditor
                    key={post.id}
                    post={post}
                    mediaUrl={selectedCampaign.media_urls?.[0]}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
