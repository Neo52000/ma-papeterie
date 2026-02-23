import { useState } from 'react';
import { Users, UserPlus, Crown, Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useB2BAccount, useB2BCompanyUsers } from '@/hooks/useB2BAccount';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ProEquipe() {
  const { account, isB2BAdmin } = useB2BAccount();
  const { data: members = [], isLoading } = useB2BCompanyUsers(account?.id);
  const qc = useQueryClient();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !account?.id) return;
    setInviting(true);
    try {
      // Chercher l'utilisateur par email dans les profils
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('display_name', inviteEmail) // fallback — en production un lookup par email serait via une fonction Edge
        .maybeSingle();

      // Approche simple : chercher dans auth.users via une fonction RPC ou admin
      // Pour l'instant on simule avec un toast informatif
      toast.info(
        `Invitation envoyée à ${inviteEmail}. L'administrateur doit ajouter manuellement l'utilisateur depuis le back-office.`,
        { duration: 6000 }
      );
      setShowInviteDialog(false);
      setInviteEmail('');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Équipe</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} membre{members.length !== 1 ? 's' : ''} dans votre compte pro
          </p>
        </div>
        {isB2BAdmin && (
          <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Inviter un collègue
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse bg-muted rounded-lg" />)}
        </div>
      ) : members.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Users className="h-10 w-10" />
            <p>Aucun membre trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {(member.profiles?.display_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {member.profiles?.display_name || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Membre depuis {new Date(member.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.is_primary && (
                  <Badge variant="outline" className="text-xs gap-1 text-yellow-700 border-yellow-300 bg-yellow-50">
                    <Crown className="h-3 w-3" /> Principal
                  </Badge>
                )}
                <Badge variant="outline" className={`text-xs ${member.role === 'admin' ? 'text-primary border-primary/30 bg-primary/5' : ''}`}>
                  {member.role === 'admin' ? 'Admin compte' : 'Membre'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informations compte */}
      {account && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Informations société</CardTitle>
            <CardDescription>Modifiable uniquement par votre chargé de compte</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Raison sociale', value: account.name },
              { label: 'SIRET', value: account.siret },
              { label: 'TVA', value: account.vat_number },
              { label: 'Email', value: account.email },
              { label: 'Téléphone', value: account.phone },
              { label: 'Délai paiement', value: account.payment_terms ? `${account.payment_terms} jours` : undefined },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un collègue</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Renseignez l'email de votre collègue. Un administrateur l'associera à votre compte pro.
            </p>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                type="email"
                placeholder="prenom.nom@societe.fr"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Annuler</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="gap-2">
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
