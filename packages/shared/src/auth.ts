import type { LicenseStatus, PlatformRole, TenantRole } from './enums.js';

/** Règles de mot de passe (docs/10). */
export const PASSWORD_POLICY = Object.freeze({ minLength: 10, maxLength: 128 });

/** Espace de connexion : application du pressing ou superadmin. */
export type LoginArea = 'app' | 'admin';

export interface LoginRequest {
  /** E-mail ou numéro de téléphone. */
  identifier: string;
  password: string;
  area: LoginArea;
}

export interface TokenResponse {
  accessToken: string;
  /** Durée de validité du jeton d'accès, en secondes. */
  expiresIn: number;
}

/** État de licence exposé au pressing (GET /auth/me, GET /license/status). */
export interface LicenseState {
  status: LicenseStatus;
  endsAt: string;
  graceEndsAt: string;
  readOnly: boolean;
  /** Jours restants avant `endsAt` (négatif une fois dépassée). */
  daysLeft: number;
}

export interface LicenseDetails extends LicenseState {
  key: string;
  planName: string;
  startsAt: string;
  maxUsers: number;
  activeUsers: number;
  /** Lien WhatsApp prérempli pour renouveler (numéro lu dans les paramètres plateforme). */
  renewWhatsappUrl: string | null;
}

export interface MeResponse {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    tenantRoles: TenantRole[];
    platformRole: PlatformRole | null;
    mustChangePassword: boolean;
  };
  tenant: { id: string; name: string; slug: string } | null;
  license: LicenseState | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

/** Lien d'invitation et lien WhatsApp prérempli pour l'envoyer. */
export interface InvitationLink {
  inviteUrl: string;
  whatsappUrl: string | null;
  expiresAt: string;
}
