import type { TourStatus, TourType } from './enums.js';
import { addDays, weekday } from './deposits.js';

/**
 * Tournées (docs/05, « Tournées ») et périodes du tableau de bord. Dates locales `AAAA-MM-JJ`
 * (Africa/Douala), jours de la semaine 0 = dimanche.
 */
export const isTourDay = (date: string, tourDays: readonly number[]): boolean =>
  tourDays.includes(weekday(date));

/** Prochains jours de tournée à partir de `from` inclus (au plus `count`, sur 8 semaines). */
export function nextTourDates(from: string, tourDays: readonly number[], count = 4): string[] {
  const result: string[] = [];
  for (let i = 0; i < 56 && result.length < count; i++) {
    const d = addDays(from, i);
    if (isTourDay(d, tourDays)) result.push(d);
  }
  return result;
}

/** Statut initial d'une demande. */
export const initialTourStatus = (type: TourType): TourStatus =>
  type === 'PICKUP' ? 'TO_COLLECT' : 'TO_DELIVER';

/** Transitions permises : ramassage TO_COLLECT → COLLECTED ; livraison TO_DELIVER → DELIVERED ; annulation. */
export function canChangeTourStatus(type: TourType, from: TourStatus, to: TourStatus): boolean {
  if (from === 'COLLECTED' || from === 'DELIVERED' || from === 'CANCELLED') return false;
  if (to === 'CANCELLED') return true;
  return type === 'PICKUP'
    ? from === 'TO_COLLECT' && to === 'COLLECTED'
    : from === 'TO_DELIVER' && to === 'DELIVERED';
}

export const DashboardPeriod = Object.freeze({
  today: 'today',
  week: 'week',
  month: 'month',
  year: 'year',
  custom: 'custom',
} as const);
export type DashboardPeriod = keyof typeof DashboardPeriod;

/** Bornes locales incluses d'une période : semaine du lundi, mois et année calendaires. */
export function periodRange(
  period: DashboardPeriod,
  today: string,
  from?: string,
  to?: string,
): { from: string; to: string } {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: addDays(today, -((weekday(today) + 6) % 7)), to: today };
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'custom':
      return { from: from ?? today, to: to ?? today };
  }
}
