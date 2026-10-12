import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LicenseStatus } from '@lavio/shared';
import { LICENSE_STATUS_LABELS } from '../../format/format';

/** Couleurs de la charte ; toujours accompagnées du libellé (jamais la couleur seule). */
const TONES: Record<LicenseStatus, string> = {
  TRIAL: 'bg-mint-100 text-teal-900',
  ACTIVE: 'bg-aqua-400 text-ink-900',
  GRACE: 'bg-amber-500 text-ink-900',
  EXPIRED: 'bg-ink-900 text-white',
  SUSPENDED: 'bg-coral-600 text-white font-bold',
  REVOKED: 'bg-coral-600 text-white font-bold',
};

@Component({
  selector: 'lv-license-chip',
  template: `<span class="lv-chip {{ tone() }}">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseChip {
  readonly status = input.required<LicenseStatus>();
  protected readonly label = computed(() => LICENSE_STATUS_LABELS[this.status()]);
  protected readonly tone = computed(() => TONES[this.status()]);
}

/** Puce générique (statut de pressing, de lead, d'utilisateur…). */
@Component({
  selector: 'lv-chip',
  template: `<span class="lv-chip {{ tone() }}"><ng-content /></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chip {
  readonly tone = input('bg-mint-100 text-teal-900');
}
