// Erreur portée par une Edge Function lorsqu'un message explicite doit être
// renvoyé au client (configuration manquante, étape de setup obligatoire, etc.).
// Le handler détecte ce type d'erreur et renvoie le message tel quel au lieu
// de le sanitiser via safeErrorResponse.

export class UserFacingError extends Error {
  readonly status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}
