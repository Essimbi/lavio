import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ApprovalDto,
  ApprovalStatus,
  CashJournal,
  CashSessionDto,
  CatalogEntryDto,
  CreatePaymentRequest,
  CreateDepositRequest,
  CustomerDto,
  CustomerPreferences,
  CustomerType,
  DepositDto,
  DepositListItem,
  DepositStatus,
  IncidentDto,
  IncidentResolution,
  IncidentType,
  ItemStatusChange,
  LabelData,
  NotificationDto,
  NotificationSummary,
  Paginated,
  PaymentDto,
  PaymentMethod,
  PressingSettingsDto,
  PriceDto,
  PriceGrid,
  ReceiptData,
  ReceivableDto,
  ReturnResult,
  ReworkCauseDto,
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

export interface PaymentFilters {
  method?: PaymentMethod | '';
  mobileMoney?: boolean;
  reconciled?: boolean;
  depositId?: string;
  from?: string;
  to?: string;
  page?: number;
}

/** Appels de l'application du pressing (clients, catalogue, dépôts, suivi, paiements, caisse). */
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
  private blob(path: string, q: Query = {}) {
    return firstValueFrom(
      this.http.get(`${API_BASE}${path}`, { params: params(q), responseType: 'blob' }),
    );
  }

  // Clients
  customers = (q: Query) => this.get<Paginated<CustomerDto>>('/customers', q);
  customer = (id: string) => this.get<CustomerDto>(`/customers/${id}`);
  createCustomer = (body: CustomerInput) => this.post<CustomerDto>('/customers', body);
  updateCustomer = (id: string, body: Partial<CustomerInput>) =>
    this.patch<CustomerDto>(`/customers/${id}`, body);
  customerHistory = (id: string, page = 1) =>
    this.get<Paginated<DepositListItem>>(`/customers/${id}/history`, { page });
  exportCustomer = (id: string) => this.blob(`/customers/${id}/export`);
  anonymizeCustomer = (id: string, reason: string) =>
    this.post<null>(`/customers/${id}/anonymize`, { reason });
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
    /** Date de retrait prévue, bornes incluses (AAAA-MM-JJ). */
    dueFrom?: string;
    dueTo?: string;
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
  cancelDeposit = (
    id: string,
    body: { reason: string; refundMethod?: PaymentMethod; refundRef?: string },
  ) => this.post<DepositDto>(`/deposits/${id}/cancel`, body);
  ticket = (id: string) => this.get<TicketData>(`/deposits/${id}/ticket`);
  labels = (id: string) => this.get<LabelData[]>(`/deposits/${id}/labels`);
  photoUploadToken = (depositId: string, itemId: string) =>
    this.post<UploadToken>(`/deposits/${depositId}/items/${itemId}/photos/upload-token`);
  attachPhoto = (depositId: string, itemId: string, url: string) =>
    this.post<DepositDto>(`/deposits/${depositId}/items/${itemId}/photos`, { url });

  // Suivi des articles et restitution
  changeItemsStatus = (depositId: string, itemIds: string[], change: ItemStatusChange) =>
    this.post<DepositDto>(`/deposits/${depositId}/items/status`, { itemIds, ...change });
  returnItems = (depositId: string, itemIds: string[]) =>
    this.post<ReturnResult>(`/deposits/${depositId}/returns`, { itemIds });
  incidents = (q: { depositId?: string; open?: boolean } = {}) =>
    this.get<IncidentDto[]>('/incidents', q);
  createIncident = (body: {
    depositItemId: string;
    type: IncidentType;
    causeId?: string;
    description?: string;
  }) => this.post<IncidentDto>('/incidents', body);
  updateIncident = (id: string, body: { resolution?: IncidentResolution; description?: string }) =>
    this.patch<IncidentDto>(`/incidents/${id}`, body);
  reworkCauses = () => this.get<ReworkCauseDto[]>('/rework-causes');
  createReworkCause = (body: { code: string; label: string }) =>
    this.post<ReworkCauseDto>('/rework-causes', body);
  updateReworkCause = (id: string, body: { label?: string; isActive?: boolean }) =>
    this.patch<ReworkCauseDto>(`/rework-causes/${id}`, body);

  // Paiements et créances
  createPayment = (body: CreatePaymentRequest, idempotencyKey: string) =>
    this.post<PaymentDto>(
      '/payments',
      body,
      new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    );
  payments = (q: PaymentFilters) => this.get<Paginated<PaymentDto>>('/payments', { ...q });
  reversePayment = (id: string, reason: string) =>
    this.post<PaymentDto>(`/payments/${id}/reverse`, { reason });
  reconcilePayment = (id: string, reconciled: boolean) =>
    this.post<PaymentDto>(`/payments/${id}/reconcile`, { reconciled });
  exportMobileMoney = (q: PaymentFilters) => this.blob('/payments/mobile-money/export', { ...q });
  receivables = () => this.get<ReceivableDto[]>('/receivables');
  receipt = (depositId: string) => this.get<ReceiptData>(`/deposits/${depositId}/receipt`);
  invoicePdf = (depositId: string) => this.blob(`/deposits/${depositId}/invoice.pdf`);

  // Caisse
  currentCash = () => this.get<CashSessionDto | null>('/cash-sessions/current');
  cashSessions = (page = 1) => this.get<Paginated<CashSessionDto>>('/cash-sessions', { page });
  openCash = (openingFloatXaf: number) =>
    this.post<CashSessionDto>('/cash-sessions/open', { openingFloatXaf });
  closeCash = (id: string, countedCash: number, note?: string) =>
    this.post<CashSessionDto>(`/cash-sessions/${id}/close`, { countedCash, note });
  cashJournal = (id: string) => this.get<CashJournal>(`/cash-sessions/${id}/journal`);

  // Notifications
  notifications = (q: { unread?: boolean; page?: number } = {}) =>
    this.get<Paginated<NotificationDto>>('/notifications', q);
  notificationSummary = () => this.get<NotificationSummary>('/notifications/summary');
  readNotification = (id: string) => this.post<null>(`/notifications/${id}/read`);
  readAllNotifications = () => this.post<null>('/notifications/read-all');

  // Validations
  approvals = (status?: ApprovalStatus) => this.get<ApprovalDto[]>('/approvals', { status });
  approve = (id: string, reason?: string) =>
    this.post<ApprovalDto>(`/approvals/${id}/approve`, { reason });
  reject = (id: string, reason?: string) =>
    this.post<ApprovalDto>(`/approvals/${id}/reject`, { reason });
}
