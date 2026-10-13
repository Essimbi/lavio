import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import {
  checkItemTransition,
  ITEM_FLOW,
  type ItemStatus,
  type ItemStatusChange,
  parseTicketNumber,
} from '@lavio/shared';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe } from '../../../shared/format/format';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import {
  DepositChip,
  ITEM_STATUS_LABELS,
  ItemChip,
} from '../../../shared/ui/status-chip/deposit-chip';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';
import { askIncident, askQuality, askRework } from './tracking-dialogs';

const TARGETS = ITEM_FLOW.filter((s) => s !== 'RETURNED');

/**
 * Suivi (docs/01, module 3) : recherche par numéro, changement de statut d'un ou plusieurs
 * articles, emplacement de rangement, contrôle qualité, reprises et incidents.
 */
@Component({
  selector: 'lv-tracking-page',
  imports: [FormsModule, RouterLink, PageHeader, Pager, DepositChip, ItemChip, FrDatePipe],
  templateUrl: './tracking-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackingPage {
  /** Dépôt ouvert (paramètre `?deposit=` de l'URL). */
  readonly deposit = input<string>();
  private readonly api = inject(PressingApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly statusLabels = ITEM_STATUS_LABELS;
  protected readonly number = signal('');
  protected readonly searchError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly storageLocation = signal('');
  protected readonly late = signal(false);
  protected readonly page = signal(1);

  protected readonly current = resource({
    params: () => this.deposit() || undefined,
    loader: ({ params }) => this.api.deposit(params),
  });
  protected readonly causes = resource({ loader: () => this.api.reworkCauses() });
  protected readonly queue = resource({
    params: () => ({ status: 'OPEN' as const, late: this.late() || undefined, page: this.page() }),
    loader: ({ params }) => this.api.deposits(params),
  });

  /** Articles cochés ; la sélection repart à zéro quand le dépôt change. */
  protected readonly selected = linkedSignal<string | undefined, ReadonlySet<string>>({
    source: () => this.deposit(),
    computation: () => new Set<string>(),
  });

  private readonly roles = computed(() => this.auth.user()?.tenantRoles ?? []);
  protected readonly canQuality = computed(() => this.auth.hasTenantRole('QUALITY'));
  private readonly selectedItems = computed(() =>
    this.current.hasValue()
      ? this.current.value().items.filter((i) => this.selected().has(i.id))
      : [],
  );

  /** Statuts proposés : permis pour tous les articles cochés, selon les rôles (docs/05). */
  protected readonly targets = computed(() => {
    const items = this.selectedItems();
    return TARGETS.map((status) => ({
      status,
      enabled:
        items.length > 0 &&
        items.every((i) => checkItemTransition(i.status, status, this.roles()).ok),
    }));
  });

  protected isSelected = (id: string) => this.selected().has(id);

  protected toggle(id: string, on: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected selectAll(): void {
    if (!this.current.hasValue()) return;
    const open = this.current.value().items.filter((i) => i.status !== 'RETURNED');
    this.selected.set(new Set(open.map((i) => i.id)));
  }

  protected async search(): Promise<void> {
    this.searchError.set(null);
    const n = parseTicketNumber(this.number());
    if (n === null) {
      this.searchError.set('Saisissez un numéro de ticket.');
      return;
    }
    try {
      const d = await this.api.depositByNumber(String(n));
      this.number.set('');
      await this.open(d.id);
    } catch (e) {
      this.searchError.set(errorMessage(e));
    }
  }

  protected open(id: string): Promise<boolean> {
    return this.router.navigate([], { queryParams: { deposit: id } });
  }

  protected async apply(target: ItemStatus): Promise<void> {
    const items = this.selectedItems();
    if (!items.length || !this.current.hasValue()) return;
    const change: ItemStatusChange = { status: target };
    const location = this.storageLocation().trim();
    if (location) change.storageLocation = location;

    const rework = items.some((i) => {
      const check = checkItemTransition(i.status, target, this.roles());
      return check.ok && check.rework;
    });
    if (rework) {
      const answer = await askRework(
        this.dialog,
        ITEM_STATUS_LABELS[target],
        this.causes.hasValue() ? this.causes.value().filter((c) => c.isActive) : [],
      );
      if (!answer) return;
      Object.assign(change, answer);
    } else if (target === 'READY') {
      const answer = await askQuality(this.dialog, items.length);
      if (!answer) return;
      change.qualityChecklist = answer.checklist;
    }

    this.busy.set(true);
    try {
      const updated = await this.api.changeItemsStatus(
        this.current.value().id,
        items.map((i) => i.id),
        change,
      );
      this.current.set(updated);
      this.selected.set(new Set());
      this.storageLocation.set('');
      this.queue.reload();
      this.toast.success(`${items.length} article(s) : ${ITEM_STATUS_LABELS[target]}.`);
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async reportIncident(itemId: string, labelCode: string): Promise<void> {
    const answer = await askIncident(
      this.dialog,
      labelCode,
      this.causes.hasValue() ? this.causes.value().filter((c) => c.isActive) : [],
    );
    if (!answer) return;
    try {
      await this.api.createIncident({ depositItemId: itemId, ...answer });
      this.toast.success('Incident enregistré.');
    } catch (e) {
      this.toast.error(e);
    }
  }
}
