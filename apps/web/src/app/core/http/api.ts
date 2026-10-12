import type { ApiErrorBody, ErrorCode } from '@lavio/shared';

/** Préfixe des appels à l'API (proxifié vers le projet lavio-api, même domaine). */
export const API_BASE = '/api/v1';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR';

/** Erreur d'API normalisée, toujours avec un message en français affichable. */
export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Erreur réseau : la requête n'a pas atteint le serveur (coupure brève, hors ligne). */
  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}

export const NETWORK_ERROR_MESSAGE = 'Connexion impossible. Vérifiez votre réseau puis réessayez.';
export const UNKNOWN_ERROR_MESSAGE = 'Une erreur est survenue. Réessayez dans quelques instants.';

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}
