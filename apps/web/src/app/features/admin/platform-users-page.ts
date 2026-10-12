import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PlatformRole, type PlatformUserDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { FrDateTimePipe } from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { showInvitation } from '../../shared/ui/invitation-dialog/invitation-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Chip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';
import { PLATFORM_ROLE_LABELS } from './labels';

/** Utilisateurs de la plateforme : Concepteur (SUPER_ADMIN) et Exploitant (PARTNER_VIEWER). */
@Component({
  selector: 'lv-platform-users-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PageHeader,
    Chip,
    FrDateTimePipe,
  ],
  template: `
    <lv-page-header heading="Utilisateurs plateforme" subtitle="Accès au superadmin.">
      @if (!adding()) {
        <button mat-flat-button type="button" (click)="adding.set(true)">
          Inviter un utilisateur
        </button>
      }
    </lv-page-header>
    @if (adding()) {
      <form class="lv-card mb-6" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <div class="lv-form-grid">
          <mat-form-field
            ><mat-label>Nom complet</mat-label><input matInput formControlName="fullName"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>E-mail</mat-label
            ><input matInput type="email" formControlName="email" /><mat-error
              >E-mail valide obligatoire.</mat-error
            ></mat-form-field
          >
          <mat-form-field
            ><mat-label>Téléphone (WhatsApp)</mat-label
            ><input matInput formControlName="phone" inputmode="tel"
          /></mat-form-field>
          <mat-form-field>
            <mat-label>Rôle</mat-label>
            <mat-select formControlName="platformRole">
              @for (r of roles; track r) {
                <mat-option [value]="r">{{ label[r] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        @if (error()) {
          <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
        }
        <div class="mt-4 flex gap-2">
          <button mat-flat-button type="submit">Inviter</button>
          <button mat-button type="button" (click)="adding.set(false)">Annuler</button>
        </div>
      </form>
    }
    <div class="lv-table-wrap">
      <table class="lv-table">
        <caption class="sr-only">
          Utilisateurs plateforme
        </caption>
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">E-mail</th>
            <th scope="col">Rôle</th>
            <th scope="col">Dernière connexion</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (u of users.hasValue() ? users.value() : []; track u.id) {
            <tr>
              <td class="font-semibold">
                {{ u.fullName }}
                @if (!u.isActive) {
                  <lv-chip tone="bg-ink-900 text-white">Désactivé</lv-chip>
                }
              </td>
              <td>{{ u.email }}</td>
              <td>{{ label[u.platformRole] }}</td>
              <td>{{ u.lastLoginAt | frDateTime }}</td>
              <td class="whitespace-nowrap">
                @if (u.id !== me) {
                  @if (u.isActive) {
                    <button type="button" class="lv-link-button" (click)="reset(u)">
                      Nouveau lien
                    </button>
                    <button type="button" class="lv-link-button" (click)="setActive(u, false)">
                      Désactiver
                    </button>
                  } @else {
                    <button type="button" class="lv-link-button" (click)="setActive(u, true)">
                      Réactiver
                    </button>
                  }
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformUsersPage {
  private readonly api = inject(AdminApi);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(Toast);
  protected readonly me = inject(AuthService).user()?.id;
  protected readonly roles = Object.values(PlatformRole);
  protected readonly label = PLATFORM_ROLE_LABELS;
  protected readonly users = resource({ loader: () => this.api.platformUsers() });
  protected readonly adding = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    platformRole: inject(FormBuilder).nonNullable.control<PlatformRole>('PARTNER_VIEWER'),
  });

  protected async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    try {
      const res = await this.api.createPlatformUser({ ...v, phone: v.phone || undefined });
      this.adding.set(false);
      this.form.reset();
      this.users.reload();
      showInvitation(this.dialog, {
        title: 'Utilisateur invité',
        name: res.user.fullName,
        link: res.invitation,
      });
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  protected async reset(u: PlatformUserDto): Promise<void> {
    try {
      showInvitation(this.dialog, {
        title: 'Nouveau lien de connexion',
        name: u.fullName,
        link: await this.api.resetPlatformUser(u.id),
      });
    } catch (e) {
      this.toast.error(e);
    }
  }

  protected async setActive(u: PlatformUserDto, active: boolean): Promise<void> {
    if (
      !active &&
      !(await confirmAction(this.dialog, {
        title: 'Désactiver cet utilisateur ?',
        message: `${u.fullName} n’aura plus accès au superadmin.`,
        confirmLabel: 'Désactiver',
        danger: true,
      }))
    )
      return;
    try {
      await this.api.updatePlatformUser(u.id, { isActive: active });
      this.users.reload();
    } catch (e) {
      this.toast.error(e);
    }
  }
}
