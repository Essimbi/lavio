import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TenantRole, type TenantUserDto } from '@lavio/shared';
import { AppApi } from '../../core/api/app-api';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api';
import { FrDateTimePipe, PhonePipe, TENANT_ROLE_LABELS } from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { showInvitation } from '../../shared/ui/invitation-dialog/invitation-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Chip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';

const ROLES = Object.values(TenantRole);

/** Utilisateurs du pressing (module 12) : invitation, rôles cumulables, désactivation. */
@Component({
  selector: 'lv-users-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeader,
    Chip,
    PhonePipe,
    FrDateTimePipe,
  ],
  template: `
    <lv-page-header
      heading="Utilisateurs"
      subtitle="Les personnes qui travaillent dans votre pressing."
    >
      @if (!adding()) {
        <button
          mat-flat-button
          type="button"
          (click)="adding.set(true)"
          [disabled]="auth.isReadOnly()"
        >
          Ajouter un utilisateur
        </button>
      }
    </lv-page-header>

    @if (limitUrl()) {
      <div class="lv-card mb-6 border-l-4 border-amber-500" role="status">
        <p class="font-semibold">Le nombre maximal d’utilisateurs de votre licence est atteint.</p>
        <a class="lv-whatsapp mt-3" [href]="limitUrl()" target="_blank" rel="noopener"
          >Ajouter des utilisateurs</a
        >
      </div>
    }

    @if (adding()) {
      <form class="lv-card mb-6" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <h2 class="mb-4 text-xl">Nouvel utilisateur</h2>
        <div class="lv-form-grid">
          <mat-form-field>
            <mat-label>Nom complet</mat-label>
            <input matInput formControlName="fullName" autocomplete="off" />
            <mat-error>Indiquez le nom.</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Téléphone</mat-label>
            <input
              matInput
              formControlName="phone"
              inputmode="tel"
              placeholder="+237 6XX XX XX XX"
            />
          </mat-form-field>
          <mat-form-field>
            <mat-label>E-mail (facultatif)</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
        </div>
        <fieldset class="mt-2">
          <legend class="mb-2 font-semibold">Rôles</legend>
          <div class="flex flex-wrap gap-x-6">
            @for (role of roles; track role) {
              <mat-checkbox
                [checked]="selected().includes(role)"
                (change)="toggle(role, $event.checked)"
                >{{ labels[role] }}</mat-checkbox
              >
            }
          </div>
        </fieldset>
        @if (formError()) {
          <p class="lv-alert mt-4" role="alert">{{ formError() }}</p>
        }
        <div class="mt-4 flex gap-2">
          <button mat-flat-button type="submit" [disabled]="pending()">Inviter</button>
          <button mat-button type="button" (click)="cancel()">Annuler</button>
        </div>
      </form>
    }

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
            <th scope="col">État</th>
            <th scope="col">Dernière connexion</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (u of users.hasValue() ? users.value() : []; track u.id) {
            <tr>
              <td class="font-semibold">{{ u.fullName }}</td>
              <td>
                {{ u.phone | phone }}<br /><span class="text-sm">{{ u.email ?? '' }}</span>
              </td>
              <td>{{ roleNames(u) }}</td>
              <td>
                @if (!u.isActive) {
                  <lv-chip tone="bg-ink-900 text-white">Désactivé</lv-chip>
                } @else if (u.pendingInvitation) {
                  <lv-chip tone="bg-amber-500 text-ink-900">Invitation envoyée</lv-chip>
                } @else {
                  <lv-chip tone="bg-aqua-400 text-ink-900">Actif</lv-chip>
                }
              </td>
              <td>{{ u.lastLoginAt | frDateTime }}</td>
              <td class="whitespace-nowrap">
                @if (u.id !== auth.user()?.id) {
                  @if (u.isActive) {
                    <button
                      type="button"
                      class="lv-link-button"
                      (click)="link(u)"
                      [disabled]="auth.isReadOnly()"
                    >
                      Nouveau lien
                    </button>
                    <button
                      type="button"
                      class="lv-link-button"
                      (click)="setActive(u, false)"
                      [disabled]="auth.isReadOnly()"
                    >
                      Désactiver
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="lv-link-button"
                      (click)="setActive(u, true)"
                      [disabled]="auth.isReadOnly()"
                    >
                      Réactiver
                    </button>
                  }
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">
                {{ users.error() ? 'Impossible de charger les utilisateurs.' : 'Chargement…' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly api = inject(AppApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly auth = inject(AuthService);
  protected readonly roles = ROLES;
  protected readonly labels = TENANT_ROLE_LABELS;

  protected readonly users = resource({ loader: () => this.api.users() });
  protected readonly adding = signal(false);
  protected readonly pending = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly limitUrl = signal<string | null>(null);
  protected readonly selected = signal<TenantRole[]>(['CASHIER']);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    email: ['', Validators.email],
  });

  protected readonly roleNames = (u: TenantUserDto) =>
    u.tenantRoles.map((r) => TENANT_ROLE_LABELS[r]).join(', ');

  protected toggle(role: TenantRole, checked: boolean): void {
    this.selected.update((list) =>
      checked ? [...new Set([...list, role])] : list.filter((r) => r !== role),
    );
  }

  protected cancel(): void {
    this.adding.set(false);
    this.form.reset();
    this.formError.set(null);
  }

  protected async create(): Promise<void> {
    const { fullName, phone, email } = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!phone && !email) {
      this.formError.set('Indiquez un téléphone ou un e-mail.');
      return;
    }
    if (this.selected().length === 0) {
      this.formError.set('Choisissez au moins un rôle.');
      return;
    }
    this.pending.set(true);
    this.formError.set(null);
    try {
      const res = await this.api.createUser({
        fullName,
        phone: phone || undefined,
        email: email || undefined,
        roles: this.selected(),
      });
      this.cancel();
      this.users.reload();
      showInvitation(this.dialog, {
        title: 'Utilisateur ajouté',
        name: res.user.fullName,
        link: res.invitation,
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'USER_LIMIT_REACHED') {
        this.limitUrl.set((e.details?.['whatsappUrl'] as string | undefined) ?? null);
      }
      this.formError.set(errorMessage(e));
    } finally {
      this.pending.set(false);
    }
  }

  protected async link(u: TenantUserDto): Promise<void> {
    try {
      showInvitation(this.dialog, {
        title: 'Nouveau lien de connexion',
        name: u.fullName,
        link: await this.api.resetPassword(u.id),
      });
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async setActive(u: TenantUserDto, active: boolean): Promise<void> {
    if (!active) {
      const ok = await confirmAction(this.dialog, {
        title: 'Désactiver cet utilisateur ?',
        message: `${u.fullName} ne pourra plus se connecter. Vous pourrez le réactiver plus tard.`,
        confirmLabel: 'Désactiver',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await this.api.updateUser(u.id, { isActive: active });
      this.toast.success(active ? 'Utilisateur réactivé.' : 'Utilisateur désactivé.');
      this.users.reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'USER_LIMIT_REACHED') {
        this.limitUrl.set((e.details?.['whatsappUrl'] as string | undefined) ?? null);
      }
      this.toast.error(e);
    }
  }
}
