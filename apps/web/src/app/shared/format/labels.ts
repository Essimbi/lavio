import type {
  CashSessionStatus,
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

/** Téléchargement d'un fichier reçu de l'API (CSV, PDF). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
