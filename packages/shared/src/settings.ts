/**
 * Paramètres par défaut d'un pressing (`tenants.settings`), docs/03 et docs/14.
 * Ce sont des hypothèses configurables par la responsable, jamais des valeurs figées.
 */
export interface TenantSettings {
  /** Remise (en % du sous-total) au-delà de laquelle une validation est requise. */
  discountApprovalPercent: number;
  /** Total (FCFA) au-delà duquel un acompte est exigé ; `null` = règle désactivée. */
  advanceRequiredAbove: number | null;
  /** Acompte minimal en % du total quand la règle s'applique. */
  advanceMinPercent: number;
  /** Délai de traitement par défaut, en jours. */
  processingDays: number;
  /** Majoration express en % du sous-total. */
  expressSurchargePercent: number;
  /** Alerte « non retiré » : jours après READY. */
  lateAfterDays: number;
  /** Dépense (FCFA) au-delà de laquelle une validation est requise ; `null` = jamais. */
  largeExpenseAbove: number | null;
  /** Impayé (FCFA) au-delà duquel une alerte est envoyée ; `null` = jamais. */
  unpaidAlertAbove: number | null;
}

export const DEFAULT_TENANT_SETTINGS: Readonly<TenantSettings> = Object.freeze({
  discountApprovalPercent: 10,
  advanceRequiredAbove: null,
  advanceMinPercent: 50,
  processingDays: 2,
  expressSurchargePercent: 0,
  lateAfterDays: 30,
  largeExpenseAbove: null,
  unpaidAlertAbove: null,
});

/** Jours de tournée par défaut : mardi (2) et vendredi (5), 0 = dimanche. */
export const DEFAULT_TOUR_DAYS: readonly number[] = Object.freeze([2, 5]);

/** Clés de `platform_settings`. */
export const PlatformSettingKey = Object.freeze({
  whatsappNumber: 'whatsappNumber',
  whatsappDefaultMessage: 'whatsappDefaultMessage',
  shareRatePercent: 'shareRatePercent',
  defaultTrialDays: 'defaultTrialDays',
  defaultGraceDays: 'defaultGraceDays',
} as const);
export type PlatformSettingKey = keyof typeof PlatformSettingKey;

/** Fuseau d'affichage (stockage en UTC). */
export const DISPLAY_TIME_ZONE = 'Africa/Douala';
export const CURRENCY = 'XAF';
