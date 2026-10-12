-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "LicenseEventType" AS ENUM ('CREATED', 'RENEWED', 'PLAN_CHANGED', 'SUSPENDED', 'REACTIVATED', 'REVOKED', 'EXPIRED', 'GRACE_STARTED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'PARTNER_VIEWER');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'CASHIER', 'OPERATOR', 'STOCK_KEEPER', 'ACCOUNTANT', 'QUALITY', 'DRIVER');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('RECORDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'REJECTED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "niu" TEXT,
    "rccm" TEXT,
    "vat_enabled" BOOLEAN NOT NULL DEFAULT false,
    "vat_rate" DECIMAL(5,2),
    "ticket_prefix" TEXT,
    "ticket_footer" TEXT,
    "logo_url" TEXT,
    "tour_days" INTEGER[] DEFAULT ARRAY[2, 5]::INTEGER[],
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "tenant_roles" "TenantRole"[] DEFAULT ARRAY[]::"TenantRole"[],
    "platform_role" "PlatformRole",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(3),
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly_xaf" BIGINT,
    "price_yearly_xaf" BIGINT,
    "included_users" INTEGER NOT NULL DEFAULT 2,
    "extra_user_price_xaf" BIGINT,
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "grace_days" INTEGER NOT NULL DEFAULT 7,
    "max_users" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_events" (
    "id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "type" "LicenseEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "license_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "license_id" UUID NOT NULL,
    "amount_xaf" BIGINT NOT NULL,
    "method" "SubscriptionPaymentMethod" NOT NULL,
    "reference" TEXT,
    "received_at" TIMESTAMPTZ(3) NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "deductions_xaf" BIGINT NOT NULL DEFAULT 0,
    "deduction_note" TEXT,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'RECORDED',
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pressing_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'landing',
    "ip_hash" TEXT,
    "contacted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_user_id_idx" ON "invitations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_key_key" ON "licenses"("key");

-- CreateIndex
CREATE INDEX "licenses_tenant_id_idx" ON "licenses"("tenant_id");

-- CreateIndex
CREATE INDEX "licenses_status_ends_at_idx" ON "licenses"("status", "ends_at");

-- CreateIndex
CREATE INDEX "license_events_license_id_created_at_idx" ON "license_events"("license_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_payments_tenant_id_received_at_idx" ON "subscription_payments"("tenant_id", "received_at");

-- CreateIndex
CREATE INDEX "subscription_payments_received_at_idx" ON "subscription_payments"("received_at");

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_at_idx" ON "audit_logs"("tenant_id", "at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_events" ADD CONSTRAINT "license_events_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Compléments écrits à la main (non exprimables dans le schéma Prisma), docs/03.
-- ---------------------------------------------------------------------------

-- Une seule licence courante par pressing.
CREATE UNIQUE INDEX "licenses_one_current_per_tenant"
  ON "licenses" ("tenant_id")
  WHERE "status" IN ('TRIAL', 'ACTIVE', 'GRACE');

-- Montants positifs ou nuls (FCFA).
ALTER TABLE "plans"
  ADD CONSTRAINT "plans_price_monthly_xaf_check" CHECK ("price_monthly_xaf" IS NULL OR "price_monthly_xaf" >= 0),
  ADD CONSTRAINT "plans_price_yearly_xaf_check" CHECK ("price_yearly_xaf" IS NULL OR "price_yearly_xaf" >= 0),
  ADD CONSTRAINT "plans_extra_user_price_xaf_check" CHECK ("extra_user_price_xaf" IS NULL OR "extra_user_price_xaf" >= 0),
  ADD CONSTRAINT "plans_included_users_check" CHECK ("included_users" >= 1),
  ADD CONSTRAINT "plans_trial_days_check" CHECK ("trial_days" >= 0);

ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_amount_xaf_check" CHECK ("amount_xaf" >= 0),
  ADD CONSTRAINT "subscription_payments_deductions_xaf_check" CHECK ("deductions_xaf" >= 0 AND "deductions_xaf" <= "amount_xaf"),
  ADD CONSTRAINT "subscription_payments_period_check" CHECK ("period_end" > "period_start");

ALTER TABLE "licenses"
  ADD CONSTRAINT "licenses_period_check" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "licenses_grace_days_check" CHECK ("grace_days" >= 0),
  ADD CONSTRAINT "licenses_max_users_check" CHECK ("max_users" IS NULL OR "max_users" >= 1);

-- Utilisateur plateforme (sans pressing, avec rôle plateforme) ou utilisateur de pressing (l'inverse).
ALTER TABLE "users"
  ADD CONSTRAINT "users_kind_check" CHECK (
    ("tenant_id" IS NULL AND "platform_role" IS NOT NULL)
    OR ("tenant_id" IS NOT NULL AND "platform_role" IS NULL)
  ),
  ADD CONSTRAINT "users_identifier_check" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);

-- Journal d'audit et événements de licence : ajout seul, jamais modifiés ni supprimés.
CREATE FUNCTION "forbid_update_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La table % est en ajout seul : modification et suppression interdites', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "forbid_update_delete"();

CREATE TRIGGER "license_events_append_only"
  BEFORE UPDATE OR DELETE ON "license_events"
  FOR EACH ROW EXECUTE FUNCTION "forbid_update_delete"();
