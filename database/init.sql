-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for billing jobs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingjobstatus') THEN
    CREATE TYPE billingjobstatus AS ENUM ('pending','in_progress','completed','failed','cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingjobtype') THEN
    CREATE TYPE billingjobtype AS ENUM ('monthly','manual','dry_run');
  END IF;
END $$;

-- Table: clients
CREATE TABLE IF NOT EXISTS clients (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "phoneSystemClientId" text UNIQUE NOT NULL,
  "qboCustomerId" text UNIQUE,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "address" text,
  "city" text,
  "state" text,
  "zipCode" text,
  "country" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "ratePerMinute" numeric(10,2) NOT NULL DEFAULT 1.00,
  "taxCode" text,
  "notes" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Table: billing_jobs
CREATE TABLE IF NOT EXISTS billing_jobs (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "jobId" text UNIQUE NOT NULL,
  "type" billingjobtype NOT NULL,
  "status" billingjobstatus NOT NULL DEFAULT 'pending',
  "clientId" uuid REFERENCES clients("id") ON DELETE SET NULL,
  "billingPeriodStart" date NOT NULL,
  "billingPeriodEnd" date NOT NULL,
  "startedAt" timestamptz NOT NULL,
  "completedAt" timestamptz,
  "totalCalls" integer NOT NULL DEFAULT 0,
  "totalMinutes" numeric(10,2) NOT NULL DEFAULT 0,
  "totalAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "invoicesCreated" integer NOT NULL DEFAULT 0,
  "invoicesFailed" integer NOT NULL DEFAULT 0,
  "errorMessage" text,
  "metadata" jsonb,
  "notes" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Table: phone_usage
CREATE TABLE IF NOT EXISTS phone_usage (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "callId" text NOT NULL,
  "clientId" uuid NOT NULL REFERENCES clients("id") ON DELETE CASCADE,
  "startedAt" timestamptz NOT NULL,
  "endedAt" timestamptz NOT NULL,
  "billableSeconds" integer NOT NULL,
  "startedPst" timestamptz NOT NULL,
  "endedPst" timestamptz NOT NULL,
  "billableMinutes" numeric(10,2) NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "isBilled" boolean NOT NULL DEFAULT false,
  "billingJobId" uuid REFERENCES billing_jobs("id") ON DELETE SET NULL,
  "qboInvoiceId" text,
  "billedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_phone_usage_client_started_pst ON phone_usage ("clientId", "startedPst");
CREATE INDEX IF NOT EXISTS idx_phone_usage_billing_job ON phone_usage ("billingJobId");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_client_period ON billing_jobs ("clientId", "billingPeriodStart", "billingPeriodEnd");

-- Triggers to maintain updatedAt
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_clients_updated_at'
  ) THEN
    CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_billing_jobs_updated_at'
  ) THEN
    CREATE TRIGGER set_billing_jobs_updated_at
    BEFORE UPDATE ON billing_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
