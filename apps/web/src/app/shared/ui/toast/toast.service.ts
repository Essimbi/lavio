import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError, UNKNOWN_ERROR_MESSAGE } from '../../../core/http/api';

/** Messages brefs (docs/08) : succès en ton simple, erreurs en français, annoncés aux lecteurs d'écran. */
@Injectable({ providedIn: 'root' })
export class Toast {
  private readonly snack = inject(MatSnackBar);

  success(message: string): void {
    this.snack.open(message, 'Fermer', {
      duration: 4000,
      politeness: 'polite',
      panelClass: 'lv-toast',
    });
  }

  error(error: unknown): void {
    const message = error instanceof ApiError ? error.message : UNKNOWN_ERROR_MESSAGE;
    this.snack.open(message, 'Fermer', {
      duration: 7000,
      politeness: 'assertive',
      panelClass: ['lv-toast', 'lv-toast-error'],
    });
  }
}

/** Message d'erreur affichable pour un formulaire. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : UNKNOWN_ERROR_MESSAGE;
}
