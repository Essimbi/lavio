import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  AcceptInvitationRequest,
  ChangePasswordRequest,
  LoginArea,
  MeResponse,
  PlatformRole,
  TenantRole,
  TokenResponse,
} from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api';

/**
 * Session de l'utilisateur (docs/02) : jeton d'accès en mémoire uniquement (jamais en
 * stockage local), jeton de rafraîchissement dans un cookie HttpOnly géré par le navigateur.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private token: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private restored: Promise<boolean> | null = null;

  readonly me = signal<MeResponse | null>(null);
  readonly user = computed(() => this.me()?.user ?? null);
  readonly tenant = computed(() => this.me()?.tenant ?? null);
  readonly license = computed(() => this.me()?.license ?? null);
  readonly isPlatform = computed(() => !!this.user()?.platformRole);
  readonly isReadOnly = computed(() => this.license()?.readOnly ?? false);

  get accessToken(): string | null {
    return this.token;
  }

  hasTenantRole(...roles: TenantRole[]): boolean {
    const mine = this.user()?.tenantRoles ?? [];
    return mine.includes('OWNER') || roles.some((r) => mine.includes(r));
  }

  hasPlatformRole(...roles: PlatformRole[]): boolean {
    const role = this.user()?.platformRole;
    return !!role && (roles.length === 0 || roles.includes(role));
  }

  async login(identifier: string, password: string, area: LoginArea): Promise<MeResponse> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE}/auth/login`, { identifier, password, area }),
    );
    this.token = res.accessToken;
    return this.loadMe();
  }

  async acceptInvitation(body: AcceptInvitationRequest): Promise<MeResponse> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE}/auth/accept-invitation`, body),
    );
    this.token = res.accessToken;
    return this.loadMe();
  }

  async changePassword(body: ChangePasswordRequest): Promise<MeResponse> {
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE}/auth/change-password`, body),
    );
    this.token = res.accessToken;
    return this.loadMe();
  }

  async loadMe(): Promise<MeResponse> {
    const me = await firstValueFrom(this.http.get<MeResponse>(`${API_BASE}/auth/me`));
    this.me.set(me);
    return me;
  }

  /** Un seul rafraîchissement à la fois : les requêtes concurrentes attendent le même résultat. */
  refresh(): Promise<boolean> {
    this.refreshing ??= firstValueFrom(
      this.http.post<TokenResponse>(`${API_BASE}/auth/refresh`, {}),
    )
      .then((res) => {
        this.token = res.accessToken;
        return true;
      })
      .catch(() => {
        this.clear();
        return false;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  /** Au chargement de l'application : reprend la session à partir du cookie, une seule fois. */
  restore(): Promise<boolean> {
    if (this.me()) return Promise.resolve(true);
    this.restored ??= this.refresh()
      .then(async (ok) => {
        if (!ok) return false;
        await this.loadMe();
        return true;
      })
      .catch(() => false)
      .finally(() => {
        this.restored = null;
      });
    return this.restored;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API_BASE}/auth/logout`, {}));
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.token = null;
    this.me.set(null);
  }
}
