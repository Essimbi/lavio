import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import {
  type ExpenseCategoryDto,
  type ExpenseDto,
  ExpenseStatus,
  type RecurringExpenseDto,
} from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, FrDateTimePipe, XafPipe } from '../../../shared/format/format';
import { EXPENSE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../../shared/format/labels';
import { confirmAction } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Pager } from '../../../shared/ui/pager/pager';
import { Toast } from '../../../shared/ui/toast/toast.service';

type Tab = 'expenses' | 'recurring' | 'categories';

const STATUS_TONES: Record<ExpenseStatus, string> = {
  DRAFT: 'bg-amber-500 text-ink-900',
  PENDING_APPROVAL: 'bg-amber-500 text-ink-900',
  RECORDED: 'bg-teal-700 text-white',
  REJECTED: 'bg-ink-900 text-white',
  CANCELLED: 'bg-mint-100 text-teal-900',
};

/**
 * Dépenses (docs/05, comptabilité, règles 3 et 6) : saisie (la caisse saisit les dépenses en
 * espèces), brouillons des récurrences à confirmer, annulation tracée, catégories.
 */
@Component({
  selector: 'lv-expenses-page',
  imports: [FormsModule, RouterLink, PageHeader, Pager, FrDatePipe, FrDateTimePipe, XafPipe],
  templateUrl: './expenses-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesPage {
  readonly tab = input<string>();
  private readonly api = inject(ManagementApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly isManager = computed(() => this.auth.hasTenantRole('ACCOUNTANT'));
  protected readonly view = computed<Tab>(() => {
    const t = this.tab();
    return this.isManager() && (t === 'recurring' || t === 'categories') ? t : 'expenses';
  });
  protected readonly statusLabels = EXPENSE_STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly statuses = Object.keys(ExpenseStatus) as ExpenseStatus[];

  protected readonly categories = resource({ loader: () => this.api.categories() });
  protected readonly activeCategories = computed(() =>
    this.categories.hasValue()
      ? this.categories.value().filter((c) => c.isActive && !c.systemKey)
      : [],
  );
  protected readonly accounts = resource({
    params: () => (this.isManager() ? true : undefined),
    loader: () => this.api.accounts(),
  });
  protected readonly activeAccounts = computed(() =>
    this.accounts.hasValue() ? this.accounts.value().filter((a) => a.isActive) : [],
  );

  // Liste
  protected readonly status = signal<ExpenseStatus | ''>('');
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () =>
      this.view() === 'expenses' ? { status: this.status(), page: this.page() } : undefined,
    loader: ({ params }) => this.api.expenses(params),
  });

  // Saisie
  protected readonly categoryId = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly accountId = signal('');
  protected readonly description = signal('');
  protected readonly busy = signal(false);
  protected readonly canSave = computed(
    () =>
      !!this.categoryId() && Number(this.amount()) >= 1 && Number.isInteger(Number(this.amount())),
  );

  // Récurrences
  protected readonly recurring = resource({
    params: () => (this.view() === 'recurring' ? true : undefined),
    loader: () => this.api.recurring(),
  });
  protected readonly rLabel = signal('');
  protected readonly rCategory = signal('');
  protected readonly rAmount = signal<number | null>(null);
  protected readonly rDay = signal<number | null>(5);
  protected readonly rAccount = signal('');

  // Catégories
  protected readonly newCategory = signal('');

  protected show(tab: Tab): Promise<boolean> {
    return this.router.navigate([], { queryParams: { tab: tab === 'expenses' ? null : tab } });
  }

  protected async create(): Promise<void> {
    if (!this.canSave()) return;
    this.busy.set(true);
    try {
      const created = await this.api.createExpense({
        categoryId: this.categoryId(),
        amountXaf: Number(this.amount()),
        accountId: this.accountId() || undefined,
        description: this.description().trim() || undefined,
      });
      this.toast.success(
        created.status === 'PENDING_APPROVAL'
          ? 'Dépense importante : envoyée à la responsable pour validation.'
          : 'Dépense enregistrée.',
      );
      this.amount.set(null);
      this.description.set('');
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirm(e: ExpenseDto): Promise<void> {
    try {
      const done = await this.api.confirmExpense(e.id);
      this.toast.success(
        done.status === 'RECORDED' ? 'Dépense confirmée.' : 'Dépense envoyée pour validation.',
      );
      this.list.reload();
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected async cancel(e: ExpenseDto): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Annuler cette dépense ?',
      message: 'L’annulation est tracée ; la dépense reste visible avec son motif.',
      confirmLabel: 'Annuler la dépense',
      danger: true,
      reasonRequired: true,
    });
    if (!ok?.reason) return;
    try {
      await this.api.cancelExpense(e.id, ok.reason);
      this.toast.success('Dépense annulée.');
      this.list.reload();
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected async addRecurring(): Promise<void> {
    try {
      await this.api.createRecurring({
        label: this.rLabel().trim(),
        categoryId: this.rCategory(),
        amountXaf: Number(this.rAmount()),
        dayOfMonth: Number(this.rDay()),
        accountId: this.rAccount(),
      });
      this.toast.success('Dépense récurrente ajoutée.');
      this.rLabel.set('');
      this.rAmount.set(null);
      this.recurring.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async toggleRecurring(r: RecurringExpenseDto): Promise<void> {
    try {
      await this.api.updateRecurring(r.id, { isActive: !r.isActive });
      this.recurring.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async addCategory(): Promise<void> {
    try {
      await this.api.createCategory(this.newCategory().trim());
      this.newCategory.set('');
      this.categories.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async toggleCategory(c: ExpenseCategoryDto): Promise<void> {
    try {
      await this.api.updateCategory(c.id, { isActive: !c.isActive });
      this.categories.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
