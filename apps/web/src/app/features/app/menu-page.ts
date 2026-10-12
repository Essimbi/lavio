import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Icon, type IconName } from '../../shared/ui/icon/icon';
import { PageHeader } from '../../shared/ui/page-header/page-header';

export interface MenuEntry {
  label: string;
  description: string;
  path: string;
  icon: IconName;
  ownerOnly?: boolean;
  superAdminOnly?: boolean;
}

/** Liste de liens : « Paramètres » et « Plus » (navigation mobile). */
@Component({
  selector: 'lv-menu-page',
  imports: [RouterLink, Icon, PageHeader],
  template: `
    <lv-page-header [heading]="heading()" />
    <ul class="grid max-w-3xl gap-3 sm:grid-cols-2" role="list">
      @for (entry of visible(); track entry.path) {
        <li>
          <a
            class="lv-card flex items-start gap-3 no-underline transition-shadow hover:shadow-lg"
            [routerLink]="entry.path"
          >
            <span
              class="grid size-10 shrink-0 place-items-center rounded-full bg-mint-100 text-teal-900"
              ><lv-icon [name]="entry.icon"
            /></span>
            <span>
              <span class="block font-semibold text-teal-900">{{ entry.label }}</span>
              <span class="text-sm text-ink-900/80">{{ entry.description }}</span>
            </span>
          </a>
        </li>
      }
      <li>
        <button
          type="button"
          class="lv-card flex w-full items-start gap-3 text-left"
          (click)="logout()"
        >
          <span
            class="grid size-10 shrink-0 place-items-center rounded-full bg-mint-100 text-teal-900"
            ><lv-icon name="logout"
          /></span>
          <span>
            <span class="block font-semibold text-teal-900">Se déconnecter</span>
            <span class="text-sm text-ink-900/80">Fermer la session sur cet appareil.</span>
          </span>
        </button>
      </li>
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  readonly heading = input('Plus');
  readonly entries = input<MenuEntry[]>([]);
  readonly loginPath = input('/login');
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly visible = computed(() =>
    this.entries().filter(
      (e) =>
        (!e.ownerOnly || this.auth.hasTenantRole()) &&
        (!e.superAdminOnly || this.auth.hasPlatformRole('SUPER_ADMIN')),
    ),
  );

  protected async logout(): Promise<void> {
    await this.auth.logout().catch(() => undefined);
    await this.router.navigateByUrl(this.loginPath());
  }
}
