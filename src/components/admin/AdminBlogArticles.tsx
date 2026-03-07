import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  useGenerateBlogArticle,
  useBlogArticles,
  usePublishArticle,
  useDeleteArticle,
} from '@/hooks/useSEOMachineArticles';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Plus, Trash2, Eye, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const EXAMPLE_ARTICLES = [
  {
    keyword: 'papeterie scolaire',
    topic: 'Guide complet des fournitures scolaires',
    audience: 'Parents et enseignants',
  },
  {
    keyword: 'économiser papeterie',
    topic: 'Conseils pour économiser sur la papeterie',
    audience: 'Petits entrepreneurs',
  },
  {
    keyword: 'papier de qualité',
    topic: 'Comparaison des différents types de papier',
    audience: 'Professionnels',
  },
  {
    keyword: 'tampons professionnels',
    topic: 'Services de personnalisation : Tampons et plaques',
    audience: 'Petites entreprises',
  },
  {
    keyword: 'impression rapide',
    topic: 'Solutions d\'impression urgente pour les entreprises',
    audience: 'Entreprises pressées',
  },
  {
    keyword: 'gestion fournitures',
    topic: 'Comment gérer les fournitures de bureau efficacement',
    audience: 'Gestionnaires',
  },
  {
    keyword: 'papeterie durable',
    topic: 'Papeterie écologique : Guide complet',
    audience: 'Conscients environnement',
  },
  {
    keyword: 'matériel classe',
    topic: 'Aménagement de classe : Guide du matériel pédagogique',
    audience: 'Enseignants',
  },
  {
    keyword: 'petit matériel scolaire',
    topic: 'Petit matériel : Comment bien s\'équiper',
    audience: 'Étudiants et parents',
  },
  {
    keyword: 'activités créatives',
    topic: 'Coloriage et loisirs créatifs : Quoi choisir',
    audience: 'Parents et éducateurs',
  },
];

export function AdminBlogArticles() {
  const { toast } = useToast();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    keyword: '',
    topic: '',
    targetAudience: '',
  });

  // Mutations
  const generateArticle = useGenerateBlogArticle();
  const publishArticle = usePublishArticle();
  const deleteArticle = useDeleteArticle();

  // Queries
  const { data: articles = [], isLoading: articlesLoading } = useBlogArticles();

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
      });

      setFormData({ keyword: '', topic: '', targetAudience: '' });
      setShowNewDialog(false);

      toast({
        title: 'Article généré',
        description: `"${result.title}" a été créé avec succès`,
      });
    } catch (error) {
      toast({
        title: 'Erreur génération',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async (articleId: string) => {
    try {
      await publishArticle.mutateAsync(articleId);
      toast({
        title: 'Publié',
        description: 'Article publié avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de publier l\'article',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;

    try {
      await deleteArticle.mutateAsync(showDeleteDialog);
      setShowDeleteDialog(null);
      toast({
        title: 'Supprimé',
        description: 'Article supprimé avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const publishedCount = articles.filter((a) => a.published_at).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles de Blog</h1>
          <p className="text-gray-500 mt-1">
            Générez automatiquement des articles via Claude AI
          </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvel article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Générer un nouvel article</DialogTitle>
              <DialogDescription>
                Lancez une génération automatique via Claude AI
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGenerateArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mot-clé cible *
                </label>
                <Input
                  placeholder="ex: fournitures scolaires"
                  value={formData.keyword}
                  onChange={(e) =>
                    setFormData({ ...formData, keyword: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Sujet de l'article *
                </label>
                <Textarea
                  placeholder="ex: Guide complet des fournitures scolaires"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                  className="resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Audience cible
                </label>
                <Input
                  placeholder="ex: Parents et enseignants"
                  value={formData.targetAudience}
                  onChange={(e) =>
                    setFormData({ ...formData, targetAudience: e.target.value })
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={generateArticle.isPending}
              >
                {generateArticle.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Lancement...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Lancer la génération
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Publiés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
            <p className="text-xs text-gray-500 mt-1">articles en ligne</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Brouillons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {articles.length - publishedCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">prêts à publier</p>
          </CardContent>
        </Card>
      </div>

      {/* Generation Dialog */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            Tous ({articles.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Publiés ({publishedCount})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Brouillons ({articles.length - publishedCount})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Modèles
          </TabsTrigger>
        </TabsList>

        {/* All Articles Tab */}
        <TabsContent value="all" className="space-y-4">
          {articlesLoading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                <p className="text-gray-500 mt-2">Chargement...</p>
              </CardContent>
            </Card>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">
                  Aucun article. Lancez votre première génération.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Mot-clé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{article.title}</p>
                          <p className="text-xs text-gray-500">
                            {article.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {article.seo_machine_id
                          ? article.seo_machine_id.slice(0, 8)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`gap-1 ${getStatusBadgeColor(
                            article.seo_machine_status || 'pending'
                          )}`}
                        >
                          {getStatusIcon(article.seo_machine_status || 'pending')}
                          {article.seo_machine_status || 'pending'}
                        </Badge>
                        {article.published_at && (
                          <Badge className="ml-1 bg-green-100 text-green-800">
                            Publié
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {article.created_at
                          ? formatDistanceToNow(new Date(article.created_at), {
                              locale: fr,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedArticle(article.id)}
                          disabled={!article.content}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!article.published_at &&
                          article.seo_machine_status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublish(article.id)}
                              disabled={publishArticle.isPending}
                            >
                              Publier
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteDialog(article.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Published Tab */}
        <TabsContent value="published">
          <Card>
            <CardContent className="pt-6">
              {articles.filter((a) => a.published_at).length === 0 ? (
                <p className="text-gray-500 text-center">
                  Aucun article publié
                </p>
              ) : (
                <div className="space-y-2">
                  {articles
                    .filter((a) => a.published_at)
                    .map((article) => (
                      <div
                        key={article.id}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <a
                          href={`/blog/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {article.title}
                        </a>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drafts Tab */}
        <TabsContent value="drafts">
          <Card>
            <CardContent className="pt-6">
              {articles.filter((a) => !a.published_at).length === 0 ? (
                <p className="text-gray-500 text-center">
                  Aucun brouillon
                </p>
              ) : (
                <div className="space-y-2">
                  {articles
                    .filter((a) => !a.published_at)
                    .map((article) => (
                      <div
                        key={article.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{article.title}</p>
                          <p className="text-sm text-gray-500">
                            Créé{' '}
                            {article.created_at &&
                              formatDistanceToNow(new Date(article.created_at), {
                                locale: fr,
                              })}
                          </p>
                        </div>
                        {article.seo_machine_status === 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => handlePublish(article.id)}
                            disabled={publishArticle.isPending}
                          >
                            Publier
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modèles d'articles recommandés</CardTitle>
              <CardDescription>
                Utilisez ces modèles pour générer 10 articles optimisés SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {EXAMPLE_ARTICLES.map((example, idx) => (
                  <Card
                    key={idx}
                    className="p-3 border hover:border-blue-400 cursor-pointer transition"
                    onClick={() => {
                      setFormData({
                        keyword: example.keyword,
                        topic: example.topic,
                        targetAudience: example.audience,
                      });
                      setShowNewDialog(true);
                    }}
                  >
                    <p className="font-medium text-sm">{example.topic}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      🎯 {example.keyword}
                    </p>
                    <p className="text-xs text-gray-500">
                      👥 {example.audience}
                    </p>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer l'article ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible.
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
    </div>
  );
}
