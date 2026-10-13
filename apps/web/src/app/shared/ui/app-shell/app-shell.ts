import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  type OnInit,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationCenter } from '../../../core/notifications/notification-center';
import { OfflineQueue } from '../../../core/offline/offline-queue';
import { PwaService } from '../../../core/pwa/pwa.service';
import { PwaBanners } from '../pwa-banners/pwa-banners';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo, LicenseBanner, PwaBanners],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell implements OnInit {
  readonly config = input.required<ShellConfig>();
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly center = inject(NotificationCenter);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pwa = inject(PwaService);
  private readonly queue = inject(OfflineQueue);

  ngOnInit(): void {
    if (!this.config().notifications) return;
    // Application du pressing : compteurs, file d'envoi, PWA (mise à jour, installation, push).
    this.destroyRef.onDestroy(this.center.start());
    this.destroyRef.onDestroy(this.queue.start());
    this.pwa.start(this.destroyRef);
  }

  protected readonly unread = this.center.unread;

  /** Valeur de la pastille d'une entrée (0 : pas de pastille). */
  protected badge(item: NavItem): number {
    if (!this.config().notifications || !item.badge) return 0;
    const approvals = this.auth.hasTenantRole() ? this.center.pendingApprovals() : 0;
    if (item.badge === 'approvals') return approvals;
    if (item.badge === 'notifications') return this.center.unread();
    return approvals + this.center.unread();
  }

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
