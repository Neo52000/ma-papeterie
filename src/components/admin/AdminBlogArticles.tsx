import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  useGenerateBlogArticle,
  useBlogArticles,
  usePublishArticle,
  useUnpublishArticle,
  useDeleteArticle,
  useUpdateArticleContent,
  useBlogArticleViewStats,
} from '@/hooks/useSEOMachineArticles';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Globe,
  FileEdit,
  BarChart3,
  Type,
  Search,
  ArrowUpDown,
  Pencil,
  ExternalLink,
  BookOpen,
  Target,
  Users,
  Tag,
  Link2,
  FileText,
  Image,
  Wand2,
} from 'lucide-react';
import { SocialBoosterPanel } from './blog/SocialBoosterPanel';
import { SocialCampaignsList } from './blog/SocialCampaignsList';
import { SocialSettingsPanel } from './blog/SocialSettingsPanel';
import { useSocialCampaigns } from '@/hooks/useSocialBooster';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  seo: 'SEO',
  papeterie: 'Papeterie',
  conseils: 'Conseils',
};

const CATEGORY_COLORS: Record<string, string> = {
  seo: 'bg-blue-100 text-blue-700 border-blue-200',
  papeterie: 'bg-amber-100 text-amber-700 border-amber-200',
  conseils: 'bg-teal-100 text-teal-700 border-teal-200',
};

const EXAMPLE_ARTICLES = [
  {
    keyword: 'papeterie scolaire',
    topic: 'Guide complet des fournitures scolaires',
    audience: 'Parents et enseignants',
    category: 'papeterie',
  },
  {
    keyword: 'économiser papeterie',
    topic: 'Conseils pour économiser sur la papeterie',
    audience: 'Petits entrepreneurs',
    category: 'conseils',
  },
  {
    keyword: 'papier de qualité',
    topic: 'Comparaison des différents types de papier',
    audience: 'Professionnels',
    category: 'papeterie',
  },
  {
    keyword: 'tampons professionnels',
    topic: 'Services de personnalisation : Tampons et plaques',
    audience: 'Petites entreprises',
    category: 'papeterie',
  },
  {
    keyword: 'impression rapide',
    topic: "Solutions d'impression urgente pour les entreprises",
    audience: 'Entreprises pressées',
    category: 'conseils',
  },
  {
    keyword: 'gestion fournitures',
    topic: 'Comment gérer les fournitures de bureau efficacement',
    audience: 'Gestionnaires',
    category: 'conseils',
  },
  {
    keyword: 'papeterie durable',
    topic: 'Papeterie écologique : Guide complet',
    audience: 'Conscients environnement',
    category: 'papeterie',
  },
  {
    keyword: 'matériel classe',
    topic: 'Aménagement de classe : Guide du matériel pédagogique',
    audience: 'Enseignants',
    category: 'seo',
  },
  {
    keyword: 'petit matériel scolaire',
    topic: "Petit matériel : Comment bien s'équiper",
    audience: 'Étudiants et parents',
    category: 'papeterie',
  },
  {
    keyword: 'activités créatives',
    topic: 'Coloriage et loisirs créatifs : Quoi choisir',
    audience: 'Parents et éducateurs',
    category: 'conseils',
  },
];

// ─── Helper functions ────────────────────────────────────────────────────────

function getSeoMeta(article: any) {
  const meta = article.blog_seo_metadata;
  if (Array.isArray(meta) && meta.length > 0) return meta[0];
  if (meta && !Array.isArray(meta)) return meta;
  return null;
}

