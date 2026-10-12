import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { licenseBannerLevel } from '@lavio/shared';
import { AuthService } from '../../../core/auth/auth.service';
import { formatDate } from '../../format/format';

/** Bannières de licence côté pressing : J-7, J-3, J-0, grâce et lecture seule (docs/06). */
@Component({
  selector: 'lv-license-banner',
  imports: [RouterLink],
  template: `
    @if (banner(); as b) {
      <div class="lv-banner {{ b.tone }}" role="status">
        <p>{{ b.text }}</p>
        <a routerLink="/app/license" class="lv-banner-link">Voir ma licence</a>
      </div>
    }
  `,
  styles: `
    .lv-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 16px;
      padding: 12px 16px;
      border-radius: var(--lv-radius-card);
      margin-bottom: 24px;
      font-weight: 500;
    }
    .lv-banner p {
      margin: 0;
    }
    .lv-banner-link {
      color: inherit;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseBanner {
  private readonly auth = inject(AuthService);

  protected readonly banner = computed(() => {
    const license = this.auth.license();
    if (!license) return null;
    const level = licenseBannerLevel(license.status, license.daysLeft);
    const end = formatDate(license.endsAt);
    const graceEnd = formatDate(license.graceEndsAt);
    switch (level) {
      case 'none':
        return null;
      case 'notice':
        return {
          tone: 'bg-mint-100 text-teal-900',
          text: `Votre licence se termine le ${end}, dans ${license.daysLeft} jours.`,
        };
      case 'warning':
        return {
          tone: 'bg-amber-500 text-ink-900',
          text: `Votre licence se termine dans ${license.daysLeft} jours, le ${end}. Pensez à la renouveler.`,
        };
      case 'urgent':
        return {
          tone: 'bg-amber-500 text-ink-900',
          text: `Votre licence se termine aujourd’hui. Renouvelez-la pour continuer sans interruption.`,
        };
      case 'grace':
        return {
          tone: 'bg-coral-600 text-white font-bold',
          text: `Votre licence a expiré, contactez le service client. Accès complet jusqu’au ${graceEnd}.`,
        };
      case 'readOnly':
        return {
          tone: 'bg-ink-900 text-white',
          text: 'Licence inactive : consultation et exports seulement. Contactez le service client pour renouveler.',
        };
    }
  });
}
