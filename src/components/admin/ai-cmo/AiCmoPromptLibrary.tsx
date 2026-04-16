import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, ExternalLink, Clock } from 'lucide-react';
import {
  AI_CMO_PROMPT_CATEGORIES,
  buildGithubUrl,
  type AiCmoPrompt,
} from '@/data/ai-cmo-prompts';

const DIFFICULTY_CONFIG: Record<AiCmoPrompt['difficulty'], { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  beginner: { label: 'Débutant', variant: 'secondary' },
  intermediate: { label: 'Intermédiaire', variant: 'default' },
  advanced: { label: 'Avancé', variant: 'destructive' },
};

export function AiCmoPromptLibrary() {
  const [search, setSearch] = useState('');
  const searchLower = search.toLowerCase().trim();

  const filteredCategories = useMemo(() => {
    if (!searchLower) return AI_CMO_PROMPT_CATEGORIES;

    return AI_CMO_PROMPT_CATEGORIES.map((cat) => ({
      ...cat,
      subcategories: cat.subcategories
        .map((sub) => ({
          ...sub,
          prompts: sub.prompts.filter(
            (p) =>
              p.title.toLowerCase().includes(searchLower) ||
              sub.name.toLowerCase().includes(searchLower) ||
              cat.name.toLowerCase().includes(searchLower),
          ),
        }))
        .filter((sub) => sub.prompts.length > 0),
    })).filter((cat) => cat.subcategories.length > 0);
  }, [searchLower]);

  const totalPrompts = AI_CMO_PROMPT_CATEGORIES.reduce(
    (acc, cat) => acc + cat.subcategories.reduce((a, s) => a + s.prompts.length, 0),
    0,
  );

  const filteredCount = filteredCategories.reduce(
    (acc, cat) => acc + cat.subcategories.reduce((a, s) => a + s.prompts.length, 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bibliothèque de prompts marketing</CardTitle>
        <CardDescription>
          {totalPrompts} prompts organisés en {AI_CMO_PROMPT_CATEGORIES.length} catégories
          — Source :{' '}
          <a
            href="https://github.com/AICMO/AiCMO-Marketing-Prompt-Collection"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            AiCMO Marketing Prompt Collection
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un prompt, une catégorie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {search && (
          <p className="text-sm text-muted-foreground">
            {filteredCount} résultat{filteredCount > 1 ? 's' : ''} sur {totalPrompts}
            {search && (
              <button
                className="ml-2 underline hover:text-foreground"
                onClick={() => setSearch('')}
              >
                Effacer
              </button>
            )}
          </p>
        )}

        {/* Categories accordion */}
        {filteredCategories.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Aucun prompt ne correspond à votre recherche
          </p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filteredCategories.map((cat, catIdx) => (
              <AccordionItem
                key={catIdx}
                value={`cat-${catIdx}`}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {cat.subcategories.reduce((a, s) => a + s.prompts.length, 0)}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Accordion type="multiple" className="space-y-1 ml-2">
                    {cat.subcategories.map((sub, subIdx) => (
                      <AccordionItem
                        key={subIdx}
                        value={`sub-${catIdx}-${subIdx}`}
                        className="border-l-2 border-muted pl-4"
                      >
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span>{sub.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {sub.prompts.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {sub.prompts.map((prompt, pIdx) => {
                              const diff = DIFFICULTY_CONFIG[prompt.difficulty];
                              return (
                                <div
                                  key={pIdx}
                                  className="flex items-center justify-between gap-3 p-2 rounded hover:bg-muted/50"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm truncate">{prompt.title}</span>
                                    <Badge variant={diff.variant} className="text-[10px] shrink-0">
                                      {diff.label}
                                    </Badge>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                      <Clock className="h-3 w-3" />
                                      {prompt.estimatedTime}
                                    </span>
                                  </div>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a
                                      href={buildGithubUrl(prompt.githubPath)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                      Ouvrir
                                    </a>
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
