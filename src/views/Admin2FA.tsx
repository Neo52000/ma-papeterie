import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/stores/authStore';
import {
  use2FAStatus,
  useDisableTOTP,
  useEnrollTOTP,
  useVerifyTOTP,
} from '@/hooks/use2FA';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Copy, Loader2, Shield, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export default function Admin2FA() {
  const navigate = useNavigate();
  const { user, mfaLevel } = useAuth();
  const { data: status, isLoading, error } = use2FAStatus();
  const enroll = useEnrollTOTP();
  const verify = useVerifyTOTP();
  const disable = useDisableTOTP();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');

  if (!user) return null;

  const verifiedFactor = status?.factors.find((factor) => factor.status === 'verified');
  const unverifiedFactor = status?.factors.find((factor) => factor.status === 'unverified');
  const requiresChallenge = Boolean(verifiedFactor && mfaLevel !== 'aal2');

  const startEnrollment = async () => {
    // A page refresh loses the one-time QR code. Remove that stale factor before
    // enrolling again so the user cannot be blocked by the factor limit.
    if (unverifiedFactor) await disable.mutateAsync(unverifiedFactor.id);
    const data = await enroll.mutateAsync();
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setCode('');
  };

  const submitCode = async (factorId: string) => {
    if (!/^\d{6}$/.test(code)) {
      toast.error('Le code doit contenir exactement 6 chiffres');
      return;
    }
    await verify.mutateAsync({ factorId, code });
    setEnrollment(null);
    setCode('');
    navigate('/admin', { replace: true });
  };

  const cancelEnrollment = async () => {
    if (enrollment) await disable.mutateAsync(enrollment.factorId);
    setEnrollment(null);
    setCode('');
  };

  const copySecret = async () => {
    if (!enrollment) return;
    await navigator.clipboard.writeText(enrollment.secret);
    toast.success('Secret copié');
  };

  return (
    <AdminLayout title="Authentification à deux facteurs">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Authentification à deux facteurs</h1>
          <p className="mt-2 text-muted-foreground">
            Le MFA Supabase natif protège l'accès aux fonctions et données administratives.
          </p>
        </div>

        {isLoading && (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>Impossible de charger l'état MFA. Réessayez avant d'accéder à l'administration.</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Protection du compte</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                {mfaLevel === 'aal2' ? (
                  <Badge className="bg-green-100 text-green-800">AAL2 vérifié</Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800">Vérification requise</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {mfaLevel === 'aal2' && verifiedFactor && (
                <>
                  <Alert className="border-green-200 bg-green-50">
                    <Check className="h-4 w-4 text-green-700" />
                    <AlertDescription className="text-green-800">
                      Cette session a validé son second facteur. L'administration est accessible.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button onClick={() => navigate('/admin')}>Continuer vers l'administration</Button>
                    <Button
                      variant="destructive"
                      disabled={disable.isPending}
                      onClick={() => disable.mutate(verifiedFactor.id)}
                    >
                      Désactiver ce facteur
                    </Button>
                  </div>
                </>
              )}

              {requiresChallenge && verifiedFactor && (
                <div className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50">
                    <Shield className="h-4 w-4 text-amber-700" />
                    <AlertDescription className="text-amber-900">
                      Saisissez le code actuel de votre application d'authentification.
                    </AlertDescription>
                  </Alert>
                  <Input
                    aria-label="Code d'authentification"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center font-mono text-2xl tracking-widest"
                  />
                  <Button
                    className="w-full"
                    disabled={code.length !== 6 || verify.isPending}
                    onClick={() => submitCode(verifiedFactor.id)}
                  >
                    Vérifier et continuer
                  </Button>
                </div>
              )}

              {!verifiedFactor && !enrollment && (
                <div className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50">
                    <ShieldAlert className="h-4 w-4 text-amber-700" />
                    <AlertDescription className="text-amber-900">
                      Un facteur TOTP est obligatoire pour les comptes administrateurs.
                    </AlertDescription>
                  </Alert>
                  <Button className="w-full" disabled={enroll.isPending} onClick={startEnrollment}>
                    <Shield className="mr-2 h-4 w-4" />
                    Configurer une application d'authentification
                  </Button>
                </div>
              )}

              {enrollment && (
                <div className="space-y-5">
                  <div className="rounded-lg border bg-white p-4 text-center">
                    <img
                      src={enrollment.qrCode}
                      alt="Code QR d'inscription TOTP"
                      className="mx-auto h-52 w-52"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Secret de saisie manuelle</p>
                    <div className="flex gap-2">
                      <code className="min-w-0 flex-1 break-all rounded border bg-muted p-3 text-sm">
                        {enrollment.secret}
                      </code>
                      <Button variant="outline" size="icon" onClick={copySecret} aria-label="Copier le secret">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    aria-label="Premier code d'authentification"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center font-mono text-2xl tracking-widest"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelEnrollment} disabled={disable.isPending}>
                      Annuler
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={code.length !== 6 || verify.isPending}
                      onClick={() => submitCode(enrollment.factorId)}
                    >
                      Activer et vérifier
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            En cas de perte de l'appareil, un super-administrateur doit supprimer le facteur depuis Supabase Auth après avoir vérifié l'identité du titulaire. Aucun code de secours personnalisé n'est conservé dans la base applicative.
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
}
