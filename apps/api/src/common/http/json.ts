/**
 * Remplaçant JSON : les montants sont stockés en BigInt (FCFA) et exposés en `number`
 * (docs/02). Un montant hors de la plage des entiers sûrs est une anomalie : on lève une erreur.
 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError('Montant hors de la plage des entiers sûrs');
    }
    return Number(value);
  }
  return value;
}
