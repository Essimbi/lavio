import { HttpClient, type HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AdminDashboard,
  AuditLogDto,
  InvitationLink,
  LeadDto,
  LeadStatus,
  LicenseDto,
  LicenseEventDto,
  Paginated,
  PlanDto,
  PlatformRole,
  PlatformSettingsDto,
  PlatformUserDto,
  Statement,
  SubscriptionPaymentDto,
  SubscriptionPaymentMethod,
  TenantDetail,
  TenantListItem,
} from '@lavio/shared';
import { firstValueFrom, type Observable } from 'rxjs';
import { API_BASE } from '../http/api';

type Query = Record<string, string | number | boolean | undefined | null>;

/** Supprime les paramètres vides avant l'envoi. */
const params = (q: Query): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Record<string, string | number | boolean>;

export interface TenantInput {
  name: string;
  phone?: string;
  city?: string;
  address?: string;
  niu?: string;
  rccm?: string;
}

export interface LicenseInput {
  tenantId: string;
  planId: string;
  status: 'TRIAL' | 'ACTIVE';
  startsAt?: string;
  endsAt?: string;
  maxUsers?: number | null;
  notes?: string;
}

export interface PaymentInput {
  tenantId: string;
  licenseId: string;
  amountXaf: number;
  method: SubscriptionPaymentMethod;
  reference?: string;
  receivedAt: string;
  periodStart: string;
  periodEnd: string;
  deductionsXaf?: number;
  deductionNote?: string;
}

export type PlanInput = Omit<PlanDto, 'id'>;

/** Appels de l'API superadmin (`/admin/*`, docs/04). */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/admin`;

  private get<T>(path: string, q: Query = {}): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(`${this.base}${path}`, { params: params(q) as unknown as HttpParams }),
    );
  }

  private post<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.base}${path}`, body));
  }

  private patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(`${this.base}${path}`, body));
  }

  dashboard = () => this.get<AdminDashboard>('/dashboard');

  tenants = (q: Query) => this.get<Paginated<TenantListItem>>('/tenants', q);
  tenant = (id: string) => this.get<TenantDetail>(`/tenants/${id}`);
  createTenant = (body: TenantInput) => this.post<TenantDetail>('/tenants', body);
  updateTenant = (id: string, body: TenantInput) =>
    this.patch<TenantDetail>(`/tenants/${id}`, body);
  suspendTenant = (id: string, reason?: string) =>
    this.post<TenantDetail>(`/tenants/${id}/suspend`, { reason });
  reactivateTenant = (id: string) => this.post<TenantDetail>(`/tenants/${id}/reactivate`);
  inviteOwner = (id: string, body: { fullName: string; phone: string; email?: string }) =>
    this.post<InvitationLink>(`/tenants/${id}/owner-invitation`, body);
  resetTenantUser = (tenantId: string, userId: string) =>
    this.post<InvitationLink>(`/tenants/${tenantId}/users/${userId}/reset-password`);

  plans = () => this.get<PlanDto[]>('/plans');
  createPlan = (body: PlanInput) => this.post<PlanDto>('/plans', body);
  updatePlan = (id: string, body: Partial<PlanInput>) => this.patch<PlanDto>(`/plans/${id}`, body);

  licenses = (q: Query) => this.get<Paginated<LicenseDto>>('/licenses', q);
  license = (id: string) => this.get<LicenseDto & { events: LicenseEventDto[] }>(`/licenses/${id}`);
  createLicense = (body: LicenseInput) => this.post<LicenseDto>('/licenses', body);
  renewLicense = (id: string, endsAt: string) =>
    this.post<LicenseDto>(`/licenses/${id}/renew`, { endsAt });
  changePlan = (id: string, planId: string) =>
    this.post<LicenseDto>(`/licenses/${id}/change-plan`, { planId });
  suspendLicense = (id: string, reason?: string) =>
    this.post<LicenseDto>(`/licenses/${id}/suspend`, { reason });
  reactivateLicense = (id: string) => this.post<LicenseDto>(`/licenses/${id}/reactivate`);
  revokeLicense = (id: string, reason?: string) =>
    this.post<LicenseDto>(`/licenses/${id}/revoke`, { reason });

  payments = (q: Query) => this.get<Paginated<SubscriptionPaymentDto>>('/subscription-payments', q);
  createPayment = (body: PaymentInput) =>
    this.post<SubscriptionPaymentDto>('/subscription-payments', body);
  refundPayment = (id: string, reason?: string) =>
    this.post<SubscriptionPaymentDto>(`/subscription-payments/${id}/refund`, { reason });

  statement = (month: string) => this.get<Statement>('/statements', { month });
  exportStatement(month: string, format: 'csv' | 'xlsx' | 'pdf'): Observable<Blob> {
    return this.http.get(`${this.base}/statements/export`, {
      params: { month, format },
      responseType: 'blob',
    });
  }

  leads = (q: Query) => this.get<Paginated<LeadDto>>('/leads', q);
  updateLead = (id: string, body: { status?: LeadStatus; notes?: string }) =>
    this.patch<LeadDto>(`/leads/${id}`, body);

  platformUsers = () => this.get<PlatformUserDto[]>('/platform-users');
  createPlatformUser = (body: {
    fullName: string;
    email: string;
    phone?: string;
    platformRole: PlatformRole;
  }) => this.post<{ user: PlatformUserDto; invitation: InvitationLink }>('/platform-users', body);
  updatePlatformUser = (
    id: string,
    body: Partial<{ fullName: string; platformRole: PlatformRole; isActive: boolean }>,
  ) => this.patch<PlatformUserDto>(`/platform-users/${id}`, body);
  resetPlatformUser = (id: string) =>
    this.post<InvitationLink>(`/platform-users/${id}/reset-password`);

  settings = () => this.get<PlatformSettingsDto>('/settings');
  updateSettings = (body: Partial<PlatformSettingsDto>) =>
    this.patch<PlatformSettingsDto>('/settings', body);

  auditLogs = (q: Query) => this.get<Paginated<AuditLogDto>>('/audit-logs', q);
}
