import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { OfflineQueue } from '../../../core/offline/offline-queue';
import { PwaService } from '../../../core/pwa/pwa.service';
import { Toast } from '../toast/toast.service';

/**
 * Bandeaux de l'application installable (docs/09) : nouvelle version, écritures en attente
 * d'envoi, activation des alertes, installation sur l'écran d'accueil.
 */
@Component({
  selector: 'lv-pwa-banners',
  template: `
    @if (pwa.updateReady()) {
      <div class="lv-banner" role="status">
        <p>Une nouvelle version est disponible.</p>
        <button type="button" class="lv-primary" (click)="pwa.reload()">Actualiser</button>
      </div>
    }

    @if (queue.pending().length || queue.failed().length) {
      <div class="lv-banner lv-banner--warn" role="status" aria-live="polite">
        <p>
          @if (queue.pending().length) {
            <strong>En attente d’envoi ({{ queue.pending().length }})</strong> : envoi automatique
            au retour du réseau.
          }
          @if (queue.failed().length) {
            <strong>{{ queue.failed().length }} envoi(s) refusé(s)</strong> à vérifier.
          }
        </p>
        <div class="flex flex-wrap gap-2">
          @if (queue.pending().length) {
            <button type="button" class="lv-secondary" (click)="queue.replay()">Réessayer</button>
          }
          @if (queue.failed().length) {
            <button
              type="button"
              class="lv-link-button"
              [attr.aria-expanded]="details()"
              (click)="details.set(!details())"
            >
              {{ details() ? 'Masquer' : 'Voir le détail' }}
            </button>
          }
        </div>
        @if (details()) {
          <ul class="mt-2 grid w-full gap-2" role="list">
            @for (f of queue.failed(); track f.id) {
              <li
                class="flex flex-wrap items-center justify-between gap-2 rounded-field bg-white p-2"
              >
                <span
                  ><strong>{{ f.label }}</strong> · {{ f.error }}</span
                >
                <button
                  type="button"
                  class="lv-link-button text-coral-600"
                  (click)="queue.discard(f.id)"
                >
                  Abandonner
                </button>
              </li>
            }
          </ul>
        }
      </div>
    }

    @switch (pwa.push()) {
      @case ('available') {
        <div class="lv-banner" role="region" aria-label="Alertes sur ce téléphone">
          <p>
            <strong>Activez les alertes</strong> : validations à faire, clôture et écart de caisse,
            stock bas, retards, impayés importants.
          </p>
          <div class="flex gap-2">
            <button type="button" class="lv-primary" (click)="pwa.enablePush()">
              Activer les alertes
            </button>
            <button type="button" class="lv-link-button" (click)="pwa.dismissPush()">
              Plus tard
            </button>
          </div>
        </div>
      }
      @case ('ios-install') {
        <div class="lv-banner" role="region" aria-label="Alertes sur iPhone">
          <p>
            Sur iPhone, les alertes fonctionnent une fois Lavio ajouté à l’écran d’accueil (iOS 16.4
            ou plus) : touchez <strong>Partager</strong>, puis
            <strong>Sur l’écran d’accueil</strong>.
          </p>
          <button type="button" class="lv-link-button" (click)="pwa.dismissPush()">Compris</button>
        </div>
      }
      @case ('denied') {
        <div class="lv-banner" role="status">
          <p>
            Les alertes sont bloquées pour ce site : autorisez-les dans les réglages du navigateur.
          </p>
          <button type="button" class="lv-link-button" (click)="pwa.dismissPush()">Fermer</button>
        </div>
      }
    }

    @if (pwa.showInstall() && pwa.push() !== 'ios-install') {
      <div class="lv-banner" role="region" aria-label="Installer Lavio">
        @if (pwa.iosHelp()) {
          <p>
            Installez Lavio : touchez <strong>Partager</strong>, puis
            <strong>Sur l’écran d’accueil</strong>.
          </p>
        } @else {
          <p>
            <strong>Installez Lavio</strong> sur cet appareil pour l’ouvrir comme une application.
          </p>
          <button type="button" class="lv-primary" (click)="pwa.install()">Installer</button>
        }
        <button type="button" class="lv-link-button" (click)="pwa.dismissInstall()">
          Plus tard
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 8px;
    }
    :host:not(:empty) {
      margin-bottom: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaBanners {
  protected readonly pwa = inject(PwaService);
  protected readonly queue = inject(OfflineQueue);
  private readonly toast = inject(Toast);
  protected readonly details = signal(false);

  constructor() {
    // Écriture partie après une coupure : confirmation (et ticket à imprimer pour un dépôt).
    effect(() => {
      const sent = this.queue.lastSent();
      if (!sent) return;
      const ticket = (sent.body as { ticketNumber?: string } | null)?.ticketNumber;
      this.toast.success(
        ticket
          ? `Dépôt n° ${ticket} envoyé : imprimez le ticket depuis sa fiche.`
          : `${sent.label} envoyé.`,
      );
    });
  }
}
