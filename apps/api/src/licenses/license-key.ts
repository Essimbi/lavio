import { randomInt } from 'node:crypto';

/** Alphabet Crockford base32 : sans I, L, O ni U (docs/06). */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const LICENSE_KEY_PATTERN =
  /^LAVIO-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Génère une clé `LAVIO-XXXX-XXXX-XXXX` avec un aléa cryptographique. L'unicité est garantie en base. */
export function generateLicenseKey(): string {
  const group = () =>
    Array.from({ length: 4 }, () => CROCKFORD_ALPHABET[randomInt(CROCKFORD_ALPHABET.length)]).join(
      '',
    );
  return `LAVIO-${group()}-${group()}-${group()}`;
}
