import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApprovalDto,
  ApprovalStatus,
  CatalogEntryDto,
  CreateDepositRequest,
  CustomerDto,
  CustomerPreferences,
  CustomerType,
  DepositDto,
  DepositListItem,
  DepositStatus,
  LabelData,
  Paginated,
  PressingSettingsDto,
  PriceDto,
  PriceGrid,
  SpecialPriceDto,
  TicketData,
  UploadToken,
} from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api';

type Query = Record<string, string | number | boolean | undefined | null>;
const params = (q: Query) =>
  Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Record<string, string | number | boolean>;

export interface CustomerInput {
  name: string;
  phone: string;
  phone2?: string | null;
  address?: string;
  type?: CustomerType;
  preferences?: CustomerPreferences;
  notes?: string;
  creditAllowed?: boolean;
  creditLimitXaf?: number | null;
}

export type CatalogKind = 'item-types' | 'services';

/** Appels de l'application du pressing (phase 2 : clients, catalogue, dépôts, validations). */
@Injectable({ providedIn: 'root' })
export class PressingApi {
  private readonly http = inject(HttpClient);

  private get<T>(path: string, q: Query = {}) {
    return firstValueFrom(this.http.get<T>(`${API_BASE}${path}`, { params: params(q) }));
  }
  private post<T>(path: string, body: unknown = {}, headers?: HttpHeaders) {
    return firstValueFrom(this.http.post<T>(`${API_BASE}${path}`, body, { headers }));
  }
  private patch<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.patch<T>(`${API_BASE}${path}`, body));
  }
  private put<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.put<T>(`${API_BASE}${path}`, body));
  }

  // Clients
  customers = (q: Query) => this.get<Paginated<CustomerDto>>('/customers', q);
  customer = (id: string) => this.get<CustomerDto>(`/customers/${id}`);
  createCustomer = (body: CustomerInput) => this.post<CustomerDto>('/customers', body);
  updateCustomer = (id: string, body: Partial<CustomerInput>) =>
    this.patch<CustomerDto>(`/customers/${id}`, body);
  customerHistory = (id: string, page = 1) =>
    this.get<Paginated<DepositListItem>>(`/customers/${id}/history`, { page });
  specialPrices = (id: string) => this.get<SpecialPriceDto[]>(`/customers/${id}/special-prices`);
  setSpecialPrices = (id: string, prices: SpecialPriceDto[]) =>
    this.put<SpecialPriceDto[]>(`/customers/${id}/special-prices`, { prices });

  // Catalogue
  catalog = (kind: CatalogKind) => this.get<CatalogEntryDto[]>(`/${kind}`);
  createCatalog = (kind: CatalogKind, name: string) =>
    this.post<CatalogEntryDto>(`/${kind}`, { name });
  updateCatalog = (kind: CatalogKind, id: string, body: { name?: string; isActive?: boolean }) =>
    this.patch<CatalogEntryDto>(`/${kind}/${id}`, body);
  prices = (q: { itemTypeId?: string; serviceId?: string } = {}) =>
    this.get<PriceDto[]>('/prices', q);
  setPrice = (body: { itemTypeId: string; serviceId: string; amountXaf: number }) =>
    this.post<PriceDto>('/prices', body);
  grid = (customerId?: string) => this.get<PriceGrid>('/pricing/grid', { customerId });

  // Paramètres du pressing
  settings = () => this.get<PressingSettingsDto>('/settings');
  updateSettings = (
    body: Partial<Omit<PressingSettingsDto, 'settings'>> & {
      settings?: Partial<PressingSettingsDto['settings']>;
    },
  ) => this.patch<PressingSettingsDto>('/settings', body);
  logoUploadToken = () => this.post<UploadToken>('/settings/logo');

  // Dépôts
  deposits = (q: {
    status?: DepositStatus | '';
    q?: string;
    late?: boolean;
    page?: number;
    customerId?: string;
  }) => this.get<Paginated<DepositListItem>>('/deposits', q);
  deposit = (id: string) => this.get<DepositDto>(`/deposits/${id}`);
  depositByNumber = (number: string) =>
    this.get<DepositDto>(`/deposits/by-number/${encodeURIComponent(number)}`);
  createDeposit = (body: CreateDepositRequest, idempotencyKey: string) =>
    this.post<DepositDto>(
      '/deposits',
      body,
      new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    );
  updateDeposit = (id: string, body: { dueDate?: string; notes?: string; discountXaf?: number }) =>
    this.patch<DepositDto>(`/deposits/${id}`, body);
  cancelDeposit = (id: string, reason: string) =>
    this.post<DepositDto>(`/deposits/${id}/cancel`, { reason });
  ticket = (id: string) => this.get<TicketData>(`/deposits/${id}/ticket`);
  labels = (id: string) => this.get<LabelData[]>(`/deposits/${id}/labels`);
  photoUploadToken = (depositId: string, itemId: string) =>
    this.post<UploadToken>(`/deposits/${depositId}/items/${itemId}/photos/upload-token`);
  attachPhoto = (depositId: string, itemId: string, url: string) =>
    this.post<DepositDto>(`/deposits/${depositId}/items/${itemId}/photos`, { url });

  // Validations
  approvals = (status?: ApprovalStatus) => this.get<ApprovalDto[]>('/approvals', { status });
  approve = (id: string, reason?: string) =>
    this.post<ApprovalDto>(`/approvals/${id}/approve`, { reason });
  reject = (id: string, reason?: string) =>
    this.post<ApprovalDto>(`/approvals/${id}/reject`, { reason });
}
