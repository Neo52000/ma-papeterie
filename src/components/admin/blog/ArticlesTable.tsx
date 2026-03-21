import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Loader2,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Globe,
  FileText,
  Search,
  ArrowUpDown,
  Pencil,
  BookOpen,
  Type,
  Tag,
  Image,
  Wand2,
  Sparkles,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ArticlesTableProps {
  articles: any[];
  filteredArticles: any[];
  isLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  socialFilter: string;
  onSocialFilterChange: (value: string) => void;
  sortBy: 'date' | 'title';
  onSortByChange: (value: 'date' | 'title') => void;
  viewStats: { viewMap: Map<string, number> } | undefined;
  onPreview: (article: any) => void;
  onEdit: (article: any) => void;
  onPublish: (articleId: string) => void;
  onDelete: (articleId: string) => void;
  onNewArticle: () => void;
  onBooster: (article: { id: string; title: string }) => void;
  getSocialBadge: (articleId: string) => React.ReactNode;
  publishPending: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ArticlesTable({
  articles,
  filteredArticles,
  isLoading,
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  socialFilter,
  onSocialFilterChange,
  sortBy,
  onSortByChange,
  viewStats,
  onPreview,
  onEdit,
  onPublish,
  onDelete,
  onNewArticle,
  onBooster,
  getSocialBadge,
  publishPending,
}: ArticlesTableProps) {
  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, slug ou mot-clé..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
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
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
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
        <Select value={socialFilter} onValueChange={onSocialFilterChange}>
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
          onClick={() => onSortByChange(sortBy === 'date' ? 'title' : 'date')}
          title={sortBy === 'date' ? 'Tri par date' : 'Tri par titre'}
        >
          <ArrowUpDown className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
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
              <Button className="mt-4 gap-2" onClick={onNewArticle}>
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
                          onClick={() => onBooster({ id: article.id, title: article.title })}
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
                          onClick={() => onPreview(article)}
                          disabled={!article.content}
                          title="Prévisualiser"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEdit(article)}
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!article.published_at && article.seo_machine_status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => onPublish(article.id)}
                            disabled={publishPending}
                          >
                            Publier
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => onDelete(article.id)}
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
    </div>
  );
}
