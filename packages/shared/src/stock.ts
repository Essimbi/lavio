import type { PaymentMethod, StockReasonCode, TreasuryAccountType } from './enums.js';

/**
 * Règles de stock (docs/05, « Stock ») : quantités à 3 décimales, coût moyen pondéré en FCFA
 * entiers, alerte une seule fois par franchissement du seuil.
 */
export const roundQty = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Coût moyen pondéré après une entrée :
 * `(stock × coût_moyen + qté × coût_entrée) / (stock + qté)`, arrondi au franc.
 * Un stock négatif (dérogation) n'entre pas dans la moyenne.
 */
export function weightedAverageCost(
  onHand: number,
  avgCostXaf: number,
  qtyIn: number,
  unitCostXaf: number,
): number {
  const base = Math.max(onHand, 0);
  const total = base + qtyIn;
  if (total <= 0) return unitCostXaf;
  return Math.round((base * avgCostXaf + qtyIn * unitCostXaf) / total);
}

/** Valeur d'une quantité au coût moyen, arrondie au franc. */
export const stockValueXaf = (qty: number, avgCostXaf: number): number =>
  Math.round(qty * avgCostXaf);

/**
 * Alerte de seuil : notifier quand le stock passe sous le seuil (ou l'atteint) et que l'alerte
 * n'a pas déjà été envoyée ; réarmer quand le stock remonte au-dessus du seuil.
 */
export function lowStockTransition(
  onHandAfter: number,
  alertThreshold: number,
  alreadySent: boolean,
): { notify: boolean; sent: boolean } {
  const low = onHandAfter <= alertThreshold;
  if (low) return { notify: !alreadySent, sent: true };
  return { notify: false, sent: false };
}

export const STOCK_REASON_LABELS: Readonly<Record<StockReasonCode, string>> = Object.freeze({
  CONSUMPTION: 'Consommation',
  LOSS: 'Perte',
  BREAKAGE: 'Casse',
  EXPIRED: 'Périmé',
  OTHER: 'Autre',
});

/** Catégorie système des paiements de factures fournisseurs (docs/05, comptabilité, règle 3). */
export const PURCHASES_CATEGORY_KEY = 'PURCHASES';

/** Catégories de dépenses par défaut (modifiables par la responsable). */
export const DEFAULT_EXPENSE_CATEGORIES: readonly { name: string; systemKey?: string }[] =
  Object.freeze([
    { name: 'Achats matières', systemKey: PURCHASES_CATEGORY_KEY },
    { name: 'Loyer' },
    { name: 'Électricité' },
    { name: 'Eau' },
    { name: 'Salaires' },
    { name: 'Transport' },
    { name: 'Entretien et réparations' },
    { name: 'Fournitures' },
    { name: 'Communication' },
    { name: 'Impôts et taxes' },
    { name: 'Divers' },
  ]);

/** Comptes de trésorerie par défaut et modes d'encaissement qui les alimentent. */
export const DEFAULT_TREASURY_ACCOUNTS: readonly {
  name: string;
  type: TreasuryAccountType;
  paymentMethods: PaymentMethod[];
}[] = Object.freeze([
  { name: 'Caisse', type: 'CASH', paymentMethods: ['CASH'] },
  { name: 'Banque', type: 'BANK', paymentMethods: ['BANK_TRANSFER', 'CHEQUE'] },
  { name: 'Orange Money', type: 'MOBILE_MONEY', paymentMethods: ['ORANGE_MONEY'] },
  { name: 'MTN MoMo', type: 'MOBILE_MONEY', paymentMethods: ['MTN_MOMO'] },
]);

/**
 * Prochaine échéance d'une dépense récurrente : même jour (1 à 28) du mois suivant.
 * Dates `AAAA-MM-JJ`.
 */
export function nextMonthlyDueOn(currentDueOn: string, dayOfMonth: number): string {
  const [y, m] = currentDueOn.split('-').map(Number) as [number, number];
  const year = m === 12 ? y + 1 : y;
  const month = m === 12 ? 1 : m + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
}

/** Première échéance à partir d'une date (`AAAA-MM-JJ`) : ce mois-ci si le jour n'est pas passé. */
export function firstMonthlyDueOn(today: string, dayOfMonth: number): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const thisMonth = `${y}-${String(m).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
  return d <= dayOfMonth ? thisMonth : nextMonthlyDueOn(thisMonth, dayOfMonth);
}
