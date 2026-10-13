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
  type CustomerDto,
  isTourDay,
  type TourRequestDto,
  type TourStatus,
  type TourType,
} from '@lavio/shared';
import { ManagementApi } from '../../../core/api/management-api';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api';
import { FrDatePipe, PhonePipe, todayInput, XafPipe } from '../../../shared/format/format';
import { confirmAction } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { Toast } from '../../../shared/ui/toast/toast.service';

export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  TO_COLLECT: 'À collecter',
  COLLECTED: 'Collecté',
  TO_DELIVER: 'À livrer',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
};
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Tournées (docs/05, « Tournées ») : demandes, liste du jour, statuts, impression. */
@Component({
  selector: 'lv-tours-page',
  imports: [FormsModule, RouterLink, PageHeader, XafPipe, FrDatePipe, PhonePipe],
  templateUrl: './tours-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToursPage {
  /** Jour affiché (`?date=AAAA-MM-JJ`). */
  readonly date = input<string>();
  private readonly api = inject(ManagementApi);
  private readonly pressing = inject(PressingApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);

  protected readonly statusLabels = TOUR_STATUS_LABELS;
  protected readonly isCashier = computed(() => this.auth.hasTenantRole('CASHIER'));
  protected readonly isOwner = computed(() => this.auth.hasTenantRole());
  /** Paramètre toujours défini : sans date, l'API renvoie la tournée du jour. */
  protected readonly day = resource({
    params: () => ({ date: this.date() || undefined }),
    loader: ({ params }) => this.api.tourDay(params.date),
  });
  protected readonly dayLabel = computed(() => {
    if (!this.day.hasValue()) return '';
    const d = this.day.value().date;
    return WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()] ?? '';
  });
  protected readonly tourDayNames = computed(() =>
    this.day.hasValue()
      ? this.day
          .value()
          .tourDays.map((d) => WEEKDAYS[d])
          .join(' et ')
      : '',
  );
  protected readonly pickups = computed(() =>
    this.day.hasValue() ? this.day.value().requests.filter((r) => r.type === 'PICKUP') : [],
  );
  protected readonly deliveries = computed(() =>
    this.day.hasValue() ? this.day.value().requests.filter((r) => r.type === 'DELIVERY') : [],
  );

  // Nouvelle demande
  protected readonly showForm = signal(false);
  protected readonly type = signal<TourType>('PICKUP');
  protected readonly search = signal('');
  protected readonly customer = signal<CustomerDto | null>(null);
  protected readonly customers = resource({
    params: () =>
      this.search().trim().length >= 2 && !this.customer() ? this.search().trim() : undefined,
    loader: ({ params }) => this.pressing.customers({ q: params, pageSize: 6 }),
  });
  protected readonly deposits = resource({
    params: () => (this.customer() && this.type() === 'DELIVERY' ? this.customer()?.id : undefined),
    loader: ({ params }) => this.pressing.deposits({ customerId: params }),
  });
  protected readonly openDeposits = computed(() =>
    this.deposits.hasValue()
      ? this.deposits
          .value()
          .data.filter((d) => ['OPEN', 'READY', 'PARTIALLY_RETURNED'].includes(d.status))
      : [],
  );
  protected readonly tourDate = linkedSignal(() =>
    this.day.hasValue() ? (this.day.value().nextTourDates[0] ?? todayInput()) : todayInput(),
  );
  protected readonly address = linkedSignal(() => this.customer()?.address ?? '');
  protected readonly depositId = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly notes = signal('');
  protected readonly allowOffDay = signal(false);
  protected readonly busy = signal(false);
  protected readonly offDay = computed(
    () =>
      this.day.hasValue() &&
      !!this.tourDate() &&
      !isTourDay(this.tourDate(), this.day.value().tourDays),
  );
  protected readonly canSave = computed(
    () =>
      !!this.customer() &&
      !!this.tourDate() &&
      this.address().trim().length >= 3 &&
      (!this.offDay() || this.allowOffDay()),
  );

  protected go(date: string): Promise<boolean> {
    return this.router.navigate([], { queryParams: { date } });
  }

  protected pick(c: CustomerDto): void {
    this.customer.set(c);
    this.search.set(c.name);
  }

  protected resetCustomer(): void {
    this.customer.set(null);
    this.search.set('');
    this.depositId.set('');
  }

  protected async create(): Promise<void> {
    const c = this.customer();
    if (!c || !this.canSave()) return;
    this.busy.set(true);
    try {
      const created = await this.api.createTour({
        type: this.type(),
        customerId: c.id,
        tourDate: this.tourDate(),
        address: this.address().trim(),
        depositId: this.type() === 'DELIVERY' && this.depositId() ? this.depositId() : undefined,
        amountToCollectXaf: this.amount() ? Math.floor(Number(this.amount())) : undefined,
        notes: this.notes().trim() || undefined,
        allowOffDay: this.offDay() && this.allowOffDay() ? true : undefined,
      });
      this.toast.success('Demande enregistrée.');
      this.resetCustomer();
      this.notes.set('');
      this.amount.set(null);
      this.allowOffDay.set(false);
      this.showForm.set(false);
      await this.go(created.tourDate);
      this.day.reload();
    } catch (e) {
      this.toast.error(
        e instanceof ApiError && e.code === 'TOUR_DAY_REQUIRED'
          ? new ApiError(
              e.code,
              `Ce n’est pas un jour de tournée (${this.tourDayNames()}).`,
              e.status,
            )
          : e,
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async setStatus(r: TourRequestDto, status: TourStatus): Promise<void> {
    let reason: string | undefined;
    if (status === 'CANCELLED') {
      const ok = await confirmAction(this.dialog, {
        title: 'Annuler cette demande ?',
        message: `${r.customerName} · ${r.address}. Indiquez le motif.`,
        confirmLabel: 'Annuler la demande',
        danger: true,
        reasonRequired: true,
      });
      if (!ok?.reason) return;
      reason = ok.reason;
    }
    try {
      await this.api.tourStatus(r.id, status, reason);
      this.toast.success(`${r.customerName} : ${TOUR_STATUS_LABELS[status].toLowerCase()}.`);
      this.day.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
