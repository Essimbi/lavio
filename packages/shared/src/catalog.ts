/**
 * Référentiels du dépôt (docs/01, module 2) : symboles d'entretien ISO 3758 et
 * check-list de réception simplifiée. Les codes sont stockés ; les libellés sont affichés.
 */

export interface CareSymbol {
  code: string;
  label: string;
  group: 'lavage' | 'blanchiment' | 'séchage' | 'repassage' | 'entretien professionnel';
}

export const CARE_SYMBOLS: readonly CareSymbol[] = Object.freeze([
  { code: 'WASH_30', label: 'Lavage 30 °C', group: 'lavage' },
  { code: 'WASH_40', label: 'Lavage 40 °C', group: 'lavage' },
  { code: 'WASH_60', label: 'Lavage 60 °C', group: 'lavage' },
  { code: 'WASH_95', label: 'Lavage 95 °C', group: 'lavage' },
  { code: 'WASH_HAND', label: 'Lavage à la main', group: 'lavage' },
  { code: 'WASH_NO', label: 'Ne pas laver', group: 'lavage' },
  { code: 'BLEACH_ANY', label: 'Tout agent de blanchiment', group: 'blanchiment' },
  { code: 'BLEACH_OXY', label: 'Blanchiment à l’oxygène seulement', group: 'blanchiment' },
  { code: 'BLEACH_NO', label: 'Ne pas blanchir', group: 'blanchiment' },
  { code: 'DRY_TUMBLE_LOW', label: 'Sèche-linge, température douce', group: 'séchage' },
  { code: 'DRY_TUMBLE_NORMAL', label: 'Sèche-linge, température normale', group: 'séchage' },
  { code: 'DRY_TUMBLE_NO', label: 'Pas de sèche-linge', group: 'séchage' },
  { code: 'IRON_LOW', label: 'Repassage doux (110 °C)', group: 'repassage' },
  { code: 'IRON_MEDIUM', label: 'Repassage moyen (150 °C)', group: 'repassage' },
  { code: 'IRON_HIGH', label: 'Repassage chaud (200 °C)', group: 'repassage' },
  { code: 'IRON_NO', label: 'Ne pas repasser', group: 'repassage' },
  { code: 'PRO_P', label: 'Nettoyage à sec (P)', group: 'entretien professionnel' },
  { code: 'PRO_F', label: 'Nettoyage à sec doux (F)', group: 'entretien professionnel' },
  { code: 'PRO_W', label: 'Nettoyage à l’eau professionnel (W)', group: 'entretien professionnel' },
  { code: 'PRO_NO', label: 'Pas de nettoyage à sec', group: 'entretien professionnel' },
]);

export const CARE_SYMBOL_CODES: ReadonlySet<string> = new Set(CARE_SYMBOLS.map((s) => s.code));

/** Check-list de réception simplifiée : cochée si le point est constaté. */
export const RECEPTION_CHECKLIST = Object.freeze([
  { key: 'pocketsChecked', label: 'Poches vérifiées' },
  { key: 'stains', label: 'Taches présentes' },
  { key: 'tears', label: 'Déchirure ou trou' },
  { key: 'missingButtons', label: 'Bouton manquant' },
  { key: 'fadedColors', label: 'Couleurs passées' },
  { key: 'accessories', label: 'Accessoires remis (ceinture, capuche…)' },
] as const);

export type ReceptionChecklistKey = (typeof RECEPTION_CHECKLIST)[number]['key'];
export type ReceptionChecklist = Partial<Record<ReceptionChecklistKey, boolean>>;
export const RECEPTION_CHECKLIST_KEYS: ReadonlySet<string> = new Set(
  RECEPTION_CHECKLIST.map((c) => c.key),
);

/** Listes créées pour chaque nouveau pressing (docs/03, « Listes par défaut »), sans tarif. */
export const DEFAULT_ITEM_TYPES: readonly string[] = Object.freeze([
  'Chemise',
  'Pantalon',
  'Costume',
  'Veste',
  'Robe',
  'Jupe',
  'Boubou',
  'Tenue traditionnelle',
  'Manteau',
  'Cravate',
  'Drap',
  'Couette',
  'Rideau',
]);

export const DEFAULT_SERVICES: readonly string[] = Object.freeze([
  'Lavage',
  'Nettoyage à sec',
  'Repassage',
  'Lavage et repassage',
  'Détachage',
]);
