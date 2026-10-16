import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addDays } from '@lavio/shared';
import { AppApi } from '../../core/api/app-api';
import { FrDateTimePipe } from '../../shared/format/format';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { actionLabel } from '../admin/labels';

/** Journal d'audit du pressing (réservé à la responsable), filtrable par utilisateur, élément et période. */
@Component({
  selector: 'lv-audit-page',
  imports: [FormsModule, PageHeader, Pager, FrDateTimePipe],
  template: `
    <lv-page-header
      heading="Journal d’audit"
      subtitle="Les actions sensibles enregistrées dans votre pressing."
    />
    <form class="mb-4 flex flex-wrap items-end gap-3" (submit)="$event.preventDefault()">
      <div>
        <label class="lv-label" for="audit-user">Utilisateur</label>
        <select
          id="audit-user"
          class="lv-select"
          [ngModel]="userId()"
          (ngModelChange)="userId.set($event); page.set(1)"
          name="userId"
        >
          <option value="">Tous</option>
          @for (u of users.hasValue() ? users.value() : []; track u.id) {
            <option [value]="u.id">{{ u.fullName }}</option>
          }
        </select>
      </div>
      <div>
        <label class="lv-label" for="audit-entity">Élément</label>
        <select
          id="audit-entity"
          class="lv-select"
          [ngModel]="entity()"
          (ngModelChange)="entity.set($event); page.set(1)"
          name="entity"
        >
          <option value="">Tous</option>
          @for (e of entities; track e.value) {
            <option [value]="e.value">{{ e.label }}</option>
          }
        </select>
      </div>
      <div>
        <label class="lv-label" for="audit-from">Du</label>
        <input
          id="audit-from"
          class="lv-input"
          type="date"
          [ngModel]="from()"
          (ngModelChange)="from.set($event ?? ''); page.set(1)"
          name="from"
          [max]="to() || null"
        />
      </div>
      <div>
        <label class="lv-label" for="audit-to">Au</label>
        <input
          id="audit-to"
          class="lv-input"
          type="date"
          [ngModel]="to()"
          (ngModelChange)="to.set($event ?? ''); page.set(1)"
          name="to"
          [min]="from() || null"
        />
      </div>
      @if (userId() || entity() || from() || to()) {
        <button type="button" class="lv-link-button min-h-11" (click)="reset()">
          Effacer les filtres
        </button>
      }
    </form>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Journal d’audit
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Utilisateur</th>
            <th scope="col">Action</th>
            <th scope="col">Élément</th>
          </tr>
        </thead>
        <tbody>
          @for (log of logs.hasValue() ? logs.value().data : []; track log.id) {
            <tr>
              <td class="whitespace-nowrap">{{ log.at | frDateTime }}</td>
              <td>{{ log.userName ?? 'Système' }}</td>
              <td>{{ label(log.action) }}</td>
              <td>{{ entityLabel(log.entity) }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">
                {{ logs.isLoading() ? 'Chargement…' : 'Aucune action enregistrée.' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="logs.hasValue() ? logs.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  private readonly api = inject(AppApi);
  protected readonly page = signal(1);
  protected readonly userId = signal('');
  protected readonly entity = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly users = resource({ loader: () => this.api.users() });
  protected readonly logs = resource({
    params: () => ({
      page: this.page(),
      userId: this.userId(),
      entity: this.entity(),
      from: this.from() ? doualaMidnight(this.from()) : '',
      to: this.to() ? doualaMidnight(addDays(this.to(), 1)) : '',
    }),
    loader: ({ params }) => this.api.auditLogs(params),
  });
  protected readonly label = actionLabel;
  protected readonly entities = AUDIT_ENTITIES;
  protected readonly entityLabel = (entity: string) =>
    AUDIT_ENTITIES.find((e) => e.value === entity)?.label ?? entity;

  protected reset(): void {
    this.userId.set('');
    this.entity.set('');
    this.from.set('');
    this.to.set('');
    this.page.set(1);
  }
}

/** Minuit à Douala (UTC+1, sans heure d'été) pour une date AAAA-MM-JJ. */
const doualaMidnight = (date: string) => `${date}T00:00:00+01:00`;

/** Éléments journalisés dans un pressing (champ `entity` du journal). */
const AUDIT_ENTITIES = [
  { value: 'deposit', label: 'Dépôts' },
  { value: 'payment', label: 'Paiements' },
  { value: 'cash_session', label: 'Caisse' },
  { value: 'expense', label: 'Dépenses' },
  { value: 'customer', label: 'Clients' },
  { value: 'price', label: 'Tarifs' },
  { value: 'stock_item', label: 'Produits de stock' },
  { value: 'stock_movement', label: 'Mouvements de stock' },
  { value: 'inventory', label: 'Inventaires' },
  { value: 'purchase_order', label: 'Bons de commande' },
  { value: 'supplier_invoice', label: 'Factures fournisseurs' },
  { value: 'treasury_account', label: 'Comptes de trésorerie' },
  { value: 'account_transfer', label: 'Virements' },
  { value: 'tour_request', label: 'Tournées' },
  { value: 'approval', label: 'Validations' },
  { value: 'incident', label: 'Incidents' },
  { value: 'user', label: 'Utilisateurs' },
  { value: 'tenant', label: 'Paramètres du pressing' },
  { value: 'report', label: 'Rapports' },
] as const;
