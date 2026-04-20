import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';
import type { CoachMessage as CoachMessageType } from '@/types/pilotage';
import { DATA_NOIR } from '../_shared/colors';

interface CoachMessageProps {
  message: CoachMessageType;
}

export function CoachMessage({ message }: CoachMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          isUser ? 'bg-zinc-800' : DATA_NOIR.infoBg
        )}
      >
        {isUser ? (
          <User className={cn('h-4 w-4', DATA_NOIR.textSecondary)} />
        ) : (
          <Sparkles className={cn('h-4 w-4', DATA_NOIR.info)} />
        )}
      </div>

      {/* Bulle */}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
            : cn(DATA_NOIR.bgCard, 'border', DATA_NOIR.bgBorder, DATA_NOIR.textPrimary, 'rounded-tl-sm')
        )}
      >
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        {!isUser && message.tokens_output !== null && (
          <div className={cn('text-[10px] mt-2', DATA_NOIR.textMuted)}>
            {message.tokens_output} tokens
          </div>
        )}
      </div>
    </div>
  );
}
