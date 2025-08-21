-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for billing jobs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingjobstatus') THEN
    CREATE TYPE billingjobstatus AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingjobtype') THEN
    CREATE TYPE billingjobtype AS ENUM ('MONTHLY', 'MANUAL', 'DRY_RUN');
  END IF;
END $$;

-- Enum types for client billing status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clientbillingstatus') THEN
    CREATE TYPE clientbillingstatus AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');
  END IF;
END $$;

-- Table: clients
CREATE TABLE IF NOT EXISTS clients (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "genesysClientId" text UNIQUE NOT NULL,
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
  "type" billingjobtype NOT NULL DEFAULT 'MONTHLY',
  "status" billingjobstatus NOT NULL DEFAULT 'PENDING',
  "startDate" timestamp NOT NULL,
  "endDate" timestamp NOT NULL,
  "totalClients" integer NOT NULL DEFAULT 0,
  "totalInvoices" integer NOT NULL DEFAULT 0,
  "totalAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "successfulInvoices" integer NOT NULL DEFAULT 0,
  "failedInvoices" integer NOT NULL DEFAULT 0,
  "error" text,
  "metadata" json,
  "startedAt" timestamp,
  "completedAt" timestamp,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Table: client_billing_results
CREATE TABLE IF NOT EXISTS client_billing_results (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "billingJobId" uuid NOT NULL,
  "clientId" uuid NOT NULL,
  "status" clientbillingstatus NOT NULL DEFAULT 'PENDING',
  "totalCalls" integer NOT NULL DEFAULT 0,
  "totalMinutes" numeric(10,2) NOT NULL DEFAULT 0,
  "totalAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "qboInvoiceId" text,
  "qboInvoiceNumber" text,
  "error" text,
  "metadata" json,
  "processedAt" timestamp,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_client_billing_results_billing_job FOREIGN KEY ("billingJobId") REFERENCES billing_jobs("id") ON DELETE CASCADE,
  CONSTRAINT fk_client_billing_results_client FOREIGN KEY ("clientId") REFERENCES clients("id") ON DELETE CASCADE
);

-- Table: phone_usage
CREATE TABLE IF NOT EXISTS phone_usage (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "callId" text NOT NULL,
  "clientId" uuid NOT NULL,
  "startedAt" timestamptz NOT NULL,
  "endedAt" timestamptz NOT NULL,
  "billableSeconds" integer NOT NULL,
  "startedPst" timestamptz NOT NULL,
  "endedPst" timestamptz NOT NULL,
  "billableMinutes" numeric(10,2) NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "isBilled" boolean NOT NULL DEFAULT false,
  "billingJobId" uuid,
  "qboInvoiceId" text,
  "billedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_phone_usage_client FOREIGN KEY ("clientId") REFERENCES clients("id") ON DELETE CASCADE,
  CONSTRAINT fk_phone_usage_billing_job FOREIGN KEY ("billingJobId") REFERENCES billing_jobs("id") ON DELETE SET NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_phone_usage_client_started_pst ON phone_usage ("clientId", "startedPst");
CREATE INDEX IF NOT EXISTS idx_phone_usage_billing_job ON phone_usage ("billingJobId");
CREATE INDEX IF NOT EXISTS idx_phone_usage_call_id ON phone_usage ("callId");
CREATE INDEX IF NOT EXISTS idx_phone_usage_client_id ON phone_usage ("clientId");
CREATE INDEX IF NOT EXISTS idx_phone_usage_is_billed ON phone_usage ("isBilled");

CREATE INDEX IF NOT EXISTS idx_billing_jobs_job_id ON billing_jobs ("jobId");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_status ON billing_jobs ("status");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_type ON billing_jobs ("type");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_period ON billing_jobs ("startDate", "endDate");

CREATE INDEX IF NOT EXISTS idx_client_billing_results_billing_job ON client_billing_results ("billingJobId");
CREATE INDEX IF NOT EXISTS idx_client_billing_results_client ON client_billing_results ("clientId");
CREATE INDEX IF NOT EXISTS idx_client_billing_results_status ON client_billing_results ("status");

CREATE INDEX IF NOT EXISTS idx_clients_genesys_id ON clients ("genesysClientId");
CREATE INDEX IF NOT EXISTS idx_clients_qbo_id ON clients ("qboCustomerId");
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients ("isActive");
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients ("name");

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_client_billing_results_updated_at'
  ) THEN
    CREATE TRIGGER set_client_billing_results_updated_at
    BEFORE UPDATE ON client_billing_results
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Insert sample data for development (optional)
-- Uncomment the following lines if you want sample data for testing

/*
INSERT INTO clients ("genesysClientId", "name", "email", "isActive", "ratePerMinute") VALUES
  ('client_001', 'Sample Client 1', 'client1@example.com', true, 1.50),
  ('client_002', 'Sample Client 2', 'client2@example.com', true, 2.00)
ON CONFLICT ("genesysClientId") DO NOTHING;
*/
