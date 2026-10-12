import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DepositStatus, ItemStatus } from '@lavio/shared';

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'À valider',
  OPEN: 'En cours',
  READY: 'Prêt',
  PARTIALLY_RETURNED: 'Retrait partiel',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  RECEIVED: 'Reçu',
  IN_PROGRESS: 'En traitement',
  IRONING: 'Repassage',
  QUALITY_CHECK: 'Contrôle qualité',
  READY: 'Prêt',
  RETURNED: 'Retiré',
};

const DEPOSIT_TONES: Record<DepositStatus, string> = {
  DRAFT: 'bg-mint-100 text-teal-900',
  PENDING_APPROVAL: 'bg-amber-500 text-ink-900',
  OPEN: 'bg-teal-700 text-white',
  READY: 'bg-aqua-400 text-ink-900',
  PARTIALLY_RETURNED: 'bg-mint-100 text-teal-900',
  COMPLETED: 'bg-teal-900 text-white',
  CANCELLED: 'bg-ink-900 text-white',
};

/** Couleurs des statuts d'article (docs/08, « Couleurs des statuts »). */
const ITEM_TONES: Record<ItemStatus, string> = {
  RECEIVED: 'bg-mint-100 text-teal-900',
  IN_PROGRESS: 'bg-teal-700 text-white',
  IRONING: 'bg-amber-500 text-ink-900',
  QUALITY_CHECK: 'bg-ink-900 text-white',
  READY: 'bg-aqua-400 text-ink-900',
  RETURNED: 'bg-teal-900 text-white',
};

@Component({
  selector: 'lv-deposit-chip',
  template: `<span class="lv-chip {{ tone() }}">{{ label() }}</span>
    @if (late()) {
      <span class="lv-chip ml-1 bg-coral-600 font-bold text-white">En retard</span>
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepositChip {
  readonly status = input.required<DepositStatus>();
  readonly late = input(false);
  protected readonly label = computed(() => DEPOSIT_STATUS_LABELS[this.status()]);
  protected readonly tone = computed(() => DEPOSIT_TONES[this.status()]);
}

@Component({
  selector: 'lv-item-chip',
  template: `<span class="lv-chip {{ tone() }}">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemChip {
  readonly status = input.required<ItemStatus>();
  protected readonly label = computed(() => ITEM_STATUS_LABELS[this.status()]);
  protected readonly tone = computed(() => ITEM_TONES[this.status()]);
}
