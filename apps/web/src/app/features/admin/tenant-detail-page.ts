import { ChangeDetectionStrategy, Component, inject, input, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import type { TenantUserDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import {
  FrDatePipe,
  FrDateTimePipe,
  PhonePipe,
  TENANT_ROLE_LABELS,
  XafPipe,
} from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { showInvitation } from '../../shared/ui/invitation-dialog/invitation-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Chip, LicenseChip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';
import { PAYMENT_METHOD_LABELS, TENANT_STATUS_LABELS } from './labels';
import { LicenseForm } from './license-form';
import { PaymentForm } from './payment-form';

type Panel = 'invite' | 'license' | 'payment' | null;

/** Fiche d'un pressing (docs/06) : informations, utilisateurs, licence, paiements, actions. */
@Component({
  selector: 'lv-tenant-detail',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    PageHeader,
    Chip,
    LicenseChip,
    LicenseForm,
    PaymentForm,
    FrDatePipe,
    FrDateTimePipe,
    PhonePipe,
    XafPipe,
  ],
  template: `
    @if (tenant.hasValue()) {
      @let t = tenant.value();
      <lv-page-header
        [heading]="t.name"
        [subtitle]="
          (t.city ?? '') +
          (t.lastActivityAt ? ' · dernière connexion ' + (t.lastActivityAt | frDateTime) : '')
        "
      >
        <a mat-button routerLink="/admin/tenants">Tous les pressings</a>
        @if (admin) {
          <button mat-stroked-button type="button" (click)="panel.set('invite')">
            Inviter la responsable
          </button>
          <button mat-stroked-button type="button" (click)="panel.set('license')">
            Nouvelle licence
          </button>
          <button
            mat-flat-button
            type="button"
            (click)="panel.set('payment')"
            [disabled]="t.licenses.length === 0"
          >
            Enregistrer un paiement
          </button>
        }
      </lv-page-header>

      @switch (panel()) {
        @case ('invite') {
          <form
            class="lv-card mb-6"
            [formGroup]="invite"
            (ngSubmit)="sendInvitation(t.name)"
            novalidate
          >
            <h3 class="mb-1 text-lg">Inviter la responsable</h3>
            <p class="mb-4 text-sm text-ink-900/80">
              Un lien à usage unique, valable 7 jours, lui permettra de choisir son mot de passe.
            </p>
            <div class="lv-form-grid">
              <mat-form-field
                ><mat-label>Nom complet</mat-label
                ><input matInput formControlName="fullName" /><mat-error
                  >Indiquez le nom.</mat-error
                ></mat-form-field
              >
              <mat-form-field
                ><mat-label>Téléphone (WhatsApp)</mat-label
                ><input matInput formControlName="phone" inputmode="tel" /><mat-error
                  >Indiquez le téléphone.</mat-error
                ></mat-form-field
              >
              <mat-form-field
                ><mat-label>E-mail (facultatif)</mat-label
                ><input matInput type="email" formControlName="email"
              /></mat-form-field>
            </div>
            @if (panelError()) {
              <p class="lv-alert mt-2" role="alert">{{ panelError() }}</p>
            }
            <div class="mt-4 flex gap-2">
              <button mat-flat-button type="submit">Créer le lien d’invitation</button>
              <button mat-button type="button" (click)="panel.set(null)">Annuler</button>
            </div>
          </form>
        }
        @case ('license') {
          <lv-license-form
            class="mb-6 block"
            [tenantId]="t.id"
            (created)="done('Licence créée.')"
            (cancelled)="panel.set(null)"
          />
        }
        @case ('payment') {
          <lv-payment-form
            class="mb-6 block"
            [tenantId]="t.id"
            (recorded)="done('Paiement enregistré, licence prolongée.')"
            (cancelled)="panel.set(null)"
          />
        }
      }

      <div class="grid gap-6 xl:grid-cols-2">
        <section class="lv-card">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-xl">Informations</h2>
            <lv-chip
              [tone]="
                t.status === 'ACTIVE'
                  ? 'bg-mint-100 text-teal-900'
                  : 'bg-coral-600 text-white font-bold'
              "
              >{{ statusLabel[t.status] }}</lv-chip
            >
          </div>
          <dl class="lv-dl">
            <dt>Identifiant</dt>
            <dd>{{ t.slug }}</dd>
            <dt>Téléphone</dt>
            <dd>{{ t.phone | phone }}</dd>
            <dt>Adresse</dt>
            <dd>{{ t.address ?? '—' }}</dd>
            <dt>NIU</dt>
            <dd>{{ t.niu ?? '—' }}</dd>
            <dt>RCCM</dt>
            <dd>{{ t.rccm ?? '—' }}</dd>
            <dt>Client depuis</dt>
            <dd>{{ t.createdAt | frDate }}</dd>
          </dl>
          @if (admin) {
            <div class="mt-4">
              @if (t.status === 'ACTIVE') {
                <button mat-stroked-button type="button" (click)="suspend()">
                  Suspendre le pressing
                </button>
              } @else {
                <button mat-stroked-button type="button" (click)="reactivate()">
                  Réactiver le pressing
                </button>
              }
            </div>
          }
        </section>

        <section class="lv-card">
          <h2 class="mb-4 text-xl">Licences</h2>
          @for (l of t.licenses; track l.id) {
            <a
              class="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-field border border-mint-100 p-3 no-underline"
              [routerLink]="['/admin/licenses', l.id]"
            >
              <span
                ><strong class="tabular text-ink-900">{{ l.key }}</strong
                ><br /><span class="text-sm text-ink-900"
                  >{{ l.planName }} · jusqu’au {{ l.endsAt | frDate }}</span
                ></span
              >
              <lv-license-chip [status]="l.status" />
            </a>
          } @empty {
            <p>Aucune licence. Créez un essai ou une licence active.</p>
          }
        </section>
      </div>

      <section class="mt-6">
        <h2 class="mb-3 text-xl">Utilisateurs</h2>
        <div class="lv-table-wrap">
          <table class="lv-table">
            <caption class="sr-only">
              Utilisateurs du pressing
            </caption>
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Contact</th>
                <th scope="col">Rôles</th>
                <th scope="col">Dernière connexion</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of t.users; track u.id) {
                <tr>
                  <td class="font-semibold">
                    {{ u.fullName }}
                    @if (!u.isActive) {
                      <lv-chip tone="bg-ink-900 text-white">Désactivé</lv-chip>
                    } @else if (u.pendingInvitation) {
                      <lv-chip tone="bg-amber-500 text-ink-900">Invitation envoyée</lv-chip>
                    }
                  </td>
                  <td>
                    {{ u.phone | phone }}<br /><span class="text-sm">{{ u.email ?? '' }}</span>
                  </td>
                  <td>{{ roles(u) }}</td>
                  <td>{{ u.lastLoginAt | frDateTime }}</td>
                  <td>
                    @if (admin && u.isActive) {
                      <button type="button" class="lv-link-button" (click)="resetUser(t.id, u)">
                        Nouveau lien
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">Aucun utilisateur. Invitez la responsable.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="mb-3 text-xl">Paiements d’abonnement</h2>
        <div class="lv-table-wrap">
          <table class="lv-table">
            <caption class="sr-only">
              Paiements d’abonnement
            </caption>
            <thead>
              <tr>
                <th scope="col">Reçu le</th>
                <th scope="col">Période</th>
                <th scope="col">Mode</th>
                <th scope="col" class="num">Montant</th>
                <th scope="col" class="num">Déductions</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              @for (p of t.payments; track p.id) {
                <tr>
                  <td>{{ p.receivedAt | frDate }}</td>
                  <td>{{ p.periodStart | frDate }} – {{ p.periodEnd | frDate }}</td>
                  <td>{{ methodLabel[p.method] }} {{ p.reference ? '· ' + p.reference : '' }}</td>
                  <td class="num">{{ p.amountXaf | xaf }}</td>
                  <td class="num">{{ p.deductionsXaf | xaf }}</td>
                  <td>{{ p.status === 'REFUNDED' ? 'Remboursé' : 'Enregistré' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">Aucun paiement.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else if (tenant.error()) {
      <p class="lv-alert" role="alert">Pressing introuvable.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantDetailPage {
  readonly id = input.required<string>();
  private readonly api = inject(AdminApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly admin = inject(AuthService).hasPlatformRole('SUPER_ADMIN');
  protected readonly statusLabel = TENANT_STATUS_LABELS;
  protected readonly methodLabel = PAYMENT_METHOD_LABELS;

  protected readonly tenant = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.tenant(params),
  });
  protected readonly panel = signal<Panel>(null);
  protected readonly panelError = signal<string | null>(null);
  protected readonly invite = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', Validators.required],
    email: ['', Validators.email],
  });

  protected readonly roles = (u: TenantUserDto) =>
    u.tenantRoles.map((r) => TENANT_ROLE_LABELS[r]).join(', ');

  protected done(message: string): void {
    this.panel.set(null);
    this.toast.success(message);
    this.tenant.reload();
  }

  protected async sendInvitation(tenantName: string): Promise<void> {
    if (this.invite.invalid) {
      this.invite.markAllAsTouched();
      return;
    }
    const v = this.invite.getRawValue();
    this.panelError.set(null);
    try {
      const link = await this.api.inviteOwner(this.id(), {
        fullName: v.fullName,
        phone: v.phone,
        email: v.email || undefined,
      });
      this.invite.reset();
      this.done('Invitation créée.');
      showInvitation(this.dialog, {
        title: `Invitation pour ${tenantName}`,
        name: v.fullName,
        link,
      });
    } catch (e) {
      this.panelError.set(errorMessage(e));
    }
  }

  protected async resetUser(tenantId: string, u: TenantUserDto): Promise<void> {
    try {
      showInvitation(this.dialog, {
        title: 'Nouveau lien de connexion',
        name: u.fullName,
        link: await this.api.resetTenantUser(tenantId, u.id),
      });
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async suspend(): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Suspendre ce pressing ?',
      message:
        'Ses utilisateurs seront déconnectés et ne pourront plus se connecter jusqu’à la réactivation.',
      confirmLabel: 'Suspendre',
      danger: true,
      askReason: true,
    });
    if (!ok) return;
    try {
      await this.api.suspendTenant(this.id(), ok.reason);
      this.done('Pressing suspendu.');
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async reactivate(): Promise<void> {
    try {
      await this.api.reactivateTenant(this.id());
      this.done('Pressing réactivé.');
    } catch (e) {
      this.toast.error(e);
    }
  }
}
