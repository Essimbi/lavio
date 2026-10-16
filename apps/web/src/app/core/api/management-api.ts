import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AccountTransferDto,
  CreateTourRequest,
  DashboardDto,
  DashboardPeriod,
  TourDayList,
  TourRequestDto,
  TourStatus,
  CreateExpenseRequest,
  CreateStockMovementRequest,
  ExpenseCategoryDto,
  ExpenseDto,
  ExpenseStatus,
  InventoryDto,
  Paginated,
  PaymentMethod,
  PurchaseOrderDto,
  PurchaseOrderStatus,
  RecurringExpenseDto,
  Report,
  ReportKey,
  StockItemDto,
  StockMovementDto,
  StockMovementResult,
  SupplierDto,
  SupplierInvoiceDto,
  TreasuryAccountDto,
  TreasuryAccountType,
  UtilityReadingDto,
  UtilityType,
  UploadToken,
} from '@lavio/shared';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from '../http/api';

type Query = Record<string, string | number | boolean | undefined | null>;
const params = (q: Query) =>
  Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Record<string, string | number | boolean>;

export interface StockItemInput {
  name: string;
  category?: string | null;
  unit: string;
  supplierId?: string | null;
  purchasePriceXaf?: number;
  alertThreshold?: number;
  minQty?: number | null;
  maxQty?: number | null;
  isActive?: boolean;
}

export interface SupplierInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface OrderLineInput {
  itemId: string;
  qtyOrdered: number;
  unitCostXaf: number;
}

/** Appels de gestion : stock, achats, comptabilité, rapports, tableau de bord, tournées, push. */
@Injectable({ providedIn: 'root' })
export class ManagementApi {
  private readonly http = inject(HttpClient);

