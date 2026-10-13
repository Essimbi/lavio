import { computed, inject, Injectable, signal } from '@angular/core';
import type { NotificationSummary } from '@lavio/shared';
import { PressingApi } from '../api/pressing-api';

/** Intervalle de rafraîchissement des pastilles (pas de push en phase 3). */
const POLL_MS = 60_000;

/**
 * Compteurs du centre de notifications (non lues, validations en attente), rafraîchis
 * périodiquement tant que l'onglet est visible, et après chaque action qui les modifie.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenter {
  private readonly api = inject(PressingApi);
  private readonly summary = signal<NotificationSummary>({ unread: 0, pendingApprovals: 0 });
  private timer: ReturnType<typeof setInterval> | null = null;
  private users = 0;

  readonly unread = computed(() => this.summary().unread);
  readonly pendingApprovals = computed(() => this.summary().pendingApprovals);

  private readonly onVisible = () => {
    if (document.visibilityState === 'visible') void this.refresh();
  };

  async refresh(): Promise<void> {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      this.summary.set(await this.api.notificationSummary());
    } catch {
      // Compteurs indicatifs : une erreur passagère ne doit pas gêner l'écran courant.
    }
  }

  /** Démarre le rafraîchissement ; renvoie la fonction d'arrêt. */
  start(): () => void {
    this.users += 1;
    if (this.users === 1) {
      void this.refresh();
      this.timer = setInterval(() => void this.refresh(), POLL_MS);
      document.addEventListener('visibilitychange', this.onVisible);
    }
    return () => {
      this.users -= 1;
      if (this.users > 0) return;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      document.removeEventListener('visibilitychange', this.onVisible);
    };
  }
}
