import type { LicenseStatus } from './enums.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuts en lecture seule : consultation et exports seulement (docs/06). */
export const READ_ONLY_LICENSE_STATUSES: readonly LicenseStatus[] = Object.freeze([
  'EXPIRED',
  'SUSPENDED',
  'REVOKED',
]);

/** Statuts « courants » : une seule licence de ce type par pressing. */
export const CURRENT_LICENSE_STATUSES: readonly LicenseStatus[] = Object.freeze([
  'TRIAL',
  'ACTIVE',
  'GRACE',
]);

export interface LicenseTimeline {
  status: LicenseStatus;
  endsAt: Date;
  graceDays: number;
}

export const graceEndsAt = (l: Pick<LicenseTimeline, 'endsAt' | 'graceDays'>): Date =>
  new Date(l.endsAt.getTime() + l.graceDays * DAY_MS);

/**
 * Statut effectif d'une licence à une date donnée. Le cron enregistre les transitions
 * chaque jour ; ce calcul applique les mêmes règles immédiatement :
 * TRIAL/ACTIVE → GRACE à `endsAt`, GRACE → EXPIRED à `endsAt + graceDays`.
 * SUSPENDED, REVOKED et EXPIRED sont des statuts terminaux tant qu'un superadmin n'agit pas.
 */
export function effectiveLicenseStatus(l: LicenseTimeline, now: Date): LicenseStatus {
  if (l.status === 'SUSPENDED' || l.status === 'REVOKED' || l.status === 'EXPIRED') {
    return l.status;
  }
  if (now.getTime() >= graceEndsAt(l).getTime()) return 'EXPIRED';
  if (now.getTime() >= l.endsAt.getTime()) return 'GRACE';
  return l.status;
}

export const isReadOnlyStatus = (status: LicenseStatus): boolean =>
  READ_ONLY_LICENSE_STATUSES.includes(status);

/** Jours restants avant `endsAt`, arrondis au jour supérieur (0 le jour même, négatif ensuite). */
export function daysLeft(endsAt: Date, now: Date): number {
  return Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS);
}

/** Niveau de bannière côté application : J-7, J-3, J-0 et pendant la grâce (docs/06). */
export type LicenseBannerLevel = 'none' | 'notice' | 'warning' | 'urgent' | 'grace' | 'readOnly';

export function licenseBannerLevel(status: LicenseStatus, days: number): LicenseBannerLevel {
  if (READ_ONLY_LICENSE_STATUSES.includes(status)) return 'readOnly';
  if (status === 'GRACE') return 'grace';
  if (days <= 0) return 'urgent';
  if (days <= 3) return 'warning';
  if (days <= 7) return 'notice';
  return 'none';
}
