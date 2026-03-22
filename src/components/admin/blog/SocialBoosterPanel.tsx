import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useSocialCampaign,
  useGenerateSocialPosts,
  useUpdateSocialPost,
  useApproveSocialPost,
  usePublishSocialPost,
  useSkipSocialPost,
  useUpdateCampaignEntity,
  useSocialPublicationLogs,
  type SocialPost,
  type EntityMatch,
} from '@/hooks/useSocialBooster';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Sparkles,
  Facebook,
  Instagram,
  Linkedin,
  Check,
  X,
  Send,
  SkipForward,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  History,
  Target,
  ImageIcon,
  MessageCircle,
} from 'lucide-react';

// ── Platform config ─────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  x: { label: 'X (Twitter)', icon: X, color: 'text-gray-900', bgColor: 'bg-gray-50' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
};

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Brouillon', variant: 'bg-gray-100 text-gray-700' },
  approved: { label: 'Approuv\u00e9', variant: 'bg-blue-100 text-blue-700' },
  scheduled: { label: 'Programm\u00e9', variant: 'bg-purple-100 text-purple-700' },
  publishing: { label: 'Publication...', variant: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Publi\u00e9', variant: 'bg-green-100 text-green-700' },
  failed: { label: '\u00c9chec', variant: 'bg-red-100 text-red-700' },
  skipped: { label: 'Ignor\u00e9', variant: 'bg-gray-100 text-gray-500' },
};

// ── Props ───────────────────────────────────────────────────────────────────

interface SocialBoosterPanelProps {
  articleId: string;
  articleTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function SocialBoosterPanel({ articleId, articleTitle, open, onOpenChange }: SocialBoosterPanelProps) {
  const { toast } = useToast();
  const { data: campaignData, isLoading } = useSocialCampaign(open ? articleId : null);
  const generatePosts = useGenerateSocialPosts();
  const updatePost = useUpdateSocialPost();
  const approvePost = useApproveSocialPost();
  const publishPost = usePublishSocialPost();
  const skipPost = useSkipSocialPost();
  const updateEntity = useUpdateCampaignEntity();

  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCta, setEditCta] = useState('');
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [showEntities, setShowEntities] = useState(false);

  const campaign = campaignData?.campaign;
  const posts = campaignData?.posts || [];

