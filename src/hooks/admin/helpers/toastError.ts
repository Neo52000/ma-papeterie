import { toast } from 'sonner';

/** Affiche un toast d'erreur normalisé — élimine le pattern dupliqué dans tous les handlers. */
export function toastError(err: unknown, fallback = 'Erreur inconnue') {
  toast.error(`Erreur : ${err instanceof Error ? err.message : fallback}`);
}
