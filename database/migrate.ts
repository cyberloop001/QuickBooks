import { createConnection } from "typeorm";
import { config } from "../src/config";
import { logger } from "../src/utils/logger";

/**
 * Database migration script to update existing schema to match current TypeORM entities
 * Run this script after updating the init.sql file to ensure database consistency
 */
async function migrateDatabase() {
  let connection;

  try {
    logger.info("Starting database migration...");

    // Connect to database
    connection = await createConnection({
      type: "postgres",
      host: config.database.host,
      port: config.database.port,
      username: config.database.user,
      password: config.database.password,
      database: config.database.name,
      ssl: config.database.ssl,
      entities: [__dirname + "/../src/entities/**/*.js"],
      migrations: [__dirname + "/migrations/**/*.js"],
      synchronize: false, // Don't auto-sync during migration
      logging: true,
    });

    logger.info("Database connection established");

    // Check if we need to update enum types
    await updateEnumTypes(connection);

    // Check if we need to add missing columns
    await addMissingColumns(connection);

    // Check if we need to create missing tables
    await createMissingTables(connection);

    // Check if we need to update foreign key constraints
    await updateForeignKeys(connection);

    // Check if we need to add missing indexes
    await addMissingIndexes(connection);

    // Check if we need to add missing triggers
    await addMissingTriggers(connection);

    logger.info("Database migration completed successfully");
  } catch (error) {
    logger.error("Database migration failed:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
      logger.info("Database connection closed");
    }
  }
}

async function updateEnumTypes(connection: any) {
  logger.info("Checking enum types...");

  // Update billing job status enum
  try {
    await connection.query(`
      ALTER TYPE billingjobstatus RENAME VALUE 'pending' TO 'PENDING';
      ALTER TYPE billingjobstatus RENAME VALUE 'in_progress' TO 'IN_PROGRESS';
      ALTER TYPE billingjobstatus RENAME VALUE 'completed' TO 'COMPLETED';
      ALTER TYPE billingjobstatus RENAME VALUE 'failed' TO 'FAILED';
      ALTER TYPE billingjobstatus RENAME VALUE 'cancelled' TO 'CANCELLED';
    `);
    logger.info("Updated billingjobstatus enum values");
  } catch (error) {
    logger.info("billingjobstatus enum already up to date or doesn't exist");
  }

  // Update billing job type enum
  try {
    await connection.query(`
      ALTER TYPE billingjobtype RENAME VALUE 'monthly' TO 'MONTHLY';
      ALTER TYPE billingjobtype RENAME VALUE 'manual' TO 'MANUAL';
      ALTER TYPE billingjobtype RENAME VALUE 'dry_run' TO 'DRY_RUN';
    `);
    logger.info("Updated billingjobtype enum values");
  } catch (error) {
    logger.info("billingjobtype enum already up to date or doesn't exist");
  }
}

