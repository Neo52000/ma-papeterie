import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  useUpdateSocialPost,
  useApproveSocialPost,
  usePublishSocialPost,
  useSkipSocialPost,
  type SocialPost,
} from '@/hooks/useSocialBooster';
import { useScheduleSocialPost } from '@/hooks/useSocialMedia';
import {
  Facebook,
  Instagram,
  Linkedin,
  X,
  MessageCircle,
  Check,
  Send,
  SkipForward,
  RefreshCw,
  Clock,
  Loader2,
  ImageIcon,
  Edit3,
  Save,
} from 'lucide-react';
import { SocialScheduleDialog } from './SocialScheduleDialog';

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
  approved: { label: 'Approuvé', variant: 'bg-blue-100 text-blue-700' },
  scheduled: { label: 'Programmé', variant: 'bg-purple-100 text-purple-700' },
  publishing: { label: 'Publication...', variant: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Publié', variant: 'bg-green-100 text-green-700' },
  failed: { label: 'Échec', variant: 'bg-red-100 text-red-700' },
  skipped: { label: 'Ignoré', variant: 'bg-gray-100 text-gray-500' },
};

// ── Props ───────────────────────────────────────────────────────────────────

interface SocialPostEditorProps {
  post: SocialPost;
  mediaUrl?: string | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function SocialPostEditor({ post, mediaUrl }: SocialPostEditorProps) {
  const { toast } = useToast();
  const updatePost = useUpdateSocialPost();
  const approvePost = useApproveSocialPost();
  const publishPost = usePublishSocialPost();
  const skipPost = useSkipSocialPost();
  const schedulePost = useScheduleSocialPost();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editCta, setEditCta] = useState(post.cta_text || '');
  const [editHashtags, setEditHashtags] = useState((post.hashtags || []).join(', '));
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const platform = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.facebook;
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const PlatformIcon = platform.icon;

  const handleSave = async () => {
    try {
      await updatePost.mutateAsync({
        postId: post.id,
        content: editContent,
        cta_text: editCta || undefined,
        hashtags: editHashtags ? editHashtags.split(',').map((h) => h.trim()).filter(Boolean) : [],
      });
      setEditing(false);
      toast({ title: 'Post mis à jour' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const handleApprove = async () => {
    try {
      await approvePost.mutateAsync(post.id);
      toast({ title: 'Post approuvé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    try {
      await publishPost.mutateAsync(post.id);
      toast({ title: 'Post publié' });
    } catch {
      toast({ title: 'Erreur de publication', variant: 'destructive' });
    }
  };

  const handleSkip = async () => {
    try {
      await skipPost.mutateAsync(post.id);
      toast({ title: 'Post ignoré' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSchedule = async (date: Date) => {
    try {
      await schedulePost.mutateAsync({ postId: post.id, scheduledFor: date.toISOString() });
      setScheduleOpen(false);
      toast({ title: 'Post programmé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const isActionable = ['draft', 'failed'].includes(post.status);
  const isPublishable = post.status === 'approved';
  const charCount = (editing ? editContent : post.content).length;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Header: Platform + Status */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md ${platform.bgColor}`}>
              <PlatformIcon className={`w-4 h-4 ${platform.color}`} />
              <span className={`text-sm font-medium ${platform.color}`}>{platform.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${status.variant}`}>{status.label}</Badge>
              {post.scheduled_for && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(post.scheduled_for).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Media preview */}
          {(mediaUrl || post.media_url) && (
            <div className="w-full h-32 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
              <img
                src={mediaUrl || post.media_url || ''}
                alt="Media"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center gap-2 text-gray-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Image</span></div>';
                }}
              />
            </div>
          )}

          {/* Content */}
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">CTA</label>
                  <Input
                    value={editCta}
                    onChange={(e) => setEditCta(e.target.value)}
                    placeholder="Call to action..."
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Hashtags (séparés par des virgules)</label>
                  <Input
                    value={editHashtags}
                    onChange={(e) => setEditHashtags(e.target.value)}
                    placeholder="papeterie, rentrée..."
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{charCount} caractères</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
                  <Button size="sm" onClick={handleSave} disabled={updatePost.isPending} className="gap-1">
                    {updatePost.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Sauvegarder
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.hashtags.map((h, i) => (
                    <span key={i} className="text-xs text-blue-600">#{h}</span>
                  ))}
                </div>
              )}
              {post.cta_text && (
                <p className="text-xs text-muted-foreground mt-1">CTA: {post.cta_text}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{charCount} caractères</p>
            </div>
          )}

          {/* Error message */}
          {post.error_message && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {post.error_message}
            </div>
          )}

          {/* Actions */}
          {!editing && post.status !== 'published' && post.status !== 'skipped' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {isActionable && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1 text-xs">
                    <Edit3 className="w-3 h-3" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleApprove} disabled={approvePost.isPending} className="gap-1 text-xs">
                    {approvePost.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Approuver
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSkip} disabled={skipPost.isPending} className="gap-1 text-xs text-muted-foreground">
                    <SkipForward className="w-3 h-3" /> Ignorer
                  </Button>
                </>
              )}
              {isPublishable && (
                <>
                  <Button size="sm" onClick={handlePublish} disabled={publishPost.isPending} className="gap-1 text-xs">
                    {publishPost.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Publier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} className="gap-1 text-xs">
                    <Clock className="w-3 h-3" /> Programmer
                  </Button>
                </>
              )}
              {post.status === 'failed' && (
                <Button variant="outline" size="sm" onClick={handleApprove} disabled={approvePost.isPending} className="gap-1 text-xs">
                  <RefreshCw className="w-3 h-3" /> Réessayer
                </Button>
              )}
            </div>
          )}

          {/* Published info */}
          {post.status === 'published' && post.published_at && (
            <p className="text-xs text-green-600">
              Publié le {new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </CardContent>
      </Card>

      <SocialScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onConfirm={handleSchedule}
        isPending={schedulePost.isPending}
      />
    </>
  );
}
