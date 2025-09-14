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



-- Table: customer_profiles (NEW - replaces clients table)
CREATE TABLE IF NOT EXISTS customer_profiles (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "qboCustomerId" text,
  "genesysQueueNames" text[] NOT NULL DEFAULT '{}',
  "isActive" boolean NOT NULL DEFAULT true,
  "ratePerMinute" numeric(10,2) NOT NULL DEFAULT 1.00,
  "taxCode" text,
  "notes" text,
  
  -- Billing Configuration Fields
  "billDate" integer NOT NULL DEFAULT 1, -- Day of month to bill (1-31)
  "billTime" text NOT NULL DEFAULT '02:00', -- Time of day to bill (HH:MM format, 24-hour)
  "billingPeriodStart" integer NOT NULL DEFAULT 1, -- Day of month billing period starts (1-31)
  "billingPeriodEnd" integer NOT NULL DEFAULT 31, -- Day of month billing period ends (1-31)
  "minimumMinutes" integer NOT NULL DEFAULT 0, -- Minimum minutes included in base rate
  "overageRatePerMinute" numeric(10,2) NOT NULL DEFAULT 1.00, -- Rate for minutes over minimum
  
  -- QBO Customer Fields (Required for QBO integration)
  "qboDisplayName" text NOT NULL, -- Required field for QBO
  "qboCompanyName" text,
  "qboGivenName" text,
  "qboFamilyName" text,
  "qboMiddleName" text,
  "qboTitle" text,
  "qboSuffix" text,
  
  -- QBO Contact Fields
  "qboPrimaryEmailAddr" text,
  "qboPrimaryPhone" text,
  
  -- QBO Address Fields (replacing old address structure)
  "qboLine1" text,
  "qboCity" text,
  "qboCountrySubDivisionCode" text,
  "qboPostalCode" text,
  "qboCountry" text,
  
  -- QBO Metadata
  "qboMetadata" json,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint only for non-null qboCustomerId values
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_profiles_qbo_customer_id_unique 
ON customer_profiles ("qboCustomerId") 
WHERE "qboCustomerId" IS NOT NULL;

-- Table: billing_jobs
CREATE TABLE IF NOT EXISTS billing_jobs (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "jobId" text UNIQUE NOT NULL,
  "type" billingjobtype NOT NULL DEFAULT 'MONTHLY',
  "status" billingjobstatus NOT NULL DEFAULT 'PENDING',
  "startDate" timestamp NOT NULL,
  "endDate" timestamp NOT NULL,
  "totalQueues" integer NOT NULL DEFAULT 0,
  "queueId" text,
  "queueName" text,
  "totalInvoices" integer NOT NULL DEFAULT 0,
  "totalAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "totalMinutes" numeric(10,2) NOT NULL DEFAULT 0,
  "successfulInvoices" integer NOT NULL DEFAULT 0,
  "failedInvoices" integer NOT NULL DEFAULT 0,
  "error" text,
  "metadata" json,
  "startedAt" timestamp,
  "completedAt" timestamp,
  "customerProfileId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);



-- Table: phone_usage
CREATE TABLE IF NOT EXISTS phone_usage (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "callId" text NOT NULL,
  "customerProfileId" uuid NOT NULL,
  "genesysQueueName" text,
  "startedAt" timestamptz NOT NULL,
  "endedAt" timestamptz NOT NULL,
  "billableSeconds" integer NOT NULL,
  "billableMinutes" numeric(10,2) NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "isBilled" boolean NOT NULL DEFAULT false,
  "billingJobId" uuid,
  "qboInvoiceId" text,
  "billedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_phone_usage_customer_profile FOREIGN KEY ("customerProfileId") REFERENCES customer_profiles("id") ON DELETE CASCADE,
  CONSTRAINT fk_phone_usage_billing_job FOREIGN KEY ("billingJobId") REFERENCES billing_jobs("id") ON DELETE SET NULL
);

-- Table: regions
CREATE TABLE IF NOT EXISTS regions (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL UNIQUE,
  "description" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Table: teams
CREATE TABLE IF NOT EXISTS teams (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "description" text,
  "regionId" uuid NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_teams_region FOREIGN KEY ("regionId") REFERENCES regions("id") ON DELETE CASCADE
);

-- Table: queue_assignments
CREATE TABLE IF NOT EXISTS queue_assignments (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "queueId" text NOT NULL UNIQUE,
  "queueName" text NOT NULL,
  "teamId" uuid NOT NULL,
  "assignedAt" timestamptz NOT NULL DEFAULT now(),
  "assignedBy" text,
  "notes" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_queue_assignments_team FOREIGN KEY ("teamId") REFERENCES teams("id") ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_phone_usage_customer_profile_started ON phone_usage ("customerProfileId", "startedAt");
CREATE INDEX IF NOT EXISTS idx_phone_usage_billing_job ON phone_usage ("billingJobId");
CREATE INDEX IF NOT EXISTS idx_phone_usage_call_id ON phone_usage ("callId");
CREATE INDEX IF NOT EXISTS idx_phone_usage_customer_profile_id ON phone_usage ("customerProfileId");
CREATE INDEX IF NOT EXISTS idx_phone_usage_is_billed ON phone_usage ("isBilled");
CREATE INDEX IF NOT EXISTS idx_phone_usage_queue_name ON phone_usage ("genesysQueueName");

CREATE INDEX IF NOT EXISTS idx_billing_jobs_job_id ON billing_jobs ("jobId");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_status ON billing_jobs ("status");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_type ON billing_jobs ("type");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_period ON billing_jobs ("startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_customer_profile ON billing_jobs ("customerProfileId");
CREATE INDEX IF NOT EXISTS idx_billing_jobs_total_minutes ON billing_jobs ("totalMinutes");



CREATE INDEX IF NOT EXISTS idx_customer_profiles_qbo_id ON customer_profiles ("qboCustomerId");
CREATE INDEX IF NOT EXISTS idx_customer_profiles_is_active ON customer_profiles ("isActive");
CREATE INDEX IF NOT EXISTS idx_customer_profiles_name ON customer_profiles ("name");
CREATE INDEX IF NOT EXISTS idx_customer_profiles_queue_names ON customer_profiles USING GIN ("genesysQueueNames");

-- Triggers to maintain updatedAt
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_customer_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_customer_profiles_updated_at
    BEFORE UPDATE ON customer_profiles
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



-- Insert sample data for development (optional)
-- Uncomment the following lines if you want sample data for testing

/*
INSERT INTO customer_profiles ("name", "genesysQueueNames", "email", "isActive", "ratePerMinute") VALUES
  ('Advanced Eyecare', ARRAY['Advanced Eyecare', 'AE_Support'], 'billing@advancedeyecare.com', true, 1.50),
  ('Sample Client 2', ARRAY['Sample_Queue_2'], 'client2@example.com', true, 2.00)
ON CONFLICT ("name") DO NOTHING;
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions ("name");
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions ("isActive");

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams ("name");
CREATE INDEX IF NOT EXISTS idx_teams_region_id ON teams ("regionId");
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams ("isActive");

CREATE INDEX IF NOT EXISTS idx_queue_assignments_queue_id ON queue_assignments ("queueId");
CREATE INDEX IF NOT EXISTS idx_queue_assignments_queue_name ON queue_assignments ("queueName");
CREATE INDEX IF NOT EXISTS idx_queue_assignments_team_id ON queue_assignments ("teamId");

-- Add triggers to maintain updatedAt
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_regions_updated_at'
  ) THEN
    CREATE TRIGGER set_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_teams_updated_at'
  ) THEN
    CREATE TRIGGER set_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_queue_assignments_updated_at'
  ) THEN
    CREATE TRIGGER set_queue_assignments_updated_at
    BEFORE UPDATE ON queue_assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Insert sample regions and teams for testing
INSERT INTO regions ("name", "description") VALUES
  ('North America', 'North American operations'),
  ('Europe', 'European operations'),
  ('Asia Pacific', 'Asia Pacific operations')
ON CONFLICT ("name") DO NOTHING;

-- Get region IDs for sample teams
DO $$
DECLARE
  na_region_id uuid;
  eu_region_id uuid;
  ap_region_id uuid;
BEGIN
  SELECT id INTO na_region_id FROM regions WHERE name = 'North America';
  SELECT id INTO eu_region_id FROM regions WHERE name = 'Europe';
  SELECT id INTO ap_region_id FROM regions WHERE name = 'Asia Pacific';

  -- Insert sample teams
  INSERT INTO teams ("name", "description", "regionId") VALUES
    ('Customer Support - NA', 'North America customer support team', na_region_id),
    ('Sales - NA', 'North America sales team', na_region_id),
    ('Customer Support - EU', 'Europe customer support team', eu_region_id),
    ('Sales - EU', 'Europe sales team', eu_region_id),
    ('Customer Support - AP', 'Asia Pacific customer support team', ap_region_id),
    ('Sales - AP', 'Asia Pacific sales team', ap_region_id)
  ON CONFLICT DO NOTHING;
END $$;