  private get<T>(path: string, q: Query = {}) {
    return firstValueFrom(this.http.get<T>(`${API_BASE}${path}`, { params: params(q) }));
  }
  private post<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.post<T>(`${API_BASE}${path}`, body));
  }
  private patch<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.patch<T>(`${API_BASE}${path}`, body));
  }

  // Stock
  stockItems = (
    q: {
      q?: string;
      low?: boolean;
      includeInactive?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) => this.get<Paginated<StockItemDto>>('/stock/items', q);
  stockItem = (id: string) => this.get<StockItemDto>(`/stock/items/${id}`);
  createStockItem = (body: StockItemInput) => this.post<StockItemDto>('/stock/items', body);
  updateStockItem = (id: string, body: Partial<StockItemInput>) =>
    this.patch<StockItemDto>(`/stock/items/${id}`, body);
  itemMovements = (id: string, page = 1) =>
    this.get<Paginated<StockMovementDto>>(`/stock/items/${id}/movements`, { page });
  movements = (page = 1) => this.get<Paginated<StockMovementDto>>('/stock/movements', { page });
  move = (body: CreateStockMovementRequest) =>
    this.post<StockMovementResult>('/stock/movements', body);
  stockAlerts = () => this.get<StockItemDto[]>('/stock/alerts');

  // Inventaires
  inventories = () => this.get<InventoryDto[]>('/inventories');
  inventory = (id: string) => this.get<InventoryDto>(`/inventories/${id}`);
  createInventory = (note?: string) => this.post<InventoryDto>('/inventories', { note });
  setInventoryLines = (id: string, lines: { itemId: string; countedQty: number | null }[]) =>
    this.patch<InventoryDto>(`/inventories/${id}/lines`, { lines });
  submitInventory = (id: string) => this.post<InventoryDto>(`/inventories/${id}/submit`);

  // Achats
  suppliers = (includeInactive = false) =>
    this.get<SupplierDto[]>('/suppliers', { includeInactive: includeInactive || undefined });
  createSupplier = (body: SupplierInput) => this.post<SupplierDto>('/suppliers', body);
  updateSupplier = (id: string, body: Partial<SupplierInput>) =>
    this.patch<SupplierDto>(`/suppliers/${id}`, body);
  orders = (q: { status?: PurchaseOrderStatus | ''; supplierId?: string; page?: number } = {}) =>
    this.get<Paginated<PurchaseOrderDto>>('/purchase-orders', q);
  order = (id: string) => this.get<PurchaseOrderDto>(`/purchase-orders/${id}`);
  createOrder = (body: {
    supplierId: string;
    expectedAt?: string;
    notes?: string;
    lines: OrderLineInput[];
  }) => this.post<PurchaseOrderDto>('/purchase-orders', body);
  updateOrder = (
    id: string,
    body: {
      status?: 'SENT' | 'CLOSED';
      expectedAt?: string | null;
      notes?: string | null;
      lines?: OrderLineInput[];
    },
  ) => this.patch<PurchaseOrderDto>(`/purchase-orders/${id}`, body);
  receiveOrder = (id: string, lines: { lineId: string; qty: number; unitCostXaf?: number }[]) =>
    this.post<PurchaseOrderDto>(`/purchase-orders/${id}/receive`, { lines });

  // Trésorerie
  accounts = () => this.get<TreasuryAccountDto[]>('/treasury/accounts');
  createAccount = (body: {
    name: string;
    type: TreasuryAccountType;
    openingBalanceXaf?: number;
    paymentMethods?: PaymentMethod[];
  }) => this.post<TreasuryAccountDto>('/treasury/accounts', body);
  updateAccount = (
    id: string,
    body: { name?: string; paymentMethods?: PaymentMethod[]; isActive?: boolean },
  ) => this.patch<TreasuryAccountDto>(`/treasury/accounts/${id}`, body);
  transfers = () => this.get<AccountTransferDto[]>('/treasury/transfers');
  transfer = (body: {
    fromAccountId: string;
    toAccountId: string;
    amountXaf: number;
    note?: string;
  }) => this.post<AccountTransferDto>('/treasury/transfers', body);

  // Dépenses
  categories = () => this.get<ExpenseCategoryDto[]>('/expense-categories');
  createCategory = (name: string) => this.post<ExpenseCategoryDto>('/expense-categories', { name });
  updateCategory = (id: string, body: { name?: string; isActive?: boolean }) =>
    this.patch<ExpenseCategoryDto>(`/expense-categories/${id}`, body);
  expenses = (q: {
    status?: ExpenseStatus | '';
    categoryId?: string;
    accountId?: string;
    from?: string;
    to?: string;
    page?: number;
  }) => this.get<Paginated<ExpenseDto>>('/expenses', q);
  createExpense = (body: CreateExpenseRequest) => this.post<ExpenseDto>('/expenses', body);
  /** Justificatif : jeton d'envoi direct vers Vercel Blob, puis rattachement à une dépense. */
  receiptUploadToken = () => this.post<UploadToken>('/expenses/receipts/upload-token');
  attachReceipt = (id: string, url: string) =>
    this.post<ExpenseDto>(`/expenses/${id}/receipt`, { url });
  confirmExpense = (id: string, body: { amountXaf?: number; accountId?: string } = {}) =>
    this.post<ExpenseDto>(`/expenses/${id}/confirm`, body);
  cancelExpense = (id: string, reason: string) =>
    this.post<ExpenseDto>(`/expenses/${id}/cancel`, { reason });
  recurring = () => this.get<RecurringExpenseDto[]>('/recurring-expenses');
  createRecurring = (body: {
    categoryId: string;
    label: string;
    amountXaf: number;
    dayOfMonth: number;
    accountId: string;
  }) => this.post<RecurringExpenseDto>('/recurring-expenses', body);
  updateRecurring = (
    id: string,
    body: { label?: string; amountXaf?: number; isActive?: boolean },
  ) => this.patch<RecurringExpenseDto>(`/recurring-expenses/${id}`, body);

  // Factures fournisseurs et compteurs
  invoices = (q: { unpaid?: boolean; supplierId?: string; page?: number } = {}) =>
    this.get<Paginated<SupplierInvoiceDto>>('/supplier-invoices', q);
  createInvoice = (body: {
    supplierId: string;
    number: string;
    amountXaf: number;
    issuedOn: string;
    dueOn?: string;
    purchaseOrderId?: string;
  }) => this.post<SupplierInvoiceDto>('/supplier-invoices', body);
  payInvoice = (id: string, accountId?: string) =>
    this.post<SupplierInvoiceDto>(`/supplier-invoices/${id}/pay`, { accountId });
  readings = (type?: UtilityType) => this.get<UtilityReadingDto[]>('/utility-readings', { type });
  addReading = (body: { type: UtilityType; readingDate: string; value: number; note?: string }) =>
    this.post<UtilityReadingDto>('/utility-readings', body);

  // Tableau de bord
  dashboard = (period: DashboardPeriod, from?: string, to?: string) =>
    this.get<DashboardDto>('/reports/dashboard', { period, from, to });

  // Tournées
  tourDay = (date?: string) => this.get<TourDayList>('/tours/day', { date });
  tours = (q: { from?: string; to?: string; status?: TourStatus | ''; page?: number } = {}) =>
    this.get<Paginated<TourRequestDto>>('/tours', q);
  createTour = (body: CreateTourRequest) => this.post<TourRequestDto>('/tours', body);
  updateTour = (
    id: string,
    body: { tourDate?: string; address?: string; notes?: string | null; allowOffDay?: boolean },
  ) => this.patch<TourRequestDto>(`/tours/${id}`, body);
  tourStatus = (id: string, status: TourStatus, reason?: string) =>
    this.post<TourRequestDto>(`/tours/${id}/status`, { status, reason });

  // Notifications push
  pushConfig = () => this.get<{ enabled: boolean; publicKey: string | null }>('/push/config');
  pushSubscribe = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    this.post<null>('/push/subscribe', sub);

  // Rapports
  report = (key: ReportKey, from?: string, to?: string) =>
    this.get<Report>(`/reports/${key}`, { from, to });
  reportFile = (key: ReportKey, format: 'csv' | 'xlsx', from?: string, to?: string) =>
    firstValueFrom(
      this.http.get(`${API_BASE}/reports/${key}`, {
        params: params({ from, to, format }),
        responseType: 'blob',
      }),
    );
}
