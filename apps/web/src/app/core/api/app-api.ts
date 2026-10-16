import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AuditLogDto,
  InvitationLink,
  LicenseDetails,
  Paginated,
  TenantRole,
  TenantUserDto,
} from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api';

export interface NewTenantUser {
  fullName: string;
  email?: string;
  phone?: string;
  roles: TenantRole[];
}

/** Appels de l'application du pressing (phase 1 : licence, utilisateurs, audit). */
@Injectable({ providedIn: 'root' })
export class AppApi {
  private readonly http = inject(HttpClient);

  license(): Promise<LicenseDetails> {
    return firstValueFrom(this.http.get<LicenseDetails>(`${API_BASE}/license/status`));
  }

  users(): Promise<TenantUserDto[]> {
    return firstValueFrom(this.http.get<TenantUserDto[]>(`${API_BASE}/users`));
  }

  createUser(body: NewTenantUser): Promise<{ user: TenantUserDto; invitation: InvitationLink }> {
    return firstValueFrom(
      this.http.post<{ user: TenantUserDto; invitation: InvitationLink }>(
        `${API_BASE}/users`,
        body,
      ),
    );
  }

  updateUser(
    id: string,
    body: Partial<{ fullName: string; roles: TenantRole[]; isActive: boolean }>,
  ): Promise<TenantUserDto> {
    return firstValueFrom(this.http.patch<TenantUserDto>(`${API_BASE}/users/${id}`, body));
  }

  resetPassword(id: string): Promise<InvitationLink> {
    return firstValueFrom(
      this.http.post<InvitationLink>(`${API_BASE}/users/${id}/reset-password`, {}),
    );
  }

  /** Journal du pressing ; `from` inclus et `to` exclu (instants ISO 8601). */
  auditLogs(
    q: { page?: number; userId?: string; entity?: string; from?: string; to?: string } = {},
  ): Promise<Paginated<AuditLogDto>> {
    const params = Object.fromEntries(
      Object.entries({ pageSize: 25, page: 1, ...q }).filter(([, v]) => v !== ''),
    ) as Record<string, string | number>;
    return firstValueFrom(
      this.http.get<Paginated<AuditLogDto>>(`${API_BASE}/audit-logs`, { params }),
    );
  }
}
