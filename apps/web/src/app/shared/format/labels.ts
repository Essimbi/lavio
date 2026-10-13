import { Pipe, type PipeTransform } from '@angular/core';
import type {
  CashSessionStatus,
  ExpenseStatus,
  InventoryStatus,
  PurchaseOrderStatus,
  StockMovementType,
  TreasuryAccountType,
  UtilityType,
  IncidentResolution,
  IncidentType,
  PaymentKind,
  PaymentMethod,
} from '@lavio/shared';

/** Libellés français des énumérations de la phase 3 (paiements, caisse, incidents). */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  BANK_TRANSFER: 'Virement',
  CHEQUE: 'Chèque',
};

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  ADVANCE: 'Acompte',
  BALANCE: 'Solde',
  CREDIT_SETTLEMENT: 'Règlement de créance',
  REFUND: 'Remboursement',
};

export const CASH_STATUS_LABELS: Record<CashSessionStatus, string> = {
  OPEN: 'Ouverte',
  CLOSING_PENDING: 'Clôture à valider',
  CLOSED: 'Clôturée',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  DAMAGE: 'Dommage',
  STAIN_REMAINS: 'Tache persistante',
  LOST: 'Article perdu',
  FOUND: 'Article retrouvé',
  REWORK: 'Reprise',
};

export const INCIDENT_RESOLUTION_LABELS: Record<IncidentResolution, string> = {
  NONE: 'Non résolu',
  REWORK_FREE: 'Reprise gratuite',
  COMMERCIAL_GESTURE: 'Geste commercial',
  COMPENSATION: 'Dédommagement',
};

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  IN: 'Entrée',
  OUT: 'Sortie',
  ADJUSTMENT: 'Ajustement',
  INVENTORY: 'Inventaire',
};

export const ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PARTIAL: 'Reçue en partie',
  RECEIVED: 'Reçue',
  CLOSED: 'Clôturée',
};

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  DRAFT: 'En cours de comptage',
  PENDING_APPROVAL: 'À valider',
  VALIDATED: 'Validé',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  DRAFT: 'À confirmer',
  PENDING_APPROVAL: 'À valider',
  RECORDED: 'Enregistrée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

export const ACCOUNT_TYPE_LABELS: Record<TreasuryAccountType, string> = {
  CASH: 'Caisse',
  BANK: 'Banque',
  MOBILE_MONEY: 'Mobile Money',
};

export const UTILITY_TYPE_LABELS: Record<UtilityType, string> = {
  WATER: 'Eau',
  ELECTRICITY: 'Électricité',
};

/** Quantité au format français (jusqu'à 3 décimales). */
export const formatQty = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);

/** Téléchargement d'un fichier reçu de l'API (CSV, PDF). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

@Pipe({ name: 'qty' })
export class QtyPipe implements PipeTransform {
  transform = formatQty;
}