  const handleGenerate = async () => {
    try {
      const result = await generatePosts.mutateAsync({ articleId });
      toast({
        title: result.already_generated ? 'Posts d\u00e9j\u00e0 g\u00e9n\u00e9r\u00e9s' : 'Posts g\u00e9n\u00e9r\u00e9s',
        description: `${result.posts?.length || 0} publications cr\u00e9\u00e9es`,
      });
    } catch (error) {
      toast({
        title: 'Erreur de g\u00e9n\u00e9ration',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerate = async () => {
    try {
      await generatePosts.mutateAsync({ articleId, force: true });
      toast({ title: 'Posts r\u00e9g\u00e9n\u00e9r\u00e9s' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur',
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = (post: SocialPost) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setEditCta(post.cta_text || '');
  };

  const handleSaveEdit = async (postId: string) => {
    try {
      await updatePost.mutateAsync({ postId, content: editContent, cta_text: editCta });
      setEditingPost(null);
      toast({ title: 'Post mis \u00e0 jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const handleApprove = async (postId: string) => {
    try {
      await approvePost.mutateAsync(postId);
      toast({ title: 'Post approuv\u00e9' });
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      await publishPost.mutateAsync(postId);
      toast({ title: 'Post publi\u00e9 (mode mock)' });
    } catch (error) {
      toast({ title: 'Erreur de publication', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  const handleSkip = async (postId: string) => {
    try {
      await skipPost.mutateAsync(postId);
      toast({ title: 'Post ignor\u00e9' });
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleApproveAll = async () => {
    const draftPosts = posts.filter((p) => p.status === 'draft');
    for (const post of draftPosts) {
      await approvePost.mutateAsync(post.id);
    }
    toast({ title: `${draftPosts.length} posts approuv\u00e9s` });
  };

  const handlePublishAll = async () => {
    const approvedPosts = posts.filter((p) => p.status === 'approved');
    for (const post of approvedPosts) {
      await publishPost.mutateAsync(post.id);
    }
    toast({ title: `${approvedPosts.length} posts publi\u00e9s` });
  };

  const handleSelectEntity = async (entity: EntityMatch) => {
    if (!campaign) return;
    try {
      await updateEntity.mutateAsync({ campaignId: campaign.id, selectedEntity: entity });
      toast({ title: 'Entit\u00e9 s\u00e9lectionn\u00e9e' });
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Social Booster — {articleTitle}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !campaign || posts.length === 0 ? (
          /* No campaign yet */
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-500">Aucune publication sociale g\u00e9n\u00e9r\u00e9e pour cet article.</p>
            <Button onClick={handleGenerate} disabled={generatePosts.isPending} size="lg" className="gap-2">
              {generatePosts.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />G\u00e9n\u00e9ration en cours...</>
              ) : (
                <><Sparkles className="w-4 h-4" />G\u00e9n\u00e9rer les posts sociaux</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Campaign header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_CONFIG[campaign.status]?.variant || 'bg-gray-100'}>
                  {STATUS_CONFIG[campaign.status]?.label || campaign.status}
                </Badge>
                {campaign.classification && (
                  <Badge variant="outline">{campaign.classification.universe}</Badge>
                )}
                {campaign.classification?.seasonality && (
                  <Badge variant="outline">{campaign.classification.seasonality}</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={generatePosts.isPending} className="gap-1">
                <RefreshCw className="w-3 h-3" />R\u00e9g\u00e9n\u00e9rer
              </Button>
            </div>

            {/* Entity matches */}
            {campaign.entity_matches && campaign.entity_matches.length > 0 && (
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowEntities(!showEntities)}>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Entit\u00e9s m\u00e9tier sugg\u00e9r\u00e9es ({campaign.entity_matches.length})
                    </span>
                    {showEntities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </CardTitle>
                </CardHeader>
                {showEntities && (
                  <CardContent className="space-y-2">
                    {campaign.entity_matches.map((entity, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition ${
                          campaign.selected_entity?.entity_id === entity.entity_id
                            ? 'border-blue-400 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectEntity(entity)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{entity.entity_type}</Badge>
                            <span className="font-medium text-sm">{entity.entity_label}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{entity.match_reason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Score: {Math.round(entity.match_score * 100)}%</span>
                          {campaign.selected_entity?.entity_id === entity.entity_id && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Bulk actions */}
            <div className="flex gap-2">
              {posts.some((p) => p.status === 'draft') && (
                <Button size="sm" variant="outline" onClick={handleApproveAll} className="gap-1">
                  <Check className="w-3 h-3" />Approuver tous les brouillons
                </Button>
              )}
              {posts.some((p) => p.status === 'approved') && (
                <Button size="sm" onClick={handlePublishAll} className="gap-1">
                  <Send className="w-3 h-3" />Publier tous les approuv\u00e9s
                </Button>
              )}
            </div>

            {/* Posts by platform */}
            <div className="grid gap-4">
              {posts.map((post) => {
                const config = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.facebook;
                const Icon = config.icon;
                const isEditing = editingPost === post.id;
                const statusConf = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;

                return (
                  <Card key={post.id} className={`${config.bgColor} border`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${config.color}`} />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusConf.variant}>{statusConf.label}</Badge>
                          {post.published_at && (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(post.published_at), { locale: fr, addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Media preview */}
                      {post.media_url ? (
                        <div className="rounded overflow-hidden border bg-white">
                          <img
                            src={post.media_url}
                            alt="Média associé"
                            className="w-full h-32 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <ImageIcon className="w-3 h-3" />
                          <span>Aucun média</span>
                        </div>
                      )}

                      {isEditing ? (
                        <>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="bg-white"
                          />
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">CTA:</span>
                            <Input
                              value={editCta}
                              onChange={(e) => setEditCta(e.target.value)}
                              className="bg-white flex-1"
                              placeholder="Call to action..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(post.id)} disabled={updatePost.isPending}>
                              Sauvegarder
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingPost(null)}>
                              Annuler
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs text-blue-600">#{tag}</span>
                              ))}
                            </div>
                          )}
                          {post.cta_text && (
                            <p className="text-xs text-gray-600">
                              CTA: <span className="font-medium">{post.cta_text}</span>
                            </p>
                          )}
                          {post.cta_url && (
                            <p className="text-xs text-gray-400 truncate">{post.cta_url}</p>
                          )}
                          {post.error_message && (
                            <p className="text-xs text-red-600">Erreur: {post.error_message}</p>
                          )}
                        </>
                      )}

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex gap-1 pt-1">
                          {post.status === 'draft' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleStartEdit(post)}>
                                Modifier
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleApprove(post.id)} disabled={approvePost.isPending} className="gap-1">
                                <Check className="w-3 h-3" />Approuver
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleSkip(post.id)} disabled={skipPost.isPending} className="gap-1 text-gray-500">
                                <SkipForward className="w-3 h-3" />Ignorer
                              </Button>
                            </>
                          )}
                          {post.status === 'approved' && (
                            <>
                              <Button size="sm" onClick={() => handlePublish(post.id)} disabled={publishPost.isPending} className="gap-1">
                                <Send className="w-3 h-3" />Publier
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleStartEdit(post)}>
                                Modifier
                              </Button>
                            </>
                          )}
                          {post.status === 'failed' && (
                            <Button size="sm" variant="outline" onClick={() => handleApprove(post.id)} className="gap-1">
                              <RefreshCw className="w-3 h-3" />R\u00e9essayer
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto gap-1 text-gray-400"
                            onClick={() => setShowLogs(showLogs === post.id ? null : post.id)}
                          >
                            <History className="w-3 h-3" />Logs
                          </Button>
                        </div>
                      )}

                      {/* Logs section */}
                      {showLogs === post.id && <PostLogs postId={post.id} />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── PostLogs sub-component ──────────────────────────────────────────────────

function PostLogs({ postId }: { postId: string }) {
  const { data: logs, isLoading } = useSocialPublicationLogs(postId);

  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin" />;
  if (!logs || logs.length === 0) return <p className="text-xs text-gray-400">Aucun log</p>;

  return (
    <div className="border-t pt-2 space-y-1">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-2 text-xs">
          <Badge className={log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
            {log.status}
          </Badge>
          <span className="text-gray-600">{log.action}</span>
          {log.duration_ms && <span className="text-gray-400">{log.duration_ms}ms</span>}
          <span className="text-gray-400 ml-auto">
            {formatDistanceToNow(new Date(log.created_at), { locale: fr, addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
