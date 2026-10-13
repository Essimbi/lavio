import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  linkedSignal,
  resource,
  signal,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CARE_SYMBOLS,
  computeQuote,
  type CustomerDto,
  defaultDueDate,
  normalizePhone,
  type Quote,
  RECEPTION_CHECKLIST,
  type ReceptionChecklist,
} from '@lavio/shared';
import { ApiError } from '../../../core/http/api';
import { PressingApi } from '../../../core/api/pressing-api';
import { AuthService } from '../../../core/auth/auth.service';
import { FrDatePipe, PhonePipe, XafPipe } from '../../../shared/format/format';
import { errorMessage, Toast } from '../../../shared/ui/toast/toast.service';

interface Line {
  key: number;
  itemTypeId: string;
  serviceId: string;
  quantity: number;
  color: string;
  brand: string;
  careSymbols: string[];
  conditionNotes: string;
  checklist: ReceptionChecklist;
  weightKg: number | null;
  open: boolean;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('annulé', 'AbortError'));
    });
  });

let lineKey = 0;
const emptyLine = (): Line => ({
  key: ++lineKey,
  itemTypeId: '',
  serviceId: '',
  quantity: 1,
  color: '',
  brand: '',
  careSymbols: [],
  conditionNotes: '',
  checklist: {},
  weightKg: null,
  open: false,
});

/**
 * Nouveau dépôt (docs/08) : écran unique, pensé pour le clavier — client, articles, total en direct,
 * « Enregistrer et imprimer ». Objectif : moins de 90 secondes pour un client existant.
 */
