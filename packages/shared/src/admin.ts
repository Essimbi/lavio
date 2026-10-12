import type {
  LeadStatus,
  LicenseEventType,
  LicenseStatus,
  PlatformRole,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  TenantRole,
  TenantStatus,
} from './enums.js';

/** Types des réponses de l'API superadmin (docs/06). Montants en FCFA entiers. */

export interface PlanDto {
  id: string;
  code: string;
  name: string;
  priceMonthlyXaf: number | null;
  priceYearlyXaf: number | null;
  includedUsers: number;
  extraUserPriceXaf: number | null;
  trialDays: number;
  features: Record<string, boolean>;
  isActive: boolean;
}

export interface LicenseDto {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  key: string;
  /** Statut effectif (tient compte des dates, même avant le passage du cron). */
  status: LicenseStatus;
  startsAt: string;
  endsAt: string;
  graceDays: number;
  graceEndsAt: string;
  maxUsers: number | null;
  notes: string | null;
  createdAt: string;
}

export interface LicenseEventDto {
  id: string;
  type: LicenseEventType;
  payload: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  city: string | null;
  phone: string | null;
  license: Pick<LicenseDto, 'id' | 'status' | 'endsAt' | 'planName'> | null;
  createdAt: string;
}

export interface TenantUserDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  tenantRoles: TenantRole[];
  isActive: boolean;
  /** Invitation envoyée mais mot de passe pas encore défini. */
  pendingInvitation: boolean;
  lastLoginAt: string | null;
}

export interface TenantDetail extends Omit<TenantListItem, 'license'> {
  address: string | null;
  niu: string | null;
  rccm: string | null;
  users: TenantUserDto[];
  licenses: LicenseDto[];
  payments: SubscriptionPaymentDto[];
  lastActivityAt: string | null;
}

export interface SubscriptionPaymentDto {
  id: string;
  tenantId: string;
  tenantName: string;
  licenseId: string;
  licenseKey: string;
  amountXaf: number;
  method: SubscriptionPaymentMethod;
  reference: string | null;
  receivedAt: string;
  periodStart: string;
  periodEnd: string;
  deductionsXaf: number;
  deductionNote: string | null;
  status: SubscriptionPaymentStatus;
  createdAt: string;
}

export interface LeadDto {
  id: string;
  name: string;
  pressingName: string;
  phone: string;
  city: string | null;
  message: string | null;
  status: LeadStatus;
  notes: string | null;
  source: string;
  contactedAt: string | null;
  createdAt: string;
  whatsappUrl: string;
}

export interface PlatformUserDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  platformRole: PlatformRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AuditLogDto {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  at: string;
}

/** Relevé mensuel de partage des revenus (docs/06). */
export interface StatementRow {
  tenantId: string;
  tenantName: string;
  planNames: string[];
  periodStart: string;
  periodEnd: string;
  collectedXaf: number;
  deductionsXaf: number;
  shareableXaf: number;
}

export interface Statement {
  month: string;
  shareRatePercent: number;
  rows: StatementRow[];
  totals: {
    collectedXaf: number;
    deductionsXaf: number;
    shareableXaf: number;
    designerShareXaf: number;
    operatorShareXaf: number;
  };
}

export interface AdminDashboard {
  activeTenants: number;
  licensesExpiringSoon: number;
  licensesInGrace: number;
  newLeads: number;
  month: string;
  monthCollectedXaf: number;
  designerShareXaf: number;
  operatorShareXaf: number;
}

export interface PlatformSettingsDto {
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  whatsappInvitationMessage: string;
  whatsappRenewalMessage: string;
  whatsappExtraUsersMessage: string;
  shareRatePercent: number;
  defaultTrialDays: number;
  defaultGraceDays: number;
}
