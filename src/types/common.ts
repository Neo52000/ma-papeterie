/** Typed address structure for shipping/billing */
export interface Address {
  street?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

/** Standard application error shape */
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/** Safely convert any caught value to an AppError */
export function toAppError(err: unknown): AppError {
  if (err instanceof Error) return { message: err.message };
  if (typeof err === 'string') return { message: err };
  return { message: 'Erreur inconnue' };
}