function getStatusBadge(status: string) {
  const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    completed: {
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      label: 'Généré',
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: <Clock className="w-3.5 h-3.5" />,
      label: 'En cours',
    },
    error: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: 'Erreur',
    },
  };
  const config = configs[status] || configs.pending;
  return (
    <Badge variant="outline" className={`gap-1 ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminBlogArticles() {
  const { toast } = useToast();

  // Dialogs
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [previewArticle, setPreviewArticle] = useState<any | null>(null);
  const [editArticle, setEditArticle] = useState<any | null>(null);
  const [boosterArticle, setBoosterArticle] = useState<{ id: string; title: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [socialFilter, setSocialFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    keyword: '',
    topic: '',
    targetAudience: '',
    category: 'papeterie',
    wordCount: '1500',
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    excerpt: '',
    imageUrl: '',
    content: '',
  });

  // Mutations
  const generateArticle = useGenerateBlogArticle();
  const publishArticle = usePublishArticle();
  const unpublishArticle = useUnpublishArticle();
  const deleteArticle = useDeleteArticle();
  const updateArticle = useUpdateArticleContent();

  // Queries
  const { data: articles = [], isLoading: articlesLoading } = useBlogArticles();
  const { data: campaigns = [] } = useSocialCampaigns();
  const { data: viewStats } = useBlogArticleViewStats();

  // Derived data
  const campaignStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    campaigns.forEach((c: any) => {
      if (c.article_id) map.set(c.article_id, c.status);
    });
    return map;
  }, [campaigns]);

  const publishedCount = useMemo(() => articles.filter((a) => a.published_at).length, [articles]);
  const draftCount = useMemo(() => articles.length - publishedCount, [articles, publishedCount]);

  const totalWords = useMemo(() => {
    return articles.reduce((sum, a) => {
      const meta = getSeoMeta(a);
      return sum + (meta?.word_count || 0);
    }, 0);
  }, [articles]);

  // Filtered and sorted articles
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.slug?.toLowerCase().includes(q) ||
          getSeoMeta(a)?.keywords?.some((k: string) => k.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }

    if (statusFilter === 'published') {
      result = result.filter((a) => a.published_at);
    } else if (statusFilter === 'draft') {
      result = result.filter((a) => !a.published_at);
    } else if (statusFilter === 'error') {
      result = result.filter((a) => a.seo_machine_status === 'error');
    }

    if (socialFilter !== 'all') {
      result = result.filter((a) => {
        const status = campaignStatusMap.get(a.id);
        if (socialFilter === 'none') return !status;
        if (socialFilter === 'generated') return status === 'generated' || status === 'draft';
        if (socialFilter === 'published') return status === 'published';
        if (socialFilter === 'failed') return status === 'failed';
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [articles, searchQuery, categoryFilter, statusFilter, socialFilter, sortBy, campaignStatusMap]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleGenerateArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.keyword || !formData.topic) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir le mot-clé et le sujet',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await generateArticle.mutateAsync({
        keyword: formData.keyword,
        topic: formData.topic,
        targetAudience: formData.targetAudience || undefined,
        wordCount: parseInt(formData.wordCount) || 1500,
      });

      setFormData({ keyword: '', topic: '', targetAudience: '', category: 'papeterie', wordCount: '1500' });
      setShowNewDialog(false);

      toast({
        title: 'Article généré !',
        description: `"${result.title}" a été créé avec succès`,
      });
    } catch (error) {
      toast({
        title: 'Erreur de génération',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async (articleId: string) => {
    try {
      await publishArticle.mutateAsync(articleId);
      toast({ title: 'Publié', description: 'Article publié avec succès' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible de publier l'article", variant: 'destructive' });
    }
  };

  const handleUnpublish = async (articleId: string) => {
    try {
      await unpublishArticle.mutateAsync(articleId);
      toast({ title: 'Dépublié', description: 'Article retiré de la publication' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible de dépublier l'article", variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;
    try {
      await deleteArticle.mutateAsync(showDeleteDialog);
      setShowDeleteDialog(null);
      setPreviewArticle(null);
      toast({ title: 'Supprimé', description: 'Article supprimé avec succès' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible de supprimer l'article", variant: 'destructive' });
    }
  };

  const handleOpenEdit = (article: any) => {
    setEditForm({
      title: article.title || '',
      excerpt: article.excerpt || '',
      imageUrl: article.image_url || '',
      content: article.content || '',
    });
    setEditArticle(article);
  };

  const handleSaveEdit = async () => {
    if (!editArticle) return;
    try {
      await updateArticle.mutateAsync({
        articleId: editArticle.id,
        title: editForm.title,
        content: editForm.content,
        excerpt: editForm.excerpt,
        imageUrl: editForm.imageUrl,
      });
      setEditArticle(null);
      setPreviewArticle(null);
      toast({ title: 'Sauvegardé', description: 'Article mis à jour avec succès' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible de sauvegarder l'article", variant: 'destructive' });
    }
  };

  const getSocialBadge = (articleId: string) => {
    const status = campaignStatusMap.get(articleId);
    if (!status) return null;
    const colors: Record<string, string> = {
      generated: 'bg-purple-50 text-purple-700 border-purple-200',
      draft: 'bg-gray-50 text-gray-600 border-gray-200',
      approved: 'bg-blue-50 text-blue-700 border-blue-200',
      published: 'bg-green-50 text-green-700 border-green-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[status] || 'bg-gray-50 text-gray-600'}`}>
        {status}
      </Badge>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles de Blog</h1>
          <p className="text-muted-foreground mt-1">
            Générez, gérez et publiez vos articles optimisés SEO via Claude AI
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 shadow-md">
              <Wand2 className="w-4 h-4" />
              Nouvel article IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Générer un nouvel article
              </DialogTitle>
              <DialogDescription>
                Claude AI va rédiger un article optimisé SEO à partir de vos paramètres
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGenerateArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Mot-clé cible <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="ex: fournitures scolaires"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Le mot-clé principal pour le référencement</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Sujet de l'article <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="ex: Guide complet des fournitures scolaires"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Catégorie</label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="papeterie">Papeterie</SelectItem>
                      <SelectItem value="conseils">Conseils</SelectItem>
                      <SelectItem value="seo">SEO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nombre de mots</label>
                  <Select
                    value={formData.wordCount}
                    onValueChange={(v) => setFormData({ ...formData, wordCount: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">~500 mots</SelectItem>
                      <SelectItem value="1000">~1 000 mots</SelectItem>
                      <SelectItem value="1500">~1 500 mots</SelectItem>
                      <SelectItem value="2000">~2 000 mots</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Audience cible</label>
                <Input
                  placeholder="ex: Parents et enseignants"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                />
              </div>

              <Separator />

              <Button type="submit" className="w-full gap-2" size="lg" disabled={generateArticle.isPending}>
                {generateArticle.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Lancer la génération
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Publiés</p>
                <p className="text-3xl font-bold mt-1">{publishedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">articles en ligne</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brouillons</p>
                <p className="text-3xl font-bold mt-1">{draftCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">prêts à publier</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <FileEdit className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vues totales</p>
                <p className="text-3xl font-bold mt-1">{viewStats?.totalViews ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">consultations</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mots générés</p>
                <p className="text-3xl font-bold mt-1">
                  {totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">contenu total</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Type className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="all">Tous ({articles.length})</TabsTrigger>
          <TabsTrigger value="published">Publiés ({publishedCount})</TabsTrigger>
          <TabsTrigger value="drafts">Brouillons ({draftCount})</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1">
            <Sparkles className="w-3 h-3" />
            Campagnes Social
          </TabsTrigger>
          <TabsTrigger value="social-settings">Réglages Social</TabsTrigger>
        </TabsList>

        {/* ─── All Articles Tab ──────────────────────────────────────── */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, slug ou mot-clé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="papeterie">Papeterie</SelectItem>
                <SelectItem value="conseils">Conseils</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="published">Publiés</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
                <SelectItem value="error">Erreurs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={socialFilter} onValueChange={setSocialFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Social" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous (social)</SelectItem>
                <SelectItem value="none">Non généré</SelectItem>
                <SelectItem value="generated">Généré</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortBy(sortBy === 'date' ? 'title' : 'date')}
              title={sortBy === 'date' ? 'Tri par date' : 'Tri par titre'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          {articlesLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-3">Chargement des articles...</p>
              </CardContent>
            </Card>
          ) : filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-lg font-medium mt-4">
                  {articles.length === 0 ? 'Aucun article' : 'Aucun résultat'}
                </h3>
                <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                  {articles.length === 0
                    ? 'Lancez votre première génération pour créer un article optimisé SEO.'
                    : 'Essayez de modifier vos filtres de recherche.'}
                </p>
                {articles.length === 0 && (
                  <Button className="mt-4 gap-2" onClick={() => setShowNewDialog(true)}>
                    <Wand2 className="w-4 h-4" />
                    Créer mon premier article
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[320px]">Article</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>SEO</TableHead>
                    <TableHead>Social</TableHead>
                    <TableHead>Vues</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => {
                    const meta = getSeoMeta(article);
                    const views = viewStats?.viewMap.get(article.id) || 0;

                    return (
                      <TableRow key={article.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {article.image_url ? (
                              <img
                                src={article.image_url}
                                alt=""
                                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                <Image className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[240px]">{article.title}</p>
                              <p className="text-xs text-muted-foreground truncate">/blog/{article.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {article.category ? (
                            <Badge
                              variant="outline"
                              className={CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-600'}
                            >
                              {CATEGORY_LABELS[article.category] || article.category}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(article.seo_machine_status || 'pending')}
                            {article.published_at && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                <Globe className="w-3 h-3" />
                                Publié
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {meta ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BookOpen className="w-3 h-3" />
                                {meta.reading_time || '?'} min
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Type className="w-3 h-3" />
                                {meta.word_count?.toLocaleString() || '?'} mots
                              </div>
                              {meta.keywords?.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Tag className="w-3 h-3" />
                                  {meta.keywords.length} mots-clés
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getSocialBadge(article.id)}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-purple-600 hover:text-purple-700 h-7 px-2"
                              onClick={() => setBoosterArticle({ id: article.id, title: article.title })}
                            >
                              <Sparkles className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            {views}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground" title={article.created_at ? format(new Date(article.created_at), 'PPP à HH:mm', { locale: fr }) : ''}>
                            {article.created_at
                              ? formatDistanceToNow(new Date(article.created_at), { locale: fr, addSuffix: true })
                              : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setPreviewArticle(article)}
                              disabled={!article.content}
                              title="Prévisualiser"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(article)}
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {!article.published_at && article.seo_machine_status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => handlePublish(article.id)}
                                disabled={publishArticle.isPending}
                              >
                                Publier
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => setShowDeleteDialog(article.id)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredArticles.length !== articles.length && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
                  {filteredArticles.length} sur {articles.length} articles affichés
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* ─── Published Tab ─────────────────────────────────────────── */}
        <TabsContent value="published">
          {articles.filter((a) => a.published_at).length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Globe className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-lg font-medium mt-4">Aucun article publié</h3>
                <p className="text-muted-foreground mt-1">Publiez vos brouillons pour les rendre visibles sur le blog.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {articles
                .filter((a) => a.published_at)
                .map((article) => {
                  const meta = getSeoMeta(article);
                  const views = viewStats?.viewMap.get(article.id) || 0;

                  return (
                    <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      {article.image_url && (
                        <div className="h-36 overflow-hidden">
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className={article.image_url ? 'pt-3 pb-4' : 'pt-5 pb-4'}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              {article.category && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${CATEGORY_COLORS[article.category] || ''}`}
                                >
                                  {CATEGORY_LABELS[article.category] || article.category}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                En ligne
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                            {article.excerpt && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          {meta?.reading_time && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {meta.reading_time} min
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {views} vues
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.published_at && formatDistanceToNow(new Date(article.published_at), { locale: fr, addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 h-7 text-xs"
                            asChild
                          >
                            <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                              Voir
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPreviewArticle(article)}>
                            <Eye className="w-3 h-3 mr-1" />
                            Aperçu
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenEdit(article)}>
                            <Pencil className="w-3 h-3 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-orange-600 hover:text-orange-700 ml-auto"
                            onClick={() => handleUnpublish(article.id)}
                            disabled={unpublishArticle.isPending}
                          >
                            Dépublier
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* ─── Drafts Tab ────────────────────────────────────────────── */}
        <TabsContent value="drafts">
          {articles.filter((a) => !a.published_at).length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileEdit className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-lg font-medium mt-4">Aucun brouillon</h3>
                <p className="text-muted-foreground mt-1">Tous vos articles sont publiés. Générez-en de nouveaux !</p>
                <Button className="mt-4 gap-2" onClick={() => setShowNewDialog(true)}>
                  <Wand2 className="w-4 h-4" />
                  Générer un article
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {articles
                .filter((a) => !a.published_at)
                .map((article) => {
                  const meta = getSeoMeta(article);
                  const isError = article.seo_machine_status === 'error';
                  const isReady = article.seo_machine_status === 'completed';
                  const isPending = article.seo_machine_status === 'pending';

                  return (
                    <Card
                      key={article.id}
                      className={`overflow-hidden transition-shadow hover:shadow-md ${isError ? 'border-red-200' : ''}`}
                    >
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              {getStatusBadge(article.seo_machine_status || 'pending')}
                              {article.category && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${CATEGORY_COLORS[article.category] || ''}`}
                                >
                                  {CATEGORY_LABELS[article.category] || article.category}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                            {article.excerpt && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
                            )}
                          </div>
                          {article.image_url && (
                            <img
                              src={article.image_url}
                              alt=""
                              className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          {meta?.reading_time && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {meta.reading_time} min
                            </span>
                          )}
                          {meta?.word_count && (
                            <span className="flex items-center gap-1">
                              <Type className="w-3 h-3" />
                              {meta.word_count.toLocaleString()} mots
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.created_at && formatDistanceToNow(new Date(article.created_at), { locale: fr, addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {isReady && (
                            <Button
                              size="sm"
                              className="gap-1 h-7 text-xs"
                              onClick={() => handlePublish(article.id)}
                              disabled={publishArticle.isPending}
                            >
                              <Globe className="w-3 h-3" />
                              Publier
                            </Button>
                          )}
                          {isPending && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Génération en cours...
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPreviewArticle(article)} disabled={!article.content}>
                            <Eye className="w-3 h-3 mr-1" />
                            Aperçu
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenEdit(article)}>
                            <Pencil className="w-3 h-3 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-600 ml-auto"
                            onClick={() => setShowDeleteDialog(article.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* ─── Templates Tab ─────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Modèles d'articles recommandés
              </CardTitle>
              <CardDescription>
                Cliquez sur un modèle pour pré-remplir le formulaire de génération
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {EXAMPLE_ARTICLES.map((example, idx) => (
                  <Card
                    key={idx}
                    className="p-4 border hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all group"
                    onClick={() => {
                      setFormData({
                        keyword: example.keyword,
                        topic: example.topic,
                        targetAudience: example.audience,
                        category: example.category || 'papeterie',
                        wordCount: '1500',
                      });
                      setShowNewDialog(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {example.topic}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="w-3 h-3" />
                            {example.keyword}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {example.audience}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[example.category] || ''}`}>
                        {CATEGORY_LABELS[example.category] || example.category}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Campaigns Tab */}
        <TabsContent value="campaigns">
          <SocialCampaignsList />
        </TabsContent>

        {/* Social Settings Tab */}
        <TabsContent value="social-settings">
          <SocialSettingsPanel />
        </TabsContent>
      </Tabs>

      {/* ─── Preview Sheet ───────────────────────────────────────────── */}
      <Sheet open={!!previewArticle} onOpenChange={(open) => !open && setPreviewArticle(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {previewArticle && (() => {
            const meta = getSeoMeta(previewArticle);
            const views = viewStats?.viewMap.get(previewArticle.id) || 0;

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-left pr-8">{previewArticle.title}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  {/* Status & actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(previewArticle.seo_machine_status || 'pending')}
                    {previewArticle.published_at && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                        <Globe className="w-3 h-3" />
                        Publié
                      </Badge>
                    )}
                    {previewArticle.category && (
                      <Badge variant="outline" className={CATEGORY_COLORS[previewArticle.category] || ''}>
                        {CATEGORY_LABELS[previewArticle.category] || previewArticle.category}
                      </Badge>
                    )}
                  </div>

                  {/* Image */}
                  {previewArticle.image_url && (
                    <img
                      src={previewArticle.image_url}
                      alt={previewArticle.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}

                  {/* Excerpt */}
                  {previewArticle.excerpt && (
                    <p className="text-sm italic text-muted-foreground border-l-2 pl-3">
                      {previewArticle.excerpt}
                    </p>
                  )}

                  {/* SEO Metadata */}
                  {meta && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4 pb-3 space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          Métadonnées SEO
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Temps de lecture</p>
                            <p className="font-medium">{meta.reading_time || '?'} min</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mots</p>
                            <p className="font-medium">{meta.word_count?.toLocaleString() || '?'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Vues</p>
                            <p className="font-medium">{views}</p>
                          </div>
                        </div>
                        {meta.target_audience && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Audience :</span>
                            <span>{meta.target_audience}</span>
                          </div>
                        )}
                        {meta.meta_description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Meta description</p>
                            <p className="text-xs bg-background rounded p-2 border">{meta.meta_description}</p>
                          </div>
                        )}
                        {meta.keywords?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Mots-clés</p>
                            <div className="flex flex-wrap gap-1">
                              {meta.keywords.map((kw: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(meta.internal_links?.length > 0 || meta.external_links?.length > 0) && (
                          <div className="flex gap-4 text-xs">
                            {meta.internal_links?.length > 0 && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Link2 className="w-3 h-3" />
                                {meta.internal_links.length} liens internes
                              </span>
                            )}
                            {meta.external_links?.length > 0 && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <ExternalLink className="w-3 h-3" />
                                {meta.external_links.length} liens externes
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Separator />

                  {/* Content */}
                  {previewArticle.content && (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                    />
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center gap-2 pb-4">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleOpenEdit(previewArticle)}>
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </Button>
                    {!previewArticle.published_at && previewArticle.seo_machine_status === 'completed' && (
                      <Button size="sm" className="gap-1" onClick={() => handlePublish(previewArticle.id)}>
                        <Globe className="w-3.5 h-3.5" />
                        Publier
                      </Button>
                    )}
                    {previewArticle.published_at && (
                      <>
                        <Button variant="outline" size="sm" className="gap-1" asChild>
                          <a href={`/blog/${previewArticle.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Voir en ligne
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-orange-600"
                          onClick={() => handleUnpublish(previewArticle.id)}
                        >
                          Dépublier
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-purple-600"
                      onClick={() => {
                        setBoosterArticle({ id: previewArticle.id, title: previewArticle.title });
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Social Booster
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-red-500 ml-auto"
                      onClick={() => setShowDeleteDialog(previewArticle.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ─── Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editArticle} onOpenChange={(open) => !open && setEditArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Modifier l'article
            </DialogTitle>
            <DialogDescription>
              Modifiez le titre, l'extrait, l'image et le contenu HTML
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Titre</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Extrait</label>
              <Textarea
                value={editForm.excerpt}
                onChange={(e) => setEditForm({ ...editForm, excerpt: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">URL de l'image</label>
              <Input
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                placeholder="https://..."
              />
              {editForm.imageUrl && (
                <img src={editForm.imageUrl} alt="Preview" className="mt-2 h-24 rounded-md object-cover" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Contenu (HTML)</label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={12}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditArticle(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateArticle.isPending} className="gap-2">
              {updateArticle.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ───────────────────────────────────────────── */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L'article et toutes ses métadonnées SEO seront supprimés.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteArticle.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteArticle.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Social Booster Panel ────────────────────────────────────── */}
      {boosterArticle && (
        <SocialBoosterPanel
          articleId={boosterArticle.id}
          articleTitle={boosterArticle.title}
          open={!!boosterArticle}
          onOpenChange={(open) => !open && setBoosterArticle(null)}
        />
      )}
    </div>
  );
}
