import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { InvoicesPanel } from './invoices-panel';
import { ReportsPanel } from './reports-panel';
import { TreasuryPanel } from './treasury-panel';
import { UtilitiesPanel } from './utilities-panel';

const TABS = [
  { key: 'treasury', label: 'Trésorerie' },
  { key: 'reports', label: 'Rapports' },
  { key: 'invoices', label: 'Factures fournisseurs' },
  { key: 'utilities', label: 'Compteurs' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** Comptabilité de gestion (docs/01, module 8) : trésorerie, rapports, dettes fournisseurs, compteurs. */
@Component({
  selector: 'lv-accounting-page',
  imports: [PageHeader, TreasuryPanel, ReportsPanel, InvoicesPanel, UtilitiesPanel],
  template: `
    <lv-page-header
      heading="Comptabilité"
      subtitle="Trésorerie, rapports et exports, dettes fournisseurs."
    />
    <div class="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Vues de la comptabilité">
      @for (t of tabs; track t.key) {
        <button
          type="button"
          role="tab"
          class="lv-choice"
          [attr.aria-selected]="view() === t.key"
          [class.bg-mint-100]="view() === t.key"
          (click)="show(t.key)"
        >
          {{ t.label }}
        </button>
      }
    </div>
    @switch (view()) {
      @case ('treasury') {
        <lv-treasury-panel />
      }
      @case ('reports') {
        <lv-reports-panel />
      }
      @case ('invoices') {
        <lv-invoices-panel />
      }
      @case ('utilities') {
        <lv-utilities-panel />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountingPage {
  readonly tab = input<string>();
  private readonly router = inject(Router);
  protected readonly tabs = TABS;
  protected readonly view = computed<Tab>(
    () => TABS.find((t) => t.key === this.tab())?.key ?? 'treasury',
  );

  protected show(tab: Tab): Promise<boolean> {
    return this.router.navigate([], { queryParams: { tab: tab === 'treasury' ? null : tab } });
  }
}
