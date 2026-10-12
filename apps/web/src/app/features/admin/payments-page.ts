import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import type { SubscriptionPaymentDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { FrDatePipe, XafPipe } from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { Chip } from '../../shared/ui/status-chip/status-chip';
import { Toast } from '../../shared/ui/toast/toast.service';
import { PAYMENT_METHOD_LABELS } from './labels';
import { PaymentForm } from './payment-form';

/** Paiements d'abonnement : liste, enregistrement, remboursement (docs/06). */
@Component({
  selector: 'lv-payments-page',
  imports: [MatButtonModule, RouterLink, PageHeader, Pager, Chip, PaymentForm, FrDatePipe, XafPipe],
  template: `
    <lv-page-header heading="Paiements" subtitle="Abonnements réglés auprès du service client.">
      @if (admin && !recording()) {
        <button mat-flat-button type="button" (click)="recording.set(true)">
          Enregistrer un paiement
        </button>
      }
    </lv-page-header>
    @if (recording()) {
      <lv-payment-form
        class="mb-6 block"
        (recorded)="recorded()"
        (cancelled)="recording.set(false)"
      />
    }
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Paiements d’abonnement
        </caption>
        <thead>
          <tr>
            <th scope="col">Reçu le</th>
            <th scope="col">Pressing</th>
            <th scope="col">Mode</th>
            <th scope="col">Période</th>
            <th scope="col" class="num">Montant</th>
            <th scope="col" class="num">Déductions</th>
            <th scope="col">Statut</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (p of list.hasValue() ? list.value().data : []; track p.id) {
            <tr>
              <td>{{ p.receivedAt | frDate }}</td>
              <td>
                <a [routerLink]="['/admin/tenants', p.tenantId]">{{ p.tenantName }}</a>
              </td>
              <td>{{ method[p.method] }}{{ p.reference ? ' · ' + p.reference : '' }}</td>
              <td>{{ p.periodStart | frDate }} – {{ p.periodEnd | frDate }}</td>
              <td class="num">{{ p.amountXaf | xaf }}</td>
              <td class="num">{{ p.deductionsXaf | xaf }}</td>
              <td>
                @if (p.status === 'REFUNDED') {
                  <lv-chip tone="bg-ink-900 text-white">Remboursé</lv-chip>
                } @else {
                  <lv-chip>Enregistré</lv-chip>
                }
              </td>
              <td>
                @if (admin && p.status === 'RECORDED') {
                  <button type="button" class="lv-link-button" (click)="refund(p)">
                    Rembourser
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="8">{{ list.isLoading() ? 'Chargement…' : 'Aucun paiement.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsPage {
  private readonly api = inject(AdminApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly admin = inject(AuthService).hasPlatformRole('SUPER_ADMIN');
  protected readonly method = PAYMENT_METHOD_LABELS;
  protected readonly page = signal(1);
  protected readonly recording = signal(false);
  protected readonly list = resource({
    params: () => this.page(),
    loader: ({ params }) => this.api.payments({ page: params }),
  });

  protected recorded(): void {
    this.recording.set(false);
    this.toast.success('Paiement enregistré, licence prolongée.');
    this.list.reload();
  }

  protected async refund(p: SubscriptionPaymentDto): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Marquer ce paiement comme remboursé ?',
      message:
        'Il sortira du relevé mensuel. La date de fin de la licence ne change pas : ajustez-la si besoin.',
      confirmLabel: 'Rembourser',
      danger: true,
      askReason: true,
    });
    if (!ok) return;
    try {
      await this.api.refundPayment(p.id, ok.reason);
      this.toast.success('Paiement marqué comme remboursé.');
      this.list.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
