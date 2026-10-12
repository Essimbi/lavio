import type {
  ApprovalStatus,
  ApprovalType,
  CustomerType,
  DepositStatus,
  ItemStatus,
} from './enums.js';
import type { ReceptionChecklist } from './catalog.js';
import type { TenantSettings } from './settings.js';

/** Types d'API de la phase 2 (clients, catalogue, dépôts, validations). Montants en FCFA. */

export interface CustomerPreferences {
  noCover?: boolean;
  returnHangers?: boolean;
}

export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
  phone2: string | null;
  address: string | null;
  type: CustomerType;
  preferences: CustomerPreferences;
  notes: string | null;
  creditAllowed: boolean;
  creditLimitXaf: number | null;
  createdAt: string;
}

export interface CatalogEntryDto {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PriceDto {
  id: string;
  itemTypeId: string;
  serviceId: string;
  amountXaf: number;
  validFrom: string;
  validTo: string | null;
}

export interface SpecialPriceDto {
  itemTypeId: string;
  serviceId: string;
  amountXaf: number;
}

/** Grille tarifaire courante (écran de dépôt : total calculé en direct). */
export interface PriceGrid {
  itemTypes: CatalogEntryDto[];
  services: CatalogEntryDto[];
  /** Prix courant par couple `itemTypeId:serviceId`. */
  prices: Record<string, number>;
  settings: Pick<
    TenantSettings,
    | 'expressSurchargePercent'
    | 'discountApprovalPercent'
    | 'advanceRequiredAbove'
    | 'advanceMinPercent'
    | 'processingDays'
  >;
  tourDays: number[];
}

export interface DepositItemInput {
  itemTypeId: string;
  serviceId: string;
  quantity: number;
  color?: string;
  brand?: string;
  careSymbols?: string[];
  conditionNotes?: string;
  checklist?: ReceptionChecklist;
  weightKg?: number;
}

export interface CreateDepositRequest {
  customerId: string;
  items: DepositItemInput[];
  express?: boolean;
  discountXaf?: number;
  dueDate?: string;
  notes?: string;
  weightKg?: number;
}

export interface DepositItemDto {
  id: string;
  lineNo: number;
  labelCode: string;
  itemTypeId: string;
  itemTypeName: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  color: string | null;
  brand: string | null;
  unitPriceXaf: number;
  lineTotalXaf: number;
  careSymbols: string[];
  conditionNotes: string | null;
  checklist: ReceptionChecklist;
  status: ItemStatus;
  storageLocation: string | null;
  weightKg: number | null;
  photoUrls: string[];
}

export interface DepositDto {
  id: string;
  number: number;
  ticketNumber: string;
  status: DepositStatus;
  customer: Pick<CustomerDto, 'id' | 'name' | 'phone'>;
  receivedAt: string;
  dueDate: string;
  express: boolean;
  subtotalXaf: number;
  expressSurchargeXaf: number;
  discountXaf: number;
  totalXaf: number;
  paidXaf: number;
  balanceXaf: number;
  weightKg: number | null;
  notes: string | null;
  late: boolean;
  /** Ticket imprimable (validée, acompte suffisant). */
  printable: boolean;
  /** Raison si le ticket n'est pas imprimable. */
  blockedReason: string | null;
  approvalId: string | null;
  items: DepositItemDto[];
  createdAt: string;
}

export type DepositListItem = Omit<DepositDto, 'items'> & { itemCount: number };

export interface TicketData {
  tenant: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    logoUrl: string | null;
    footer: string | null;
  };
  ticketNumber: string;
  numberInWords: string;
  qrPayload: string;
  receivedAt: string;
  dueDate: string;
  customer: { name: string; phone: string };
  lines: { quantity: number; itemType: string; service: string; totalXaf: number }[];
  subtotalXaf: number;
  expressSurchargeXaf: number;
  discountXaf: number;
  totalXaf: number;
  paidXaf: number;
  balanceXaf: number;
}

export interface LabelData {
  labelCode: string;
  qrPayload: string;
  customerShortName: string;
  dueDate: string;
  itemType: string;
  service: string;
}

export interface ApprovalDto {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  requestedByName: string | null;
  decidedByName: string | null;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** Paramètres du pressing modifiables par la responsable (GET/PATCH /settings). */
export interface PressingSettingsDto {
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  niu: string | null;
  rccm: string | null;
  vatEnabled: boolean;
  vatRate: number | null;
  ticketPrefix: string | null;
  ticketFooter: string | null;
  logoUrl: string | null;
  tourDays: number[];
  settings: TenantSettings;
}

/** Jeton de téléversement direct vers Vercel Blob (docs/09). */
export interface UploadToken {
  clientToken: string;
  pathname: string;
  maxSizeBytes: number;
}
