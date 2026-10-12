import { DISPLAY_TIME_ZONE } from './settings.js';

/** Date locale `AAAA-MM-JJ` d'un instant, dans le fuseau d'affichage. */
export function localDate(instant: Date, timeZone = DISPLAY_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Ajoute des jours à une date `AAAA-MM-JJ`. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Jour de la semaine d'une date `AAAA-MM-JJ` (0 = dimanche). */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Date de retrait par défaut (docs/05, règle 6) : prochain jour de tournée à partir de
 * `réception + processingDays`. Sans jour de tournée : réception + processingDays.
 */
export function defaultDueDate(
  receivedAt: Date,
  processingDays: number,
  tourDays: readonly number[],
  timeZone = DISPLAY_TIME_ZONE,
): string {
  let date = addDays(localDate(receivedAt, timeZone), processingDays);
  if (tourDays.length === 0) return date;
  for (let i = 0; i < 7 && !tourDays.includes(weekday(date)); i++) date = addDays(date, 1);
  return date;
}

/** Numéro de ticket affiché : préfixe facultatif + 6 chiffres (docs/14). */
export function formatTicketNumber(number: number, prefix?: string | null): string {
  return `${prefix ?? ''}${String(number).padStart(6, '0')}`;
}

/** Code d'étiquette d'un article : `000124-03` (docs/03). */
export function labelCode(number: number, lineNo: number): string {
  return `${String(number).padStart(6, '0')}-${String(lineNo).padStart(2, '0')}`;
}

/** Contenu du QR code du ticket (docs/09) ; la lecture est prévue en V2. */
export function ticketQrPayload(tenantSlug: string, number: number): string {
  return `LAVIO|${tenantSlug}|${number}`;
}

/** Recherche « avec ou sans zéros initiaux » : `000124`, `124` ou `A-000124` → 124. */
export function parseTicketNumber(input: string): number | null {
  const digits = /(\d+)\s*$/.exec(input.trim())?.[1];
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const UNITS = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function under100(n: number): string {
  if (n < 17) return UNITS[n] ?? '';
  if (n < 20) return `dix-${UNITS[n - 10] ?? ''}`;
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${under100(10 + u)}`;
  if (t === 9) return `quatre-vingt-${under100(10 + u)}`;
  if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[u] ?? ''}`;
  const word = TENS[t] ?? '';
  if (u === 0) return word;
  return u === 1 ? `${word} et un` : `${word}-${UNITS[u] ?? ''}`;
}

/** `plural` : « cents » et « quatre-vingts » perdent leur « s » devant « mille ». */
function under1000(n: number, plural: boolean): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let rest = r === 0 ? '' : under100(r);
  if (!plural && rest === 'quatre-vingts') rest = 'quatre-vingt';
  if (h === 0) return rest;
  const hundreds = h === 1 ? 'cent' : `${UNITS[h] ?? ''} cent${r === 0 && plural ? 's' : ''}`;
  return rest ? `${hundreds} ${rest}` : hundreds;
}

/** Nombre en toutes lettres (orthographe traditionnelle), jusqu'à 999 999 999. */
export function numberToFrenchWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new RangeError('Nombre hors limites');
  if (n === 0) return 'zéro';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions)
    parts.push(millions === 1 ? 'un million' : `${under1000(millions, false)} millions`);
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${under1000(thousands, false)} mille`);
  if (rest) parts.push(under1000(rest, true));
  return parts.join(' ');
}
