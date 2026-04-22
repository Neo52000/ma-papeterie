import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Send, MessageCircle, Plus, Archive, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import {
  useCoachConversations,
  useCoachMessages,
  useSendCoachMessage,
  useArchiveConversation,
} from '@/hooks/usePilotageCoach';
import { DATA_NOIR } from '../_shared/colors';
import { formatRelativeDate } from '../_shared/formatters';
import { CoachMessage } from './CoachMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// Prompts suggérés pour démarrer une conversation
const STARTER_PROMPTS = [
  "Fais un bilan de ma semaine et pointe ce qui cloche",
  "Mes marges sont-elles bonnes par rapport au secteur papeterie ?",
  "Comment améliorer mon panier moyen B2C ?",
  "Quels produits devrais-je pousser sur la rentrée scolaire ?",
  "Ma trésorerie tient-elle la route pour les 30 prochains jours ?",
  "Challenge-moi sur mes objectifs du mois",
];

export function CoachChat() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  // Prénom extrait du user_metadata.display_name ou fallback sur la partie locale de l'email
  const firstName =
    (user?.user_metadata?.display_name as string | undefined)?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    null;

  const { data: conversations } = useCoachConversations();
  const { data: messages, isLoading: messagesLoading } = useCoachMessages(activeConvId);
  const sendMessage = useSendCoachMessage();
  const archiveConv = useArchiveConversation();

  // Auto-scroll sur nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;
    setDraft('');
    const result = await sendMessage.mutateAsync({
      conversationId: activeConvId,
      message: text,
      includeKpiContext: true,
    });
    if (!activeConvId) {
      setActiveConvId(result.conversation_id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter ou Enter simple (pas Shift+Enter) pour envoyer
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('flex h-full', DATA_NOIR.bg)}>
      {/* Liste des conversations */}
      <aside
        className={cn(
          'w-72 border-r flex flex-col',
          DATA_NOIR.bgBorder
        )}
      >
        <div className={cn('p-4 border-b', DATA_NOIR.bgBorder)}>
          <Button
            onClick={() => setActiveConvId(null)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {!conversations || conversations.length === 0 ? (
            <div className={cn('text-center py-8 text-sm', DATA_NOIR.textMuted)}>
              Aucune conversation
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConvId(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md transition-colors mb-1 group',
                  activeConvId === conv.id
                    ? 'bg-zinc-800'
                    : 'hover:bg-zinc-900'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-sm font-medium truncate',
                        activeConvId === conv.id ? DATA_NOIR.textPrimary : DATA_NOIR.textSecondary
                      )}
                    >
                      {conv.title}
                    </div>
                    <div className={cn('text-xs mt-0.5', DATA_NOIR.textMuted)}>
                      {formatRelativeDate(conv.last_message_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      archiveConv.mutate(conv.id);
                      if (activeConvId === conv.id) setActiveConvId(null);
                    }}
                    className={cn(
                      'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded',
                      DATA_NOIR.textMuted,
                      'hover:bg-zinc-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500'
                    )}
                    title="Archiver"
                    aria-label={`Archiver la conversation "${conv.title}"`}
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Zone de chat */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className={cn('px-6 py-4 border-b flex items-center gap-3', DATA_NOIR.bgBorder)}>
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              DATA_NOIR.infoBg
            )}
          >
            <Sparkles className={cn('h-4 w-4', DATA_NOIR.info)} />
          </div>
          <div>
            <h2 className={cn('text-base font-semibold', DATA_NOIR.textPrimary)}>
              Coach IA
            </h2>
            <p className={cn('text-xs', DATA_NOIR.textMuted)}>
              Franc-jeu, bienveillant, intransigeant — contextualisé par tes KPI
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-4">
          {!activeConvId && (!messages || messages.length === 0) ? (
            <WelcomeScreen
              firstName={firstName}
              onPromptClick={(prompt) => {
                setDraft(prompt);
              }}
            />
          ) : messagesLoading ? (
            <div className={cn('text-center py-8 text-sm', DATA_NOIR.textMuted)}>
              Chargement…
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages?.map(msg => (
                <CoachMessage key={msg.id} message={msg} />
              ))}
              {sendMessage.isPending && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Le coach réfléchit…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className={cn('p-4 border-t', DATA_NOIR.bgBorder)}>
          <div className="max-w-3xl mx-auto">
            <div
              className={cn(
                'rounded-xl border flex items-end gap-2 p-2',
                DATA_NOIR.bgCard,
                DATA_NOIR.bgBorder,
                'focus-within:border-zinc-600'
              )}
            >
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pose ta question au coach…"
                rows={1}
                className={cn(
                  'flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-48',
                  DATA_NOIR.textPrimary
                )}
              />
              <Button
                onClick={handleSend}
                disabled={!draft.trim() || sendMessage.isPending}
                size="icon"
                className="bg-zinc-200 hover:bg-zinc-100 text-zinc-900 shrink-0"
                aria-label={sendMessage.isPending ? 'Envoi en cours' : 'Envoyer le message'}
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <p className={cn('text-[10px] mt-2 text-center', DATA_NOIR.textMuted)}>
              Chaque réponse intègre tes KPI en temps réel (CA, marge, objectifs, alertes)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function WelcomeScreen({
  firstName,
  onPromptClick,
}: {
  firstName: string | null;
  onPromptClick: (prompt: string) => void;
}) {
  const greeting = firstName ? `Salut ${firstName}.` : 'Salut.';
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-8">
        <div
          className={cn(
            'inline-flex h-12 w-12 rounded-xl items-center justify-center mb-4',
            DATA_NOIR.infoBg
          )}
        >
          <MessageCircle className={cn('h-6 w-6', DATA_NOIR.info)} />
        </div>
        <h3 className={cn('text-2xl font-semibold mb-2', DATA_NOIR.textPrimary)}>
          {greeting} Prêt à piloter ?
        </h3>
        <p className={cn('text-sm', DATA_NOIR.textSecondary)}>
          Je connais tes chiffres en temps réel. Pose-moi une vraie question ou choisis ci-dessous.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {STARTER_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPromptClick(prompt)}
            className={cn(
              'text-left p-3 rounded-lg border text-sm transition-colors',
              DATA_NOIR.bgCard,
              DATA_NOIR.bgBorder,
              DATA_NOIR.textSecondary,
              'hover:bg-zinc-900 hover:text-zinc-100'
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