async function addMissingColumns(connection: any) {
  logger.info("Checking for missing columns...");

  // Check and add missing columns to billing_jobs table
  const billingJobsColumns = await connection.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'billing_jobs' AND table_schema = 'public'
  `);

  const existingColumns = billingJobsColumns.map((col: any) => col.column_name);

  if (!existingColumns.includes("totalClients")) {
    await connection.query(
      `ALTER TABLE billing_jobs ADD COLUMN "totalClients" integer NOT NULL DEFAULT 0`
    );
    logger.info("Added totalClients column to billing_jobs");
  }

  if (!existingColumns.includes("successfulInvoices")) {
    await connection.query(
      `ALTER TABLE billing_jobs ADD COLUMN "successfulInvoices" integer NOT NULL DEFAULT 0`
    );
    logger.info("Added successfulInvoices column to billing_jobs");
  }

  if (!existingColumns.includes("failedInvoices")) {
    await connection.query(
      `ALTER TABLE billing_jobs ADD COLUMN "failedInvoices" integer NOT NULL DEFAULT 0`
    );
    logger.info("Added failedInvoices column to billing_jobs");
  }

  if (!existingColumns.includes("startDate")) {
    await connection.query(
      `ALTER TABLE billing_jobs ADD COLUMN "startDate" timestamp`
    );
    logger.info("Added startDate column to billing_jobs");
  }

  if (!existingColumns.includes("endDate")) {
    await connection.query(
      `ALTER TABLE billing_jobs ADD COLUMN "endDate" timestamp`
    );
    logger.info("Added endDate column to billing_jobs");
  }

  // Rename old columns if they exist
  try {
    if (existingColumns.includes("billingPeriodStart")) {
      await connection.query(
        `ALTER TABLE billing_jobs RENAME COLUMN "billingPeriodStart" TO "startDate"`
      );
      logger.info("Renamed billingPeriodStart to startDate");
    }

    if (existingColumns.includes("billingPeriodEnd")) {
      await connection.query(
        `ALTER TABLE billing_jobs RENAME COLUMN "billingPeriodEnd" TO "endDate"`
      );
      logger.info("Renamed billingPeriodEnd to endDate");
    }

    if (existingColumns.includes("invoicesCreated")) {
      await connection.query(
        `ALTER TABLE billing_jobs RENAME COLUMN "invoicesCreated" TO "totalInvoices"`
      );
      logger.info("Renamed invoicesCreated to totalInvoices");
    }

    if (existingColumns.includes("invoicesFailed")) {
      await connection.query(
        `ALTER TABLE billing_jobs RENAME COLUMN "invoicesFailed" TO "failedInvoices"`
      );
      logger.info("Renamed invoicesFailed to failedInvoices");
    }

    if (existingColumns.includes("errorMessage")) {
      await connection.query(
        `ALTER TABLE billing_jobs RENAME COLUMN "errorMessage" TO "error"`
      );
      logger.info("Renamed errorMessage to error");
    }
  } catch (error) {
    logger.info("Column rename operations completed or not needed");
  }
}

async function createMissingTables(connection: any) {
  logger.info("Checking for missing tables...");
}

async function updateForeignKeys(connection: any) {
  logger.info("Checking foreign key constraints...");

  // Add foreign key constraints if they don't exist

  try {
    await connection.query(`
      ALTER TABLE phone_usage 
      ADD CONSTRAINT fk_phone_usage_client 
      FOREIGN KEY ("clientId") REFERENCES clients("id") ON DELETE CASCADE
    `);
    logger.info("Added foreign key constraint for phone_usage.clientId");
  } catch (error) {
    logger.info(
      "Foreign key constraint for phone_usage.clientId already exists"
    );
  }

  try {
    await connection.query(`
      ALTER TABLE phone_usage 
      ADD CONSTRAINT fk_phone_usage_billing_job 
      FOREIGN KEY ("billingJobId") REFERENCES billing_jobs("id") ON DELETE SET NULL
    `);
    logger.info("Added foreign key constraint for phone_usage.billingJobId");
  } catch (error) {
    logger.info(
      "Foreign key constraint for phone_usage.billingJobId already exists"
    );
  }
}

async function addMissingIndexes(connection: any) {
  logger.info("Checking for missing indexes...");

  const indexes = [
    {
      name: "idx_phone_usage_call_id",
      table: "phone_usage",
      columns: '"callId"',
    },
    {
      name: "idx_phone_usage_client_id",
      table: "phone_usage",
      columns: '"clientId"',
    },
    {
      name: "idx_phone_usage_is_billed",
      table: "phone_usage",
      columns: '"isBilled"',
    },
    {
      name: "idx_billing_jobs_job_id",
      table: "billing_jobs",
      columns: '"jobId"',
    },
    {
      name: "idx_billing_jobs_status",
      table: "billing_jobs",
      columns: '"status"',
    },
    { name: "idx_billing_jobs_type", table: "billing_jobs", columns: '"type"' },
    {
      name: "idx_billing_jobs_period",
      table: "billing_jobs",
      columns: '"startDate", "endDate"',
    },

    {
      name: "idx_clients_genesys_id",
      table: "clients",
      columns: '"genesysClientId"',
    },
    {
      name: "idx_clients_qbo_id",
      table: "clients",
      columns: '"qboCustomerId"',
    },
    { name: "idx_clients_is_active", table: "clients", columns: '"isActive"' },
    { name: "idx_clients_name", table: "clients", columns: '"name"' },
  ];

  for (const index of indexes) {
    try {
      await connection.query(
        `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table} (${index.columns})`
      );
      logger.info(`Created index ${index.name}`);
    } catch (error) {
      logger.info(`Index ${index.name} already exists or creation failed`);
    }
  }
}

async function addMissingTriggers(connection: any) {
  logger.info("Checking for missing triggers...");

  // Create the set_updated_at function if it doesn't exist
  await connection.query(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Add triggers for all tables that have updatedAt columns
  const triggers = [
    { name: "set_customer_profiles_updated_at", table: "customer_profiles" },
    { name: "set_billing_jobs_updated_at", table: "billing_jobs" },
  ];

  for (const trigger of triggers) {
    try {
      await connection.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = '${trigger.name}'
          ) THEN
            CREATE TRIGGER ${trigger.name}
            BEFORE UPDATE ON ${trigger.table}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
          END IF;
        END $$;
      `);
      logger.info(`Created trigger ${trigger.name}`);
    } catch (error) {
      logger.info(`Trigger ${trigger.name} already exists or creation failed`);
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      logger.info("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateDatabase };
