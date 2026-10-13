import type { TourStatus, TourType } from './enums.js';

/** Types d'API de la phase 5 (tournées, tableau de bord). Montants en FCFA. */

export interface TourRequestDto {
  id: string;
  type: TourType;
  status: TourStatus;
  tourDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  depositId: string | null;
  ticketNumber: string | null;
  /** Montant à encaisser : reste à payer actuel du dépôt lié, sinon montant saisi. */
  amountToCollectXaf: number;
  itemCount: number | null;
  notes: string | null;
  offDayOverride: boolean;
  cancelReason: string | null;
  createdAt: string;
}

export interface CreateTourRequest {
  type: TourType;
  customerId: string;
  tourDate: string;
  address?: string;
  depositId?: string;
  amountToCollectXaf?: number;
  notes?: string;
  /** Responsable seulement : accepter une date hors jour de tournée. */
  allowOffDay?: boolean;
}

export interface TourDayList {
  date: string;
  isTourDay: boolean;
  tourDays: number[];
  nextTourDates: string[];
  requests: TourRequestDto[];
  totalToCollectXaf: number;
}

export interface DashboardDto {
  period: { key: string; from: string; to: string };
  deposits: {
    /** Reçus pendant la période. */
    received: number;
    /** État actuel. */
    inProgress: number;
    ready: number;
    late: number;
    /** Terminés pendant la période (dernier article retiré). */
    returned: number;
  };
  revenueXaf: number;
  collectionsXaf: number;
  expensesXaf: number;
  receivablesXaf: number;
  /** Caisse ouverte : espèces attendues ; `null` si la caisse est fermée. */
  cash: { status: string; expectedCashXaf: number; openedAt: string } | null;
  lowStockItems: number;
  pendingApprovals: number;
  /** Tournée du jour (demandes ouvertes). */
  toursToday: number;
}
