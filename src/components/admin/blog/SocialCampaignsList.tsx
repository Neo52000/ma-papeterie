import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSocialCampaigns, type SocialPost } from '@/hooks/useSocialBooster';
import { SocialBoosterPanel } from './SocialBoosterPanel';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Facebook, Instagram, Linkedin, X, ExternalLink } from 'lucide-react';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  x: X,
  linkedin: Linkedin,
};

const STATUS_COLORS: Record<string, string> = {
  detected: 'bg-gray-100 text-gray-600',
  classified: 'bg-blue-50 text-blue-600',
  generated: 'bg-purple-100 text-purple-600',
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-purple-100 text-purple-700',
  publishing: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

const POST_STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  approved: 'bg-blue-500',
  published: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-gray-300',
  publishing: 'bg-yellow-500',
  scheduled: 'bg-purple-500',
};

export function SocialCampaignsList() {
  const { data: campaigns, isLoading } = useSocialCampaigns();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<{ id: string; title: string } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const filtered = (campaigns || []).filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    // Platform filter: show only campaigns that have a post for the selected platform
    if (platformFilter !== 'all') {
      const hasPost = c.social_posts?.some((p: SocialPost) => p.platform === platformFilter);
      if (!hasPost) return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const created = new Date(c.created_at);
      const now = new Date();
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (created < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (created < monthAgo) return false;
      }
    }

    return true;
  });

  const getPostStatusForPlatform = (posts: SocialPost[], platform: string) => {
    const post = posts?.find((p) => p.platform === platform);
    return post?.status || null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="generated">G\u00e9n\u00e9r\u00e9</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="approved">Approuv\u00e9</SelectItem>
            <SelectItem value="published">Publi\u00e9</SelectItem>
            <SelectItem value="failed">\u00c9chec</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="R\u00e9seau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous r\u00e9seaux</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="x">X (Twitter)</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="P\u00e9riode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes dates</SelectItem>
            <SelectItem value="week">7 derniers jours</SelectItem>
            <SelectItem value="month">30 derniers jours</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">{filtered.length} campagne(s)</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">Aucune campagne sociale.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-center">FB</TableHead>
                <TableHead className="text-center">IG</TableHead>
                <TableHead className="text-center">X</TableHead>
                <TableHead className="text-center">LI</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((campaign) => {
                const article = campaign.blog_articles;
                const posts = campaign.social_posts || [];

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium text-sm truncate">{article?.title || 'Article supprim\u00e9'}</p>
                        {article?.slug && <p className="text-xs text-gray-400 truncate">/blog/{article.slug}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[campaign.status] || 'bg-gray-100'}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    {['facebook', 'instagram', 'x', 'linkedin'].map((platform) => {
                      const status = getPostStatusForPlatform(posts, platform);
                      const Icon = PLATFORM_ICONS[platform];
                      return (
                        <TableCell key={platform} className="text-center">
                          {status ? (
                            <div className="flex items-center justify-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${POST_STATUS_DOT[status] || 'bg-gray-300'}`} />
                              <Icon className="w-3 h-3 text-gray-400" />
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(campaign.created_at), { locale: fr, addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {article && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedArticle({ id: article.id, title: article.title })}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail panel */}
      {selectedArticle && (
        <SocialBoosterPanel
          articleId={selectedArticle.id}
          articleTitle={selectedArticle.title}
          open={!!selectedArticle}
          onOpenChange={(open) => !open && setSelectedArticle(null)}
        />
      )}
    </div>
  );
}
