import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, AlertTriangle, Activity, BarChart3, Bug } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSentryConfig() {
  const { user } = useAuth();
  const [sentryDsn, setSentryDsn] = useState(import.meta.env.VITE_SENTRY_DSN || '');
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const handleCopyDsn = () => {
    navigator.clipboard.writeText(sentryDsn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('DSN copié');
  };

  const isSentryEnabled = !!import.meta.env.VITE_SENTRY_DSN;

  return (
    <AdminLayout title="Configuration Sentry">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuration Sentry</h1>
          <p className="text-gray-600 mt-2">
            Suivi des erreurs et monitoring de performance en temps réel
          </p>
        </div>

        {/* Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statut Sentry</CardTitle>
                <CardDescription>État du système de suivi des erreurs</CardDescription>
              </div>
              <Badge
                className={
                  isSentryEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }
              >
                {isSentryEnabled ? (
                  <>
                    <Check size={14} className="mr-1" />
                    Activé
                  </>
                ) : (
                  '⚠ Non configuré'
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSentryEnabled ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  ✓ Sentry est activé et fonctionne correctement
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Tous les erreurs et les événements de performance sont enregistrés
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠ Sentry n'est pas configuré
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Le suivi des erreurs et de la performance est désactivé
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Tabs defaultValue="setup" className="w-full">
          <TabsList>
            <TabsTrigger value="setup">Configuration</TabsTrigger>
            <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
            <TabsTrigger value="guide">Guide d'intégration</TabsTrigger>
          </TabsList>

          {/* ── Setup Tab ── */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Sentry</CardTitle>
                <CardDescription>
                  Configurez votre compte Sentry pour le suivi des erreurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* DSN Input */}
                <div className="space-y-2">
                  <Label htmlFor="sentry-dsn">DSN Sentry</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sentry-dsn"
                      type="password"
                      value={sentryDsn}
                      readOnly
                      placeholder="https://xxxxxxx@sentry.io/xxxxxx"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyDsn}
                    >
                      {copied ? (
                        <Check size={18} />
                      ) : (
                        <Copy size={18} />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Votre DSN est stocké dans les variables d'environnement (VITE_SENTRY_DSN)
                  </p>
                </div>

                {/* Instructions */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 ml-2">
                    <strong>Comment activer Sentry :</strong>
                    <ol className="mt-2 ml-4 space-y-1 text-sm list-decimal">
                      <li>Créez un compte sur <code className="bg-blue-100 px-1 rounded">sentry.io</code></li>
                      <li>Créez un projet pour votre application</li>
                      <li>Copiez votre DSN depuis les paramètres du projet</li>
                      <li>Ajoutez <code className="bg-blue-100 px-1 rounded">VITE_SENTRY_DSN</code> à vos variables d'environnement</li>
                      <li>Redéployez votre application</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* Environment Variables */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Variable d'environnement requise :</p>
                  <code className="text-sm font-mono bg-white p-2 rounded border block">
                    VITE_SENTRY_DSN=https://your-key@sentry.io/your-project
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Features Tab ── */}
          <TabsContent value="features">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Error Tracking */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bug size={20} />
                        Suivi des erreurs
                      </CardTitle>
                    </div>
                    {isSentryEnabled && <Badge className="bg-green-100 text-green-800">✓</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Capture automatique des exceptions JavaScript</p>
                  <p>• Erreurs non gérées dans React</p>
                  <p>• Erreurs réseau XHR/Fetch</p>
                  <p>• Stack traces complètes avec source maps</p>
                  <p>• Contexte utilisateur et environnement</p>
                </CardContent>
              </Card>

              {/* Performance Monitoring */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity size={20} />
                        Performance
                      </CardTitle>
                    </div>
                    {isSentryEnabled && <Badge className="bg-green-100 text-green-800">✓</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Suivi du temps de chargement des pages</p>
                  <p>• Transactions API et base de données</p>
                  <p>• Core Web Vitals (LCP, FID, CLS)</p>
                  <p>• Durée des requêtes externes</p>
                  <p>• Waterfall détaillé des requêtes</p>
                </CardContent>
              </Card>

              {/* Session Replay */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 size={20} />
                        Replay de sessions
                      </CardTitle>
                    </div>
                    {isSentryEnabled && <Badge className="bg-green-100 text-green-800">✓</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Enregistrement vidéo des sessions d'erreur</p>
                  <p>• Replay complet du parcours utilisateur</p>
                  <p>• Actions utilisateur et clics enregistrés</p>
                  <p>• Synchronisation avec les erreurs</p>
                  <p>• Masquage automatique des données sensibles</p>
                </CardContent>
              </Card>

              {/* Breadcrumbs */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        📍 Breadcrumbs
                      </CardTitle>
                    </div>
                    {isSentryEnabled && <Badge className="bg-green-100 text-green-800">✓</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Historique des actions utilisateur</p>
                  <p>• Transitions de navigation</p>
                  <p>• Changements de DOM</p>
                  <p>• Événements console (logs)</p>
                  <p>• Requêtes HTTP</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Integration Guide ── */}
          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>Guide d'intégration Sentry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">Étape 1 : Créer un compte Sentry</h3>
                    <p className="text-sm text-gray-600">
                      Allez sur <code className="bg-gray-100 px-1 rounded">sentry.io</code> et créez un compte gratuit
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">Étape 2 : Créer un projet React</h3>
                    <p className="text-sm text-gray-600">
                      Dans votre organisation Sentry, créez un nouveau projet avec la plateforme "React"
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">Étape 3 : Copier le DSN</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Allez dans Settings → Projects → Votre projet → Client Keys (DSN)
                    </p>
                    <code className="text-xs bg-gray-100 p-2 rounded block font-mono">
                      https://[email protected]/[projectId]
                    </code>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">Étape 4 : Ajouter au .env</h3>
                    <code className="text-xs bg-gray-100 p-2 rounded block font-mono">
                      VITE_SENTRY_DSN=votre_dsn_ici
                    </code>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold mb-2">Étape 5 : Redéployer</h3>
                    <p className="text-sm text-gray-600">
                      Commitez, poussez et redéployez votre application. Sentry sera automatiquement initialisé.
                    </p>
                  </div>
                </div>

                {/* Code Example */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Initialisation automatique :</p>
                  <code className="text-xs font-mono">
                    <div>import {'{initSentry}'} from '@/lib/sentry-config';</div>
                    <div>initSentry(); // Appelée dans main.tsx</div>
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
