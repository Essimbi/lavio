import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Icon } from '../icon/icon';
import { LicenseBanner } from '../license-banner/license-banner';
import { Logo } from '../logo/logo';
import type { NavItem, ShellConfig } from './nav';

/**
 * Coquille de l'application (docs/08) : barre latérale sur écran large (≥ 1024 px),
 * navigation basse sur téléphone. Utilisée par l'application du pressing et le superadmin.
 */
@Component({
  selector: 'lv-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo, LicenseBanner],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly config = input.required<ShellConfig>();
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private visible(item: NavItem): boolean {
    if (item.tenantRoles && !this.auth.hasTenantRole(...item.tenantRoles)) return false;
    if (item.platformRoles && !this.auth.hasPlatformRole(...item.platformRoles)) return false;
    return true;
  }

  protected readonly items = computed(() => this.config().items.filter((i) => this.visible(i)));
  protected readonly mobileItems = computed(() =>
    this.config().mobileItems.filter((i) => this.visible(i)),
  );
  protected readonly subtitle = computed(() => this.auth.tenant()?.name ?? this.config().area);

  protected async logout(): Promise<void> {
    await this.auth.logout().catch(() => undefined);
    await this.router.navigateByUrl(this.config().loginPath);
  }
}
