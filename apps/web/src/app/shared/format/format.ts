import { Pipe, type PipeTransform } from '@angular/core';
import type { LicenseStatus, TenantRole } from '@lavio/shared';

const NBSP = ' ';
const TZ = 'Africa/Douala';

/** `12 500 FCFA` avec espaces insécables (docs/08). */
export function formatXaf(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('fr-FR').format(value).replace(/\s/g, NBSP)}${NBSP}FCFA`;
}

/** `12/10/2026` (heure de Douala). */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

/** `12/10/2026 14:05` (24 h, heure de Douala). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

/** `+237 6XX XX XX XX` (docs/08). */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const m = /^237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value);
  return m ? `+237 ${m[1]}${m[2]} ${m[3]} ${m[4]} ${m[5]}` : `+${value}`;
}

/** Date `AAAA-MM-JJ` du jour local, pour les champs `type="date"`. */
export function todayInput(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Minuit à Douala (UTC+1, sans heure d'été) pour une date `AAAA-MM-JJ`, en ISO UTC. */
export function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00+01:00`).toISOString();
}

export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  OWNER: 'Responsable',
  CASHIER: 'Caissier',
  OPERATOR: 'Opérateur',
  STOCK_KEEPER: 'Magasinier',
  ACCOUNTANT: 'Comptable',
  QUALITY: 'Contrôle qualité',
  DRIVER: 'Livreur',
};

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Active',
  GRACE: 'En grâce',
  SUSPENDED: 'Suspendue',
  EXPIRED: 'Expirée',
  REVOKED: 'Révoquée',
};

@Pipe({ name: 'xaf' })
export class XafPipe implements PipeTransform {
  transform = formatXaf;
}

@Pipe({ name: 'frDate' })
export class FrDatePipe implements PipeTransform {
  transform = formatDate;
}

@Pipe({ name: 'frDateTime' })
export class FrDateTimePipe implements PipeTransform {
  transform = formatDateTime;
}

@Pipe({ name: 'phone' })
export class PhonePipe implements PipeTransform {
  transform = formatPhone;
}
