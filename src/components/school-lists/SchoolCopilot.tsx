import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft, RotateCcw } from 'lucide-react';
import { useSchoolCopilot } from '@/hooks/useSchoolCopilot';
import { useAuth } from '@/contexts/AuthContext';
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
    const upload = await uploadFile(file, schoolName, classLevel);
    if (!upload) return;

    setStep('processing');

    // Step 1: OCR / Extract
    const extracted = await processUpload(upload.id);
    if (!extracted) {
      setStep('upload');
      return;
    }

    setStep('matching');

    // Step 2: Match products
    const matched = await matchProducts(upload.id);
    if (!matched) {
      setStep('upload');
      return;
    }

    setStep('results');
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
                  ? 'L\'IA analyse votre liste scolaire'
                  : 'Création de vos 3 paniers Essentiel / Équilibré / Premium'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results step */}
      {step === 'results' && (
        <>
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
