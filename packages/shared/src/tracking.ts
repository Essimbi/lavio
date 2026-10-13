import type { ItemStatus, PaymentKind, TenantRole } from './enums.js';

/**
 * Suivi des articles (docs/05, « Articles et suivi ») : ordre des statuts, transitions
 * autorisées par rôle, contrôle qualité. « Retiré » ne s'obtient que par la restitution.
 */
export const ITEM_FLOW: readonly ItemStatus[] = Object.freeze([
  'RECEIVED',
  'IN_PROGRESS',
  'IRONING',
  'QUALITY_CHECK',
  'READY',
  'RETURNED',
]);

export const itemRank = (status: ItemStatus): number => ITEM_FLOW.indexOf(status);

export type TransitionCheck =
  | { ok: true; rework: boolean }
  | { ok: false; reason: 'SAME' | 'RETURNED' | 'USE_RETURN' | 'QUALITY_REQUIRED' | 'ROLE' };

/**
 * Transition d'un article :
 * - en avant jusqu'à « Contrôle qualité » (sauts permis, chaque étape est tracée) ;
 * - « Prêt » seulement depuis « Contrôle qualité » (check-list complète, vérifiée à part) ;
 * - en arrière = reprise (motif obligatoire, incident REWORK) ;
 * - droits (docs/05) : opérateur jusqu'à « Contrôle qualité », contrôle qualité vers « Prêt »
 *   et reprises, responsable tout.
 */
export function checkItemTransition(
  from: ItemStatus,
  to: ItemStatus,
  roles: readonly TenantRole[],
): TransitionCheck {
  if (from === to) return { ok: false, reason: 'SAME' };
  if (from === 'RETURNED') return { ok: false, reason: 'RETURNED' };
  if (to === 'RETURNED') return { ok: false, reason: 'USE_RETURN' };
  const owner = roles.includes('OWNER');
  const rework = itemRank(to) < itemRank(from);
  if (rework) {
    return owner || roles.includes('QUALITY')
      ? { ok: true, rework: true }
      : { ok: false, reason: 'ROLE' };
  }
  if (to === 'READY') {
    if (from !== 'QUALITY_CHECK') return { ok: false, reason: 'QUALITY_REQUIRED' };
    return owner || roles.includes('QUALITY')
      ? { ok: true, rework: false }
      : { ok: false, reason: 'ROLE' };
  }
  return owner || roles.includes('OPERATOR')
    ? { ok: true, rework: false }
    : { ok: false, reason: 'ROLE' };
}

/** Check-list de contrôle qualité : tous les points doivent être validés avant « Prêt ». */
export const QUALITY_CHECKLIST = Object.freeze([
  { key: 'clean', label: 'Propre, sans tache' },
  { key: 'pressed', label: 'Repassage soigné' },
  { key: 'intact', label: 'Boutons et coutures intacts' },
  { key: 'packed', label: 'Plié ou sur cintre, emballé selon les préférences' },
] as const);

export type QualityChecklist = Partial<Record<(typeof QUALITY_CHECKLIST)[number]['key'], boolean>>;

export function isQualityChecklistComplete(
  checklist: Record<string, unknown> | null | undefined,
): boolean {
  return QUALITY_CHECKLIST.every((c) => checklist?.[c.key] === true);
}

/** Causes de reprise par défaut (liste configurable par la responsable). */
export const DEFAULT_REWORK_CAUSES = Object.freeze([
  { code: 'STAIN', label: 'Tache persistante' },
  { code: 'IRONING', label: 'Repassage à reprendre' },
  { code: 'SMELL', label: 'Odeur' },
  { code: 'DAMAGE', label: 'Dommage constaté' },
  { code: 'CUSTOMER', label: 'Réclamation du client' },
  { code: 'OTHER', label: 'Autre' },
]);

/**
 * Effet d'un paiement sur le montant payé : les paiements sont immuables ; un remboursement
 * (REFUND) diminue le payé ; une annulation (`reversalOf`) inverse le sens du paiement d'origine.
 */
export function paymentSign(kind: PaymentKind, isReversal: boolean): 1 | -1 {
  const base = kind === 'REFUND' ? -1 : 1;
  return (isReversal ? -base : base) as 1 | -1;
}

/** Espèces attendues (docs/05, « Caisse », règle 2). */
export function expectedCashXaf(
  openingFloatXaf: number,
  signedCashMovementsXaf: readonly number[],
  cashExpensesXaf = 0,
): number {
  return openingFloatXaf + signedCashMovementsXaf.reduce((a, b) => a + b, 0) - cashExpensesXaf;
}

export const MOBILE_MONEY_METHODS = Object.freeze(['ORANGE_MONEY', 'MTN_MOMO'] as const);
export const isMobileMoney = (method: string): boolean =>
  (MOBILE_MONEY_METHODS as readonly string[]).includes(method);
