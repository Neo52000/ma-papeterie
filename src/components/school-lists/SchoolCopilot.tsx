import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft, RotateCcw, Clock, ShieldCheck } from 'lucide-react';
import { useSchoolCopilot } from '@/hooks/useSchoolCopilot';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import CopilotUpload from './CopilotUpload';
import CopilotMatchTable from './CopilotMatchTable';
import CopilotCarts from './CopilotCarts';

type Step = 'upload' | 'processing' | 'matching' | 'results';

const SchoolCopilot = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const {
    uploading, processing, matching,
    currentUpload, matches, carts,
    uploadFile, processUpload, matchProducts, reset,
  } = useSchoolCopilot();

  const handleUpload = async (file: File, schoolName?: string, classLevel?: string) => {
    trackEvent('upload_started', { fileType: file.type, fileSize: file.size, schoolName, classLevel });

    const upload = await uploadFile(file, schoolName, classLevel);
    if (!upload) return;

    setStep('processing');
    trackEvent('copilot_step_changed', { step: 'processing' });

    // Step 1: OCR / Extract
    const extracted = await processUpload(upload.id);
    if (!extracted) {
      setStep('upload');
      return;
    }

    trackEvent('ocr_done', { itemsCount: extracted.items_count });
    setStep('matching');
    trackEvent('copilot_step_changed', { step: 'matching' });

    // Step 2: Match products
    const matched = await matchProducts(upload.id);
    if (!matched) {
      setStep('upload');
      return;
    }

    setStep('results');
    trackEvent('copilot_step_changed', { step: 'results', matched: matched.matched, unmatched: matched.unmatched });
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
      {/* Progress indicator */}
      {step !== 'upload' && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Nouvelle liste
          </Button>
          <div className="flex-1" />
          <div className="flex gap-2 text-xs">
            <StepIndicator label="Upload" active={false} done={true} />
            <StepIndicator label="Extraction" active={step === 'processing'} done={['matching', 'results'].includes(step)} />
            <StepIndicator label="Matching" active={step === 'matching'} done={step === 'results'} />
            <StepIndicator label="Résultats" active={step === 'results'} done={false} />
          </div>
        </div>
      )}

      {/* Upload step */}
      {step === 'upload' && (
        <CopilotUpload onUpload={handleUpload} uploading={uploading} />
      )}

      {/* Processing step */}
      {(step === 'processing' || step === 'matching') && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <p className="font-semibold text-lg">
                {step === 'processing' ? 'Extraction des articles...' : 'Recherche des meilleurs produits...'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 'processing'
                  ? 'L\'IA analyse votre liste scolaire — ça prend environ 15 secondes'
                  : 'Création de vos 3 paniers Essentiel / Équilibré / Premium — presque fini !'}
              </p>
            </div>
            {/* Reassurance during wait */}
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Temps estimé : 30s</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Données sécurisées</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results step */}
      {step === 'results' && (
        <>
          {/* Comparatif summary */}
          <CartComparativeSummary carts={carts} matches={matches} />

          <CopilotCarts carts={carts} />
          <CopilotMatchTable matches={matches} />
          
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

/** Comparative summary bar above the 3 cart cards */
const CartComparativeSummary = ({ carts, matches }: { carts: any[]; matches: any[] }) => {
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

const StepIndicator = ({ label, active, done }: { label: string; active: boolean; done: boolean }) => (
  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
    active ? 'bg-primary text-primary-foreground' :
    done ? 'bg-primary/20 text-primary' :
    'bg-muted text-muted-foreground'
  }`}>
    {label}
  </div>
);

export default SchoolCopilot;
