import { HttpClient, HttpHeaders, type HttpRequest } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { API_BASE, ApiError } from '../http/api';
import { outbox } from './idb';

/** En-tête marquant un rejeu (jamais remis en file). */
export const REPLAY_HEADER = 'X-Lavio-Replay';

export interface QueuedWrite {
  id: string;
  userId: string;
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  label: string;
  createdAt: string;
  /** Erreur métier au rejeu : décision de l'utilisateur attendue. */
  error: string | null;
}

/** Écritures mises en file faute de réseau (docs/09, « File d'envoi »). */
const QUEUEABLE: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/deposits$/, label: 'Dépôt' },
  { pattern: /^\/payments$/, label: 'Paiement' },
  { pattern: /^\/deposits\/[\w-]+\/items(\/[\w-]+)?\/status$/, label: 'Statut d’article' },
  { pattern: /^\/deposits\/[\w-]+\/returns$/, label: 'Restitution' },
];

/** Libellé d'une écriture à mettre en file, ou `null` si elle n'est pas concernée. */
export function queueLabel(req: Pick<HttpRequest<unknown>, 'method' | 'url'>): string | null {
  if (req.method !== 'POST' || !req.url.startsWith(API_BASE)) return null;
  const path = req.url.slice(API_BASE.length).split('?')[0] ?? '';
  return QUEUEABLE.find((q) => q.pattern.test(path))?.label ?? null;
}

/**
 * File d'envoi : une écriture sensible qui échoue faute de réseau est conservée (IndexedDB) avec
 * sa clé d'idempotence, puis rejouée dans l'ordre au retour du réseau, au démarrage et toutes
 * les 30 s. Le serveur ne crée jamais de doublon. Les erreurs métier au rejeu restent visibles
 * pour décision.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueue {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly entries = signal<QueuedWrite[]>([]);
  private replaying = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly pending = computed(() => this.entries().filter((e) => !e.error));
  readonly failed = computed(() => this.entries().filter((e) => !!e.error));
  /** Dernier envoi réussi après rejeu (ex. dépôt numéroté à imprimer). */
  readonly lastSent = signal<{ label: string; body: unknown } | null>(null);

  label(req: HttpRequest<unknown>): string | null {
    return queueLabel(req);
  }

  async enqueue(req: HttpRequest<unknown>, label: string): Promise<void> {
    const headers: Record<string, string> = {};
    for (const key of req.headers.keys()) {
      if (key.toLowerCase() !== 'authorization') headers[key] = req.headers.get(key) ?? '';
    }
    const entry: QueuedWrite = {
      id: crypto.randomUUID(),
      userId: this.auth.user()?.id ?? '',
      method: req.method,
      url: req.url,
      body: req.body,
      headers,
      label,
      createdAt: new Date().toISOString(),
      error: null,
    };
    await outbox.put(entry);
    await this.load();
  }

  private async load(): Promise<void> {
    const userId = this.auth.user()?.id;
    const all = await outbox.all<QueuedWrite>();
    this.entries.set(
      all.filter((e) => e.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }

  /** Démarré par la coquille (utilisateur connecté) ; renvoie la fonction d'arrêt. */
  start(): () => void {
    if (!this.browser || !('indexedDB' in window)) return () => undefined;
    const onOnline = () => void this.replay();
    window.addEventListener('online', onOnline);
    this.timer = setInterval(() => {
      if (this.pending().length) void this.replay();
    }, 30_000);
    void this.load().then(() => this.replay());
    return () => {
      window.removeEventListener('online', onOnline);
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    };
  }

  /** Rejoue dans l'ordre ; s'arrête à la première coupure réseau. */
  async replay(): Promise<void> {
    if (this.replaying || !navigator.onLine) return;
    this.replaying = true;
    try {
      await this.load();
      for (const entry of this.pending()) {
        try {
          const body = await new Promise<unknown>((resolve, reject) => {
            this.http
              .request(entry.method, entry.url, {
                body: entry.body,
                headers: new HttpHeaders({ ...entry.headers, [REPLAY_HEADER]: '1' }),
              })
              .subscribe({ next: resolve, error: reject });
          });
          await outbox.delete(entry.id);
          this.lastSent.set({ label: entry.label, body });
        } catch (e) {
          if (e instanceof ApiError && e.isNetworkError) break;
          await outbox.put({
            ...entry,
            error: e instanceof ApiError ? e.message : 'Envoi refusé.',
          });
        }
      }
    } finally {
      await this.load();
      this.replaying = false;
    }
  }

  /** Abandon d'une écriture refusée au rejeu (décision de l'utilisateur). */
  async discard(id: string): Promise<void> {
    await outbox.delete(id);
    await this.load();
  }
}
