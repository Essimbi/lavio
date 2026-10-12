import type {
  LeadStatus,
  PlatformRole,
  SubscriptionPaymentMethod,
  TenantStatus,
} from '@lavio/shared';

export const PAYMENT_METHOD_LABELS: Record<SubscriptionPaymentMethod, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  BANK_TRANSFER: 'Virement',
  CHEQUE: 'Chèque',
  OTHER: 'Autre',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  CONVERTED: 'Converti',
  REJECTED: 'Refusé',
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  CLOSED: 'Fermé',
};

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  SUPER_ADMIN: 'Super administrateur',
  PARTNER_VIEWER: 'Exploitant (lecture seule)',
};

export const LICENSE_EVENT_LABELS: Record<string, string> = {
  CREATED: 'Création',
  RENEWED: 'Renouvellement',
  PLAN_CHANGED: 'Changement de plan',
  SUSPENDED: 'Suspension',
  REACTIVATED: 'Réactivation',
  REVOKED: 'Révocation',
  EXPIRED: 'Expiration',
  GRACE_STARTED: 'Début de la période de grâce',
};

const ACTIONS: Record<string, string> = {
  LOGIN: 'Connexion',
  ACCOUNT_LOCKED: 'Compte bloqué après 5 échecs',
  PASSWORD_CHANGED: 'Mot de passe changé',
  INVITATION_ACCEPTED: 'Invitation acceptée',
  REFRESH_TOKEN_REUSE: 'Session suspecte fermée',
  USER_CREATED: 'Utilisateur ajouté',
  USER_UPDATED: 'Utilisateur modifié',
  USER_ROLES_CHANGED: 'Rôles modifiés',
  USER_PASSWORD_RESET_LINK: 'Nouveau lien de connexion',
  TENANT_CREATED: 'Pressing créé',
  TENANT_UPDATED: 'Pressing modifié',
  TENANT_SUSPENDED: 'Pressing suspendu',
  TENANT_REACTIVATED: 'Pressing réactivé',
  OWNER_INVITED: 'Responsable invitée',
  PLAN_CREATED: 'Plan créé',
  PLAN_UPDATED: 'Plan modifié',
  LICENSE_CREATED: 'Licence créée',
  LICENSE_UPDATED: 'Licence modifiée',
  LICENSE_RENEWED: 'Licence renouvelée',
  LICENSE_PLAN_CHANGED: 'Plan de licence changé',
  LICENSE_SUSPENDED: 'Licence suspendue',
  LICENSE_REACTIVATED: 'Licence réactivée',
  LICENSE_REVOKED: 'Licence révoquée',
  SUBSCRIPTION_PAYMENT_RECORDED: 'Paiement d’abonnement enregistré',
  SUBSCRIPTION_PAYMENT_REFUNDED: 'Paiement d’abonnement remboursé',
  LEAD_UPDATED: 'Demande mise à jour',
  PLATFORM_USER_CREATED: 'Utilisateur plateforme ajouté',
  PLATFORM_USER_UPDATED: 'Utilisateur plateforme modifié',
  PLATFORM_SETTINGS_UPDATED: 'Paramètres modifiés',
  STATEMENT_EXPORTED: 'Relevé exporté',
};

export const actionLabel = (action: string): string => ACTIONS[action] ?? action;
