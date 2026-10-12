import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { LicenseStatus } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import {
  dateInputToIso,
  FrDatePipe,
  FrDateTimePipe,
  LICENSE_STATUS_LABELS,
  todayInput,
} from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Pager } from '../../shared/ui/pager/pager';
import { LicenseChip } from '../../shared/ui/status-chip/status-chip';
import { Toast } from '../../shared/ui/toast/toast.service';
import { LICENSE_EVENT_LABELS } from './labels';

/** Liste des licences, filtrable par statut ou par échéance proche. */
@Component({
  selector: 'lv-licenses-page',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    RouterLink,
    PageHeader,
    Pager,
    LicenseChip,
    FrDatePipe,
  ],
  template: `
    <lv-page-header heading="Licences" subtitle="Abonnements des pressings." />
    <div class="mb-4 flex flex-wrap gap-4">
      <mat-form-field>
        <mat-label>Statut</mat-label>
        <mat-select
          [ngModel]="status()"
          (ngModelChange)="status.set($event); soon.set(''); page.set(1)"
        >
          <mat-option [value]="''">Tous</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ label[s] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Échéance</mat-label>
        <mat-select
          [ngModel]="soon()"
          (ngModelChange)="soon.set($event); status.set(''); page.set(1)"
        >
          <mat-option [value]="''">Toutes</mat-option>
          <mat-option [value]="'15'">Sous 15 jours</mat-option>
          <mat-option [value]="'30'">Sous 30 jours</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Licences
        </caption>
        <thead>
          <tr>
            <th scope="col">Clé</th>
            <th scope="col">Pressing</th>
            <th scope="col">Plan</th>
            <th scope="col">Statut</th>
            <th scope="col">Fin</th>
          </tr>
        </thead>
        <tbody>
          @for (l of list.hasValue() ? list.value().data : []; track l.id) {
            <tr>
              <td>
                <a class="tabular font-semibold" [routerLink]="['/admin/licenses', l.id]">{{
                  l.key
                }}</a>
              </td>
              <td>
                <a [routerLink]="['/admin/tenants', l.tenantId]">{{ l.tenantName }}</a>
              </td>
              <td>{{ l.planName }}</td>
              <td><lv-license-chip [status]="l.status" /></td>
              <td>{{ l.endsAt | frDate }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5">{{ list.isLoading() ? 'Chargement…' : 'Aucune licence.' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <lv-pager [meta]="list.hasValue() ? list.value().meta : null" (page)="page.set($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicensesPage {
  /** Filtres reçus du tableau de bord (`?statut=GRACE`, `?bientot=15`). */
  readonly statut = input<string>();
  readonly bientot = input<string>();
  private readonly api = inject(AdminApi);
  protected readonly statuses = Object.values(LicenseStatus);
  protected readonly label = LICENSE_STATUS_LABELS;
  protected readonly status = linkedSignal(() => this.statut() ?? '');
  protected readonly soon = linkedSignal(() => this.bientot() ?? '');
  protected readonly page = signal(1);
  protected readonly list = resource({
    params: () => ({ status: this.status(), expiringWithinDays: this.soon(), page: this.page() }),
    loader: ({ params }) => this.api.licenses(params),
  });
}

/** Détail d'une licence : historique et actions (renouveler, changer de plan, suspendre…). */
@Component({
  selector: 'lv-license-detail',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    PageHeader,
    LicenseChip,
    FrDatePipe,
    FrDateTimePipe,
  ],
  template: `
    @if (license.hasValue()) {
      @let l = license.value();
      <lv-page-header [heading]="l.key" [subtitle]="l.tenantName + ' · plan ' + l.planName">
        <a mat-button [routerLink]="['/admin/tenants', l.tenantId]">Voir le pressing</a>
      </lv-page-header>
      <div class="grid gap-6 xl:grid-cols-2">
        <section class="lv-card">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl">Licence</h2>
            <lv-license-chip [status]="l.status" />
          </div>
          <dl class="lv-dl">
            <dt>Début</dt>
            <dd>{{ l.startsAt | frDate }}</dd>
            <dt>Fin</dt>
            <dd>{{ l.endsAt | frDate }}</dd>
            <dt>Fin de la grâce</dt>
            <dd>{{ l.graceEndsAt | frDate }} ({{ l.graceDays }} jours)</dd>
            <dt>Utilisateurs</dt>
            <dd>{{ l.maxUsers ?? 'selon le plan' }}</dd>
            <dt>Notes</dt>
            <dd>{{ l.notes ?? '—' }}</dd>
          </dl>
          @if (admin && l.status !== 'REVOKED') {
            <div class="mt-6 grid gap-4">
              <div class="flex flex-wrap items-end gap-3">
                <mat-form-field>
                  <mat-label>Nouvelle date de fin</mat-label>
                  <input
                    matInput
                    type="date"
                    [ngModel]="renewTo()"
                    (ngModelChange)="renewTo.set($event)"
                  />
                </mat-form-field>
                <button mat-stroked-button type="button" (click)="renew()" [disabled]="!renewTo()">
                  Renouveler
                </button>
              </div>
              <div class="flex flex-wrap items-end gap-3">
                <mat-form-field>
                  <mat-label>Plan</mat-label>
                  <mat-select [ngModel]="planId()" (ngModelChange)="planId.set($event)">
                    @for (p of plans.hasValue() ? plans.value() : []; track p.id) {
                      <mat-option [value]="p.id">{{ p.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button
                  mat-stroked-button
                  type="button"
                  (click)="changePlan()"
                  [disabled]="!planId() || planId() === l.planId"
                >
                  Changer de plan
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                @if (l.status === 'SUSPENDED') {
                  <button mat-stroked-button type="button" (click)="reactivate()">Réactiver</button>
                } @else {
                  <button mat-stroked-button type="button" (click)="suspend()">Suspendre</button>
                }
                <button mat-flat-button class="lv-danger" type="button" (click)="revoke()">
                  Révoquer
                </button>
              </div>
            </div>
          }
        </section>
        <section class="lv-card">
          <h2 class="mb-4 text-xl">Historique</h2>
          <ol class="grid gap-3" role="list">
            @for (e of l.events; track e.id) {
              <li class="border-l-4 border-aqua-400 pl-3">
                <p class="font-semibold">{{ eventLabel[e.type] ?? e.type }}</p>
                <p class="text-sm">
                  {{ e.createdAt | frDateTime }} · {{ e.actorName ?? 'Automatique' }}
                </p>
              </li>
            }
          </ol>
        </section>
      </div>
    } @else if (license.error()) {
      <p class="lv-alert" role="alert">Licence introuvable.</p>
    } @else {
      <p aria-busy="true">Chargement…</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseDetailPage {
  readonly id = input.required<string>();
  private readonly api = inject(AdminApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly admin = inject(AuthService).hasPlatformRole('SUPER_ADMIN');
  protected readonly eventLabel = LICENSE_EVENT_LABELS;
  protected readonly license = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.license(params),
  });
  protected readonly plans = resource({ loader: () => this.api.plans() });
  protected readonly renewTo = signal(todayInput(30));
  protected readonly planId = signal('');

  private async run(action: () => Promise<unknown>, message: string): Promise<void> {
    try {
      await action();
      this.toast.success(message);
      this.license.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected renew = () =>
    this.run(
      () => this.api.renewLicense(this.id(), dateInputToIso(this.renewTo())),
      'Licence renouvelée.',
    );
  protected changePlan = () =>
    this.run(() => this.api.changePlan(this.id(), this.planId()), 'Plan modifié.');
  protected reactivate = () =>
    this.run(() => this.api.reactivateLicense(this.id()), 'Licence réactivée.');

  protected async suspend(): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Suspendre cette licence ?',
      message: 'Le pressing passera en lecture seule jusqu’à la réactivation.',
      confirmLabel: 'Suspendre',
      danger: true,
      askReason: true,
    });
    if (ok)
      await this.run(() => this.api.suspendLicense(this.id(), ok.reason), 'Licence suspendue.');
  }

  protected async revoke(): Promise<void> {
    const ok = await confirmAction(this.dialog, {
      title: 'Révoquer cette licence ?',
      message: 'La révocation est définitive : la licence ne pourra plus être renouvelée.',
      confirmLabel: 'Révoquer',
      danger: true,
      askReason: true,
    });
    if (ok) await this.run(() => this.api.revokeLicense(this.id(), ok.reason), 'Licence révoquée.');
  }
}
