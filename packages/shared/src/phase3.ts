import type {
  ApprovalType,
  CashSessionStatus,
  IncidentResolution,
  IncidentType,
  ItemStatus,
  NotificationType,
  PaymentKind,
  PaymentMethod,
} from './enums.js';

/** Types d'API de la phase 3 (suivi, restitution, paiements, caisse, notifications). Montants en FCFA. */

export interface ItemStatusChange {
  status: ItemStatus;
  storageLocation?: string;
  qualityChecklist?: Record<string, boolean>;
  /** Reprise (retour en arrière) : cause et/ou motif obligatoires. */
  reworkCauseId?: string;
  reason?: string;
}

export interface ReworkCauseDto {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
}

export interface IncidentDto {
  id: string;
  depositId: string;
  ticketNumber: string;
  itemId: string;
  labelCode: string;
  type: IncidentType;
  causeId: string | null;
  causeLabel: string | null;
  description: string | null;
  resolution: IncidentResolution;
  resolvedAt: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  depositId: string | null;
  ticketNumber: string | null;
  customerId: string;
  customerName: string;
  amountXaf: number;
  /** Effet sur le payé : +montant ou −montant (remboursement, annulation). */
  signedAmountXaf: number;
  method: PaymentMethod;
  kind: PaymentKind;
  operatorRef: string | null;
  payerPhone: string | null;
  receivedAt: string;
  cashSessionId: string | null;
  duplicateConfirmed: boolean;
  reversalOf: string | null;
  /** Ce paiement a été annulé par une écriture inverse. */
  reversed: boolean;
  reversalReason: string | null;
  reconciledAt: string | null;
  createdByName: string | null;
}

export interface CreatePaymentRequest {
  depositId: string;
  amountXaf: number;
  method: PaymentMethod;
  kind: PaymentKind;
  operatorRef?: string;
  payerPhone?: string;
  confirmDuplicate?: boolean;
}

export interface CashSessionDto {
  id: string;
  status: CashSessionStatus;
  openedAt: string;
  openedByName: string | null;
  openingFloatXaf: number;
  expectedCashXaf: number;
  closedAt: string | null;
  closedByName: string | null;
  countedCashXaf: number | null;
  varianceXaf: number | null;
  note: string | null;
  approvalId: string | null;
}

export interface CashJournal {
  session: CashSessionDto;
  movements: {
    at: string;
    label: string;
    ticketNumber: string | null;
    signedAmountXaf: number;
    userName: string | null;
  }[];
  cashInXaf: number;
  cashOutXaf: number;
  /** Encaissements hors espèces de la session (pour information, hors comptage). */
  otherMethodsXaf: Partial<Record<PaymentMethod, number>>;
}

export interface ReceivableDto {
  customerId: string;
  customerName: string;
  customerPhone: string;
  creditLimitXaf: number | null;
  totalXaf: number;
  deposits: {
    id: string;
    ticketNumber: string;
    balanceXaf: number;
    receivedAt: string;
    status: string;
  }[];
}

export interface ReceiptData {
  tenant: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    niu: string | null;
    logoUrl: string | null;
  };
  ticketNumber: string;
  customer: { name: string; phone: string };
  totalXaf: number;
  paidXaf: number;
  balanceXaf: number;
  payments: {
    receivedAt: string;
    method: PaymentMethod;
    kind: PaymentKind;
    signedAmountXaf: number;
    operatorRef: string | null;
  }[];
  returnedItems: { labelCode: string; label: string }[];
  vat: { ratePercent: number; amountXaf: number } | null;
  printedAt: string;
}

export interface ReturnResult {
  /** `executed` : articles restitués ; `approval` : vente à crédit soumise à la responsable. */
  outcome: 'executed' | 'approval';
  approvalId: string | null;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Lien interne à ouvrir (validation, dépôt, caisse…). */
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSummary {
  unread: number;
  pendingApprovals: number;
}

export const APPROVAL_TYPE_LABELS: Readonly<Record<ApprovalType, string>> = Object.freeze({
  DISCOUNT: 'Remise exceptionnelle',
  CREDIT: 'Vente à crédit',
  STOCK_ADJUSTMENT: 'Ajustement de stock',
  INVENTORY: 'Inventaire',
  CASH_CLOSE: 'Clôture de caisse',
  EXPENSE: 'Dépense importante',
});