@Component({
  selector: 'lv-new-deposit',
  imports: [FormsModule, XafPipe, FrDatePipe, PhonePipe],
  templateUrl: './new-deposit.html',
  styleUrl: './new-deposit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'shortcuts($event)' },
})
export class NewDeposit {
  private readonly api = inject(PressingApi);
  private readonly router = inject(Router);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthService);
  protected readonly careSymbols = CARE_SYMBOLS;
  protected readonly careGroups = [...new Set(CARE_SYMBOLS.map((s) => s.group))];
  protected readonly checklist = RECEPTION_CHECKLIST;
  private readonly articleSelects = viewChildren<ElementRef<HTMLSelectElement>>('article');
  private readonly customerInput = viewChildren<ElementRef<HTMLInputElement>>('customerSearch');

  // ------------------------------------------------------------- Client
  protected readonly query = signal('');
  protected readonly highlighted = signal(0);
  protected readonly customer = signal<CustomerDto | null>(null);
  protected readonly creating = signal(false);
  protected readonly newCustomer = signal({ name: '', phone: '' });
  protected readonly results = resource({
    params: () =>
      this.customer() || this.query().trim().length < 2 ? undefined : this.query().trim(),
    loader: async ({ params, abortSignal }) => {
      await sleep(200, abortSignal);
      return (await this.api.customers({ q: params, pageSize: 8 })).data;
    },
  });
  protected readonly matches = computed(() =>
    this.results.hasValue() ? this.results.value() : [],
  );

  // ------------------------------------------------------------- Grille et lignes
  protected readonly grid = resource({
    params: () => this.customer()?.id ?? '',
    loader: ({ params }) => this.api.grid(params || undefined),
  });
  protected readonly lines = signal<Line[]>([emptyLine()]);
  protected readonly express = signal(false);
  protected readonly discount = signal(0);
  protected readonly notes = signal('');
  protected readonly dueDate = linkedSignal(() =>
    this.grid.hasValue()
      ? defaultDueDate(
          new Date(),
          this.grid.value().settings.processingDays,
          this.grid.value().tourDays,
        )
      : '',
  );
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  private idempotencyKey = crypto.randomUUID();

  constructor() {
    // Écran de saisie rapide : le curseur est d'emblée dans la recherche du client.
    afterNextRender(() => this.customerInput()[0]?.nativeElement.focus());
  }

  protected readonly unitPrice = (line: Line): number | null => {
    if (!this.grid.hasValue() || !line.itemTypeId || !line.serviceId) return null;
    return this.grid.value().prices[`${line.itemTypeId}:${line.serviceId}`] ?? null;
  };

  protected readonly filledLines = computed(() =>
    this.lines().filter((l) => l.itemTypeId && l.serviceId),
  );
  protected readonly missingPrice = computed(() =>
    this.filledLines().some((l) => this.unitPrice(l) === null),
  );

  protected readonly quote = computed<{ quote: Quote | null; error: string | null }>(() => {
    if (!this.grid.hasValue()) return { quote: null, error: null };
    const g = this.grid.value();
    const priced = this.filledLines().filter((l) => this.unitPrice(l) !== null);
    try {
      return {
        quote: computeQuote({
          lines: priced.map((l) => ({
            unitPriceXaf: this.unitPrice(l) ?? 0,
            quantity: Math.max(1, Math.floor(l.quantity || 1)),
          })),
          express: this.express(),
          expressSurchargePercent: g.settings.expressSurchargePercent,
          discountXaf: Math.max(0, Math.floor(this.discount() || 0)),
          discountApprovalPercent: g.settings.discountApprovalPercent,
        }),
        error: null,
      };
    } catch {
      return { quote: null, error: 'La remise dépasse le montant du dépôt.' };
    }
  });

  protected readonly needsApproval = computed(
    () => !!this.quote().quote?.discountNeedsApproval && !this.auth.hasTenantRole(),
  );
  protected readonly canSubmit = computed(
    () =>
      !!this.customer() &&
      this.filledLines().length > 0 &&
      !this.missingPrice() &&
      !!this.quote().quote &&
      !!this.dueDate() &&
      !this.submitting(),
  );

  // ------------------------------------------------------------- Client : actions
  protected onQueryKey(event: KeyboardEvent): void {
    const list = this.matches();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlighted.set(Math.min(this.highlighted() + 1, list.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlighted.set(Math.max(this.highlighted() - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = list.at(this.highlighted());
      if (picked) this.pick(picked);
      else if (this.query().trim().length >= 2) this.startCreate();
    }
  }

  protected pick(customer: CustomerDto): void {
    this.customer.set(customer);
    this.query.set('');
    this.highlighted.set(0);
    this.focusArticle(0);
  }

  protected changeCustomer(): void {
    this.customer.set(null);
    this.creating.set(false);
    setTimeout(() => this.customerInput()[0]?.nativeElement.focus());
  }

  protected startCreate(): void {
    const q = this.query().trim();
    const digits = q.replace(/\D/g, '');
    this.newCustomer.set(digits.length >= 6 ? { name: '', phone: q } : { name: q, phone: '' });
    this.creating.set(true);
  }

  protected async createCustomer(): Promise<void> {
    const { name, phone } = this.newCustomer();
    if (name.trim().length < 2 || normalizePhone(phone).length < 9) {
      this.error.set('Indiquez le nom et le téléphone du client.');
      return;
    }
    try {
      const created = await this.api.createCustomer({ name: name.trim(), phone });
      this.creating.set(false);
      this.error.set(null);
      this.pick(created);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  // ------------------------------------------------------------- Lignes : actions
  protected update(key: number, patch: Partial<Line>): void {
    this.lines.update((lines) =>
      lines.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        // Service par défaut : le premier qui a un tarif pour cet article.
        if (patch.itemTypeId && !l.serviceId && this.grid.hasValue()) {
          const g = this.grid.value();
          next.serviceId =
            g.services.find((s) => `${patch.itemTypeId}:${s.id}` in g.prices)?.id ?? '';
        }
        return next;
      }),
    );
  }

  protected toggleSymbol(line: Line, code: string, on: boolean): void {
    this.update(line.key, {
      careSymbols: on ? [...line.careSymbols, code] : line.careSymbols.filter((c) => c !== code),
    });
  }

  protected toggleCheck(line: Line, key: string, on: boolean): void {
    this.update(line.key, { checklist: { ...line.checklist, [key]: on } });
  }

  protected addLine(): void {
    this.lines.update((lines) => [...lines, emptyLine()]);
    this.focusArticle(this.lines().length - 1);
  }

  protected removeLine(key: number): void {
    this.lines.update((lines) =>
      lines.length === 1 ? [emptyLine()] : lines.filter((l) => l.key !== key),
    );
  }

  private focusArticle(index: number): void {
    setTimeout(() => this.articleSelects()[index]?.nativeElement.focus());
  }

  protected shortcuts(event: KeyboardEvent): void {
    if (event.altKey && (event.key === 'n' || event.key === 'N')) {
      event.preventDefault();
      this.addLine();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void this.submit();
    }
  }

  // ------------------------------------------------------------- Enregistrement
  protected async submit(): Promise<void> {
    const customer = this.customer();
    if (!this.canSubmit() || !customer) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const deposit = await this.api.createDeposit(
        {
          customerId: customer.id,
          items: this.filledLines().map((l) => ({
            itemTypeId: l.itemTypeId,
            serviceId: l.serviceId,
            quantity: Math.max(1, Math.floor(l.quantity || 1)),
            color: l.color.trim() || undefined,
            brand: l.brand.trim() || undefined,
            careSymbols: l.careSymbols.length ? l.careSymbols : undefined,
            conditionNotes: l.conditionNotes.trim() || undefined,
            checklist: Object.keys(l.checklist).length ? l.checklist : undefined,
            weightKg: l.weightKg ?? undefined,
          })),
          express: this.express(),
          discountXaf: Math.max(0, Math.floor(this.discount() || 0)),
          dueDate: this.dueDate(),
          notes: this.notes().trim() || undefined,
        },
        this.idempotencyKey,
      );
      this.idempotencyKey = crypto.randomUUID();
      if (deposit.printable) {
        await this.router.navigate(['/print/ticket', deposit.id], { queryParams: { auto: 1 } });
      } else {
        this.toast.success(
          `Dépôt n° ${deposit.ticketNumber} enregistré. ${deposit.blockedReason ?? ''}`,
        );
        await this.router.navigate(['/app/deposits', deposit.id]);
      }
    } catch (e) {
      // Clé conservée : un nouvel envoi du même dépôt ne crée jamais de doublon.
      this.error.set(
        e instanceof ApiError && e.isQueued
          ? 'Pas de réseau : le dépôt est en attente d’envoi. Le ticket s’imprimera dès le retour du réseau, depuis la liste des dépôts.'
          : errorMessage(e),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
