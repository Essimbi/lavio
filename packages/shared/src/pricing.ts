/**
 * Calcul du prix d'un dépôt (docs/05, « Dépôts ») — partagé par l'API (qui fait foi) et
 * l'écran de saisie (total en direct). Montants en FCFA entiers, prix catalogue TTC.
 */

export interface QuoteLineInput {
  unitPriceXaf: number;
  quantity: number;
}

export interface QuoteInput {
  lines: QuoteLineInput[];
  express: boolean;
  /** Majoration express en % du sous-total (paramètre du pressing). */
  expressSurchargePercent: number;
  discountXaf: number;
  /** Seuil de validation de la remise en % du sous-total (paramètre du pressing). */
  discountApprovalPercent: number;
}

export interface Quote {
  lineTotalsXaf: number[];
  subtotalXaf: number;
  expressSurchargeXaf: number;
  discountXaf: number;
  totalXaf: number;
  /** Remise au-delà du seuil : validation de la responsable requise (sauf OWNER). */
  discountNeedsApproval: boolean;
}

const isAmount = (n: number) => Number.isInteger(n) && n >= 0;

/** Prix d'une ligne : prix spécial du client s'il existe, sinon prix du catalogue (docs/05, règle 3). */
export function resolveUnitPrice(
  specialPriceXaf: number | null | undefined,
  catalogPriceXaf: number | null | undefined,
): number | null {
  return specialPriceXaf ?? catalogPriceXaf ?? null;
}

export function computeQuote(input: QuoteInput): Quote {
  for (const line of input.lines) {
    if (!isAmount(line.unitPriceXaf)) throw new RangeError('Prix unitaire invalide');
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      throw new RangeError('Quantité invalide');
  }
  if (!isAmount(input.discountXaf)) throw new RangeError('Remise invalide');

  const lineTotalsXaf = input.lines.map((l) => l.unitPriceXaf * l.quantity);
  const subtotalXaf = lineTotalsXaf.reduce((a, b) => a + b, 0);
  // Majoration arrondie au franc le plus proche (hypothèse, docs/14).
  const expressSurchargeXaf = input.express
    ? Math.round((subtotalXaf * input.expressSurchargePercent) / 100)
    : 0;
  const gross = subtotalXaf + expressSurchargeXaf;
  if (input.discountXaf > gross) throw new RangeError('La remise dépasse le montant du dépôt');

  return {
    lineTotalsXaf,
    subtotalXaf,
    expressSurchargeXaf,
    discountXaf: input.discountXaf,
    totalXaf: gross - input.discountXaf,
    // « remise / sous-total dépasse le seuil » : strictement supérieur.
    discountNeedsApproval:
      input.discountXaf > 0 &&
      input.discountXaf * 100 > subtotalXaf * input.discountApprovalPercent,
  };
}

/** Acompte exigé avant l'impression du ticket (docs/05, règle 5) ; `null` = règle désactivée. */
export function requiredAdvanceXaf(
  totalXaf: number,
  advanceRequiredAbove: number | null,
  advanceMinPercent: number,
): number {
  if (advanceRequiredAbove === null || totalXaf <= advanceRequiredAbove) return 0;
  return Math.ceil((totalXaf * advanceMinPercent) / 100);
}

/** TVA extraite d'un montant TTC : `tva = total − total / (1 + taux)` (docs/05, règle 2). */
export function extractVatXaf(totalXaf: number, ratePercent: number): number {
  return Math.round(totalXaf - totalXaf / (1 + ratePercent / 100));
}
