import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, FileText, Phone, Mail, MapPin, StickyNote,
  AlertCircle, RotateCcw, MousePointer, Eye,
} from "lucide-react";
import type { ClientInteraction } from "@/hooks/admin/useClientInteractions";

const INTERACTION_CONFIG: Record<string, {
  icon: typeof ShoppingCart;
  color: string;
  label: string;
}> = {
  order: { icon: ShoppingCart, color: "text-green-500", label: "Commande" },
  quote: { icon: FileText, color: "text-purple-500", label: "Devis" },
  email_sent: { icon: Mail, color: "text-blue-500", label: "Email envoye" },
  email_opened: { icon: Eye, color: "text-cyan-500", label: "Email ouvert" },
  email_clicked: { icon: MousePointer, color: "text-indigo-500", label: "Clic email" },
  call: { icon: Phone, color: "text-amber-500", label: "Appel" },
  visit: { icon: MapPin, color: "text-teal-500", label: "Visite" },
  note: { icon: StickyNote, color: "text-slate-500", label: "Note" },
  support: { icon: AlertCircle, color: "text-orange-500", label: "Support" },
  return: { icon: RotateCcw, color: "text-red-500", label: "Retour" },
};

const defaultConfig = { icon: StickyNote, color: "text-slate-400", label: "Autre" };

interface Props {
  interactions: ClientInteraction[];
  isLoading: boolean;
}

export function ClientTimeline({ interactions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Aucune interaction enregistree
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-1 p-4">
        {interactions.map((interaction, index) => {
          const config = INTERACTION_CONFIG[interaction.interaction_type] ?? defaultConfig;
          const Icon = config.icon;
          const date = new Date(interaction.created_at);
          const isLast = index === interactions.length - 1;

          return (
            <div key={interaction.id} className="flex gap-3 relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
              )}
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center z-10`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{interaction.subject ?? config.label}</p>
                    {interaction.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{interaction.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {interaction.channel && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {interaction.channel}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {date.toLocaleDateString("fr-FR")} {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
