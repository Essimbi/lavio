import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PlatformRole, type PlatformUserDto } from '@lavio/shared';
import { AdminApi } from '../../core/api/admin-api';
import { AuthService } from '../../core/auth/auth.service';
import { FrDateTimePipe } from '../../shared/format/format';
import { confirmAction } from '../../shared/ui/confirm-dialog/confirm-dialog';
import { LV_FIELD } from '../../shared/ui/field/field';
import { showInvitation } from '../../shared/ui/invitation-dialog/invitation-dialog';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { Chip } from '../../shared/ui/status-chip/status-chip';
import { errorMessage, Toast } from '../../shared/ui/toast/toast.service';
import { PLATFORM_ROLE_LABELS } from './labels';

/** Utilisateurs de la plateforme : Concepteur (SUPER_ADMIN) et Exploitant (PARTNER_VIEWER). */
@Component({
  selector: 'lv-platform-users-page',
  imports: [ReactiveFormsModule, LV_FIELD, PageHeader, Chip, FrDateTimePipe],
  template: `
    <lv-page-header heading="Utilisateurs plateforme" subtitle="Accès au superadmin.">
      @if (!adding()) {
        <button class="lv-primary" type="button" (click)="adding.set(true)">
          Inviter un utilisateur
        </button>
      }
    </lv-page-header>
    @if (adding()) {
      <form class="lv-card mb-6" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <div class="lv-form-grid">
          <lv-field label="Nom complet" [errors]="{ required: 'Indiquez le nom complet.' }">
            <input lvControl formControlName="fullName" autocomplete="name" />
          </lv-field>
          <lv-field
            label="E-mail"
            [errors]="{
              required: 'E-mail valide obligatoire.',
              email: 'E-mail valide obligatoire.',
            }"
          >
            <input lvControl type="email" formControlName="email" autocomplete="email" />
          </lv-field>
          <lv-field label="Téléphone (WhatsApp)" [optional]="true">
            <input lvControl formControlName="phone" inputmode="tel" autocomplete="tel" />
          </lv-field>
          <lv-field label="Rôle">
            <select lvControl formControlName="platformRole">
              @for (r of roles; track r) {
                <option [value]="r">{{ label[r] }}</option>
              }
            </select>
          </lv-field>
        </div>
        @if (error()) {
          <p class="lv-alert mt-2" role="alert">{{ error() }}</p>
        }
        <div class="mt-4 flex gap-2">
          <button class="lv-primary" type="submit">Inviter</button>
          <button class="lv-ghost" type="button" (click)="adding.set(false)">Annuler</button>
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
