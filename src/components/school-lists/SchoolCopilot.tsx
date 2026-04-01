import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Wand2, ArrowLeft, RotateCcw, Clock, ShieldCheck,
  Upload, Search, Brain, Link, Check, Package, ListChecks,
} from 'lucide-react';
import { useSchoolCopilot, type SchoolListCart, type SchoolListMatch, type StepState } from '@/hooks/useSchoolCopilot';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import CopilotUpload from './CopilotUpload';
import CopilotCarts from './CopilotCarts';
import SchoolListResults from './SchoolListResults';

type Step = 'upload' | 'processing' | 'results';

const SchoolCopilot = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const {
    state,
    uploading,
    matches, carts,
    stats, classe, ecole,
    uploadFile, processUpload, addSelectedToCart, reset,
  } = useSchoolCopilot();

  const handleUpload = async (file: File, schoolName?: string, classLevel?: string) => {
    trackEvent('upload_started', { fileType: file.type, fileSize: file.size, schoolName, classLevel });

    const upload = await uploadFile(file, schoolName, classLevel);
    if (!upload) return;

    setStep('processing');
    trackEvent('copilot_step_changed', { step: 'processing' });

    // Pipeline unifié : OCR + parsing + matching en un seul appel
    const result = await processUpload(upload.id);
    if (!result) {
      setStep('upload');
      return;
    }

    setStep('results');
    trackEvent('copilot_step_changed', {
      step: 'results',
      matched: result.matched,
      unmatched: result.unmatched,
      items_count: result.items_count,
    });
  };

  const handleReset = () => {
    reset();
    setStep('upload');
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <Wand2 className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">Connectez-vous pour utiliser le copilote</p>
          <p className="text-sm text-muted-foreground">
            Le copilote scolaire nécessite un compte pour sauvegarder vos listes.
          </p>
          <Button asChild variant="default">
            <a href="/auth">Se connecter</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de progression 4 étapes */}
      {step !== 'upload' && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Nouvelle liste
          </Button>
          <div className="flex-1" />
          <ProgressSteps state={state} />
        </div>
      )}

      {/* Étape upload */}
      {step === 'upload' && (
        <CopilotUpload onUpload={handleUpload} uploading={uploading} />
      )}

      {/* Étape traitement (4 sous-étapes animées) */}
      {step === 'processing' && (
        <Card>
          <CardContent className="p-8 md:p-12 space-y-6">
            <ProcessingSteps state={state} />
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ~15 secondes</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Données sécurisées</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape résultats (onglets Paniers + Détail) */}
      {step === 'results' && (
        <>
          <CartComparativeSummary carts={carts} matches={matches} />

          <Tabs defaultValue="detail" className="w-full">
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="detail" className="gap-1.5">
                <ListChecks className="w-4 h-4" />
                Détail articles
              </TabsTrigger>
              <TabsTrigger value="paniers" className="gap-1.5">
                <Package className="w-4 h-4" />
                3 Paniers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="mt-4">
              <SchoolListResults
                matches={matches}
                stats={stats}
                classe={classe}
                ecole={ecole}
                onAddToCart={addSelectedToCart}
              />
            </TabsContent>

            <TabsContent value="paniers" className="mt-4">
              <CopilotCarts carts={carts} />
            </TabsContent>
          </Tabs>

          <div className="text-center pt-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Traiter une autre liste
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Barre de progression 4 étapes (chips) ──────────────────────────────────

const STEPS_ORDER: StepState[] = ['uploading', 'ocr_processing', 'parsing', 'matching'];

const STEP_LABELS: Record<string, string> = {
  uploading: 'Upload',
  ocr_processing: 'OCR',
  parsing: 'Analyse',
  matching: 'Matching',
};

const ProgressSteps = ({ state }: { state: StepState }) => {
  const currentIdx = STEPS_ORDER.indexOf(state);
  const isDone = state === 'results';

  return (
    <div className="flex gap-1.5 text-xs">
      {STEPS_ORDER.map((s, i) => {
        const done = isDone || i < currentIdx;
        const active = !isDone && i === currentIdx;
        return (
          <div
            key={s}
            className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
              active
                ? 'bg-primary text-primary-foreground'
                : done
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {done && <Check className="w-3 h-3" />}
            {STEP_LABELS[s]}
          </div>
        );
      })}
    </div>
  );
};

// ── Étapes de traitement animées ───────────────────────────────────────────

interface ProcessingStep {
  key: StepState;
  icon: typeof Upload;
  label: string;
  detail: string;
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { key: 'uploading', icon: Upload, label: 'Envoi du fichier', detail: 'Transfert vers le serveur...' },
  { key: 'ocr_processing', icon: Search, label: 'Lecture du document', detail: 'GLM-OCR analyse votre liste...' },
  { key: 'parsing', icon: Brain, label: 'Identification des articles', detail: 'L\'IA structure les données...' },
  { key: 'matching', icon: Link, label: 'Recherche dans le catalogue', detail: 'Association avec nos 45 000 produits...' },
];

const ProcessingSteps = ({ state }: { state: StepState }) => {
  const currentIdx = STEPS_ORDER.indexOf(state);

  return (
    <div className="space-y-3 max-w-md mx-auto">
      {PROCESSING_STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = s.icon;

        return (
          <div
            key={s.key}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              active ? 'bg-primary/5 border border-primary/20' : ''
            }`}
          >
            <div className="shrink-0">
              {done ? (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              ) : active ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                {s.label}
              </p>
              {active && (
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Résumé comparatif (réutilisé) ──────────────────────────────────────────

const CartComparativeSummary = ({ carts, matches }: { carts: SchoolListCart[]; matches: SchoolListMatch[] }) => {
  if (!carts.length) return null;

  const unmatched = matches.filter(m => m.match_status === 'unmatched').length;
  const ambiguous = matches.filter(m => m.match_status === 'partial').length;
  const sorted = [...carts].sort((a, b) => a.total_ttc - b.total_ttc);
  const cheapest = sorted[0];
  const priciest = sorted[sorted.length - 1];
  const savings = priciest ? (priciest.total_ttc - cheapest.total_ttc) : 0;

  return (
    <div className="bg-muted/40 border rounded-xl p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Articles trouvés</p>
          <p className="text-lg font-bold">{matches.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Fourchette de prix</p>
          <p className="text-lg font-bold">
            {cheapest?.total_ttc?.toFixed(0)}€ — {priciest?.total_ttc?.toFixed(0)}€
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Économie possible</p>
          <p className="text-lg font-bold text-green-600">{savings.toFixed(0)}€</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">À vérifier</p>
          <p className="text-lg font-bold text-amber-600">
            {ambiguous + unmatched}
            {(ambiguous + unmatched) > 0 && <span className="text-xs font-normal ml-1">article{(ambiguous + unmatched) > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolCopilot;
