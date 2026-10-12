/**
 * Énumérations métier (docs/03-modele-de-donnees.md).
 * Les valeurs doivent rester identiques aux enums Prisma (vérifié par un test côté API).
 */

const values = <T extends string>(...v: T[]) =>
  Object.freeze(Object.fromEntries(v.map((k) => [k, k]))) as { readonly [K in T]: K };

export const TenantStatus = values('ACTIVE', 'SUSPENDED', 'CLOSED');
export type TenantStatus = keyof typeof TenantStatus;

export const LicenseStatus = values('TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'EXPIRED', 'REVOKED');
export type LicenseStatus = keyof typeof LicenseStatus;

export const LicenseEventType = values(
  'CREATED',
  'RENEWED',
  'PLAN_CHANGED',
  'SUSPENDED',
  'REACTIVATED',
  'REVOKED',
  'EXPIRED',
  'GRACE_STARTED',
);
export type LicenseEventType = keyof typeof LicenseEventType;

export const PlatformRole = values('SUPER_ADMIN', 'PARTNER_VIEWER');
export type PlatformRole = keyof typeof PlatformRole;

export const TenantRole = values(
  'OWNER',
  'CASHIER',
  'OPERATOR',
  'STOCK_KEEPER',
  'ACCOUNTANT',
  'QUALITY',
  'DRIVER',
);
export type TenantRole = keyof typeof TenantRole;

export const DepositStatus = values(
  'DRAFT',
  'PENDING_APPROVAL',
  'OPEN',
  'READY',
  'PARTIALLY_RETURNED',
  'COMPLETED',
  'CANCELLED',
);
export type DepositStatus = keyof typeof DepositStatus;

export const ItemStatus = values(
  'RECEIVED',
  'IN_PROGRESS',
  'IRONING',
  'QUALITY_CHECK',
  'READY',
  'RETURNED',
);
export type ItemStatus = keyof typeof ItemStatus;

export const PaymentMethod = values('CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'CHEQUE');
export type PaymentMethod = keyof typeof PaymentMethod;

/** Modes acceptés pour un paiement d'abonnement (docs/06). */
export const SubscriptionPaymentMethod = values(
  'CASH',
  'ORANGE_MONEY',
  'MTN_MOMO',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
);
export type SubscriptionPaymentMethod = keyof typeof SubscriptionPaymentMethod;

export const SubscriptionPaymentStatus = values('RECORDED', 'REFUNDED');
export type SubscriptionPaymentStatus = keyof typeof SubscriptionPaymentStatus;

export const PaymentKind = values('ADVANCE', 'BALANCE', 'CREDIT_SETTLEMENT', 'REFUND');
export type PaymentKind = keyof typeof PaymentKind;

export const CashSessionStatus = values('OPEN', 'CLOSING_PENDING', 'CLOSED');
export type CashSessionStatus = keyof typeof CashSessionStatus;

export const StockMovementType = values('IN', 'OUT', 'ADJUSTMENT', 'INVENTORY');
export type StockMovementType = keyof typeof StockMovementType;

export const PurchaseOrderStatus = values('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CLOSED');
export type PurchaseOrderStatus = keyof typeof PurchaseOrderStatus;

export const TourType = values('PICKUP', 'DELIVERY');
export type TourType = keyof typeof TourType;

export const TourStatus = values('TO_COLLECT', 'COLLECTED', 'TO_DELIVER', 'DELIVERED', 'CANCELLED');
export type TourStatus = keyof typeof TourStatus;

export const IncidentType = values('DAMAGE', 'STAIN_REMAINS', 'LOST', 'FOUND', 'REWORK');
export type IncidentType = keyof typeof IncidentType;

export const IncidentResolution = values(
  'NONE',
  'REWORK_FREE',
  'COMMERCIAL_GESTURE',
  'COMPENSATION',
);
export type IncidentResolution = keyof typeof IncidentResolution;

export const ApprovalType = values(
  'DISCOUNT',
  'STOCK_ADJUSTMENT',
  'INVENTORY',
  'CASH_CLOSE',
  'EXPENSE',
  'CREDIT',
);
export type ApprovalType = keyof typeof ApprovalType;

export const ApprovalStatus = values('PENDING', 'APPROVED', 'REJECTED');
export type ApprovalStatus = keyof typeof ApprovalStatus;

export const LeadStatus = values('NEW', 'CONTACTED', 'CONVERTED', 'REJECTED');
export type LeadStatus = keyof typeof LeadStatus;

export const CustomerType = values('INDIVIDUAL', 'COMPANY');
export type CustomerType = keyof typeof CustomerType;

export const TreasuryAccountType = values('CASH', 'BANK', 'MOBILE_MONEY');
export type TreasuryAccountType = keyof typeof TreasuryAccountType;

export const UtilityType = values('WATER', 'ELECTRICITY');
export type UtilityType = keyof typeof UtilityType;

export const InventoryStatus = values('DRAFT', 'VALIDATED');
export type InventoryStatus = keyof typeof InventoryStatus;

export const StockReasonCode = values('CONSUMPTION', 'LOSS', 'BREAKAGE', 'EXPIRED', 'OTHER');
export type StockReasonCode = keyof typeof StockReasonCode;

export const NotificationType = values(
  'STOCK_LOW',
  'CASH_CLOSED',
  'CASH_VARIANCE',
  'DEPOSIT_LATE',
  'UNPAID_HIGH',
  'APPROVAL_REQUESTED',
  'LICENSE_EXPIRING',
);
export type NotificationType = keyof typeof NotificationType;
