import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { use2FAStatus, useGenerateTOTPSecret, useEnableTOTP, useDisableTOTP } from '@/hooks/use2FA';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Check, Copy, Eye, EyeOff, Shield, QrCode, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function Admin2FA() {
  const { user } = useAuth();
  const { data: status } = use2FAStatus();
  const generateSecret = useGenerateTOTPSecret();
  const enableTOTP = useEnableTOTP();
  const disableTOTP = useDisableTOTP();

  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [step, setStep] = useState<'generate' | 'verify' | 'backup'>('generate');
  const [secret, setSecret] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);

  if (!user) return null;

  const handleStartSetup = async () => {
    const result = await generateSecret.mutateAsync();
    if (result) {
      setSecret(result.secret);
      setQrUri(result.uri);
      setStep('generate');
      setShowSetupDialog(true);
    }
  };

  const handleProceedToVerify = () => {
    setStep('verify');
    setVerifyCode('');
  };

  const handleVerifyCode = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Le code doit faire 6 chiffres');
      return;
    }

    const result = await enableTOTP.mutateAsync(verifyCode);
    if (result) {
      setBackupCodes(result.backup_codes || []);
      setStep('backup');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copié');
  };

  const handleDownloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Codes sauvegardés');
  };

  const handleConfirmDisable = async () => {
    await disableTOTP.mutateAsync();
    setShowDisableDialog(false);
  };

  return (
    <AdminLayout title="Authentification 2FA">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Authentification à deux facteurs</h1>
          <p className="text-gray-600 mt-2">
            Sécurisez votre compte administrateur avec une authentification à deux facteurs
          </p>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statut 2FA</CardTitle>
                <CardDescription>Email: {user.email}</CardDescription>
              </div>
              <div>
                {status?.totp_enabled ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check size={16} className="mr-1" />
                    Activée
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50">
                    🔓 Désactivée
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.totp_enabled ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  ✓ Votre compte est protégé par authentification à deux facteurs
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Un code d'authentification sera requis à chaque connexion
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠ Votre compte n'est pas protégé par 2FA
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Nous recommandons d'activer la 2FA pour sécuriser votre compte administrateur
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {!status?.totp_enabled ? (
                <Button onClick={handleStartSetup} className="bg-blue-600 hover:bg-blue-700">
                  <Shield size={16} className="mr-2" />
                  Activer 2FA
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Désactiver 2FA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 ml-2">
            <strong>Conseils de sécurité :</strong>
            <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
              <li>Conservez vos codes de sauvegarde dans un endroit sûr</li>
              <li>Ne partagez jamais votre secret ou vos codes</li>
              <li>Utilisez une application d'authentification comme Google Authenticator ou Authy</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Backup Codes */}
        {status?.totp_enabled && backupCodes.length === 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle>Codes de sauvegarde</CardTitle>
              <CardDescription>
                Conservez ces codes dans un endroit sûr. Vous pourrez les utiliser si vous perdez accès à votre appareil d'authentification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setShowBackupCodes(true)}>
                <Download size={16} className="mr-2" />
                Afficher et télécharger les codes
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Setup Dialog ── */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-2xl">
          {step === 'generate' && (
            <>
              <DialogHeader>
                <DialogTitle>Configurer l'authentification à deux facteurs</DialogTitle>
                <DialogDescription>
                  Étape 1 : Scannez le code QR avec une application d'authentification
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* QR Code Placeholder */}
                <div className="flex justify-center">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <QrCode size={64} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Code QR</p>
                      <p className="text-xs text-gray-400 mt-1">URI: {qrUri.substring(0, 30)}...</p>
                    </div>
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Ou saisissez manuellement ce code :
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-gray-50 rounded border font-mono text-sm break-all">
                      {secret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopySecret}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>

                {/* Compatible Apps */}
                <div className="p-4 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium mb-2">Applications compatibles :</p>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Google Authenticator</li>
                    <li>• Microsoft Authenticator</li>
                    <li>• Authy</li>
                    <li>• 1Password</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleProceedToVerify}>
                  Suivant
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'verify' && (
            <>
              <DialogHeader>
                <DialogTitle>Vérifier le code</DialogTitle>
                <DialogDescription>
                  Étape 2 : Entrez le code à 6 chiffres affiché dans votre application
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  maxLength={6}
                  className="text-2xl tracking-widest text-center font-mono"
                />
                <p className="text-xs text-gray-500">
                  Le code change toutes les 30 secondes
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('generate');
                    setVerifyCode('');
                  }}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyCode.length !== 6 || enableTOTP.isPending}
                >
                  Vérifier
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'backup' && (
            <>
              <DialogHeader>
                <DialogTitle>Codes de sauvegarde</DialogTitle>
                <DialogDescription>
                  Étape 3 : Conservez ces codes dans un endroit sûr
                </DialogDescription>
              </DialogHeader>

              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  Authentification à deux facteurs activée avec succès !
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-sm">
                  Utilisez l'un de ces codes si vous n'avez pas accès à votre appareil d'authentification :
                </p>
                <div className="p-4 bg-gray-50 rounded-lg border max-h-40 overflow-y-auto">
                  <code className="text-sm font-mono space-y-1">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="text-gray-700">
                        {code}
                      </div>
                    ))}
                  </code>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleDownloadBackupCodes}
                >
                  <Download size={16} className="mr-2" />
                  Télécharger
                </Button>
                <Button
                  onClick={() => {
                    setShowSetupDialog(false);
                    setStep('generate');
                    setSecret('');
                    setQrUri('');
                    setVerifyCode('');
                    setBackupCodes([]);
                  }}
                >
                  Terminé
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Disable Confirmation Dialog ── */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver 2FA</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ?
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Votre compte sera moins sécurisé sans 2FA.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDisable}
              disabled={disableTOTP.isPending}
            >
              Confirmer la désactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
