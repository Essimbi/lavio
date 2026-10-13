import type {
  ExpenseStatus,
  InventoryStatus,
  PaymentMethod,
  PurchaseOrderStatus,
  StockMovementType,
  TreasuryAccountType,
  UtilityType,
} from './enums.js';

/** Types d'API de la phase 4 (stock, achats, comptabilité de gestion, rapports). Montants en FCFA. */

export interface SupplierDto {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface StockItemDto {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  supplierId: string | null;
  supplierName: string | null;
  purchasePriceXaf: number;
  avgCostXaf: number;
  onHand: number;
  alertThreshold: number;
  minQty: number | null;
  maxQty: number | null;
  /** Stock au seuil d'alerte ou en dessous. */
  low: boolean;
  valueXaf: number;
  isActive: boolean;
}

export interface StockMovementDto {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  type: StockMovementType;
  quantity: number;
  unitCostXaf: number | null;
  reasonCode: string | null;
  note: string | null;
  purchaseOrderId: string | null;
  inventoryId: string | null;
  createdByName: string | null;
  occurredAt: string;
}

export interface CreateStockMovementRequest {
  itemId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  /** Positive pour IN et OUT ; signée pour un ajustement. */
  quantity: number;
  unitCostXaf?: number;
  reasonCode?: string;
  note?: string;
  /** Dérogation de la responsable : sortie rendant le stock négatif (motif obligatoire). */
  allowNegative?: boolean;
}

export interface StockMovementResult {
  /** `applied` : mouvement enregistré ; `approval` : ajustement soumis à la responsable. */
  outcome: 'applied' | 'approval';
  movement: StockMovementDto | null;
  approvalId: string | null;
}

export interface PurchaseOrderLineDto {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCostXaf: number;
  totalXaf: number;
}

export interface PurchaseOrderDto {
  id: string;
  number: number;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  orderedAt: string | null;
  expectedAt: string | null;
  notes: string | null;
  totalXaf: number;
  lines: PurchaseOrderLineDto[];
  createdAt: string;
}

export interface InventoryLineDto {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  systemQty: number;
  countedQty: number | null;
  varianceQty: number | null;
  varianceXaf: number | null;
}

export interface InventoryDto {
  id: string;
  status: InventoryStatus;
  countedAt: string | null;
  note: string | null;
  createdByName: string | null;
  validatedAt: string | null;
  approvalId: string | null;
  lines: InventoryLineDto[];
  createdAt: string;
}

export interface TreasuryAccountDto {
  id: string;
  name: string;
  type: TreasuryAccountType;
  openingBalanceXaf: number;
  paymentMethods: PaymentMethod[];
  balanceXaf: number;
  isActive: boolean;
}

export interface AccountTransferDto {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amountXaf: number;
  at: string;
  note: string | null;
}

export interface ExpenseCategoryDto {
  id: string;
  name: string;
  systemKey: string | null;
  isActive: boolean;
}

export interface ExpenseDto {
  id: string;
  categoryId: string;
  categoryName: string;
  amountXaf: number;
  paidAt: string;
  method: PaymentMethod;
  accountId: string;
  accountName: string;
  supplierId: string | null;
  supplierName: string | null;
  description: string | null;
  receiptUrl: string | null;
  recurringId: string | null;
  supplierInvoiceId: string | null;
  status: ExpenseStatus;
  approvalId: string | null;
  cancelReason: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CreateExpenseRequest {
  categoryId: string;
  amountXaf: number;
  /** Compte payeur ; par défaut le compte « Caisse » (espèces, caisse ouverte exigée). */
  accountId?: string;
  method?: PaymentMethod;
  paidAt?: string;
  supplierId?: string;
  description?: string;
  receiptUrl?: string;
}

export interface RecurringExpenseDto {
  id: string;
  categoryId: string;
  categoryName: string;
  label: string;
  amountXaf: number;
  dayOfMonth: number;
  accountId: string;
  accountName: string;
  nextDueOn: string;
  isActive: boolean;
}

export interface SupplierInvoiceDto {
  id: string;
  supplierId: string;
  supplierName: string;
  number: string;
  amountXaf: number;
  issuedOn: string;
  dueOn: string | null;
  paidAt: string | null;
  purchaseOrderId: string | null;
  overdue: boolean;
  expenseId: string | null;
}

export interface UtilityReadingDto {
  id: string;
  type: UtilityType;
  readingDate: string;
  value: number;
  /** Consommation depuis le relevé précédent du même compteur. */
  consumption: number | null;
  note: string | null;
}

// --- Rapports -----------------------------------------------------------------

export const ReportKey = Object.freeze({
  revenue: 'revenue',
  'cash-journal': 'cash-journal',
  treasury: 'treasury',
  'profit-simple': 'profit-simple',
  receivables: 'receivables',
  'stock-valuation': 'stock-valuation',
} as const);
export type ReportKey = keyof typeof ReportKey;

export type ReportCell = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'date' | 'datetime' | 'xaf' | 'qty';
}

export interface ReportTable {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, ReportCell>[];
  /** Ligne de total (mêmes clés que les colonnes). */
  totals: Record<string, ReportCell> | null;
}

/**
 * Rapport générique : l'écran, le CSV et le XLSX sont produits à partir de cette même
 * structure, ce qui garantit des exports identiques aux chiffres affichés (docs/05).
 */
export interface Report {
  key: ReportKey;
  title: string;
  /** Période en dates locales `AAAA-MM-JJ` (bornes incluses) ; `null` pour une photo à date. */
  from: string | null;
  to: string | null;
  summary: { label: string; valueXaf: number }[];
  tables: ReportTable[];
}

export const REPORT_TITLES: Readonly<Record<ReportKey, string>> = Object.freeze({
  revenue: 'Chiffre d’affaires et encaissements',
  'cash-journal': 'Journal de caisse',
  treasury: 'Trésorerie',
  'profit-simple': 'Résultat simplifié',
  receivables: 'Créances et dettes',
  'stock-valuation': 'Valorisation du stock',
});
