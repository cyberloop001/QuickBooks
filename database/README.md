# Database Setup and Migration Guide

This directory contains the database initialization and migration scripts for the QuickBooks Phone Billing System.

## 📁 Files

- **`init.sql`** - Initial database schema for new installations
- **`migrate.ts`** - Migration script to update existing databases
- **`README.md`** - This documentation file

## 🚀 Initial Setup

### For New Installations

1. **Create the database:**

   ```sql
   CREATE DATABASE phone_billing;
   CREATE USER billing_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE phone_billing TO billing_user;
   ```

2. **Run the initialization script:**

   ```bash
   psql -U billing_user -d phone_billing -f database/init.sql
   ```

   Or if using Docker:

   ```bash
   docker exec -i your_postgres_container psql -U billing_user -d phone_billing < database/init.sql
   ```

### For Existing Installations

1. **Run the migration script:**

   ```bash
   npm run db:migrate
   ```

   This will automatically:

   - Update enum values to match current TypeORM entities
   - Add missing columns and tables
   - Update foreign key constraints
   - Add missing indexes and triggers

## 🏗️ Database Schema

### Tables

#### `clients`

- **Primary Key:** `id` (UUID)
- **Unique Constraints:** `genesysClientId`, `qboCustomerId`
- **Key Fields:** `name`, `email`, `phone`, `address`, `ratePerMinute`
- **Status:** `isActive` (boolean)

#### `billing_jobs`

- **Primary Key:** `id` (UUID)
- **Unique Constraints:** `jobId`
- **Enums:** `status` (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- **Enums:** `type` (MONTHLY, MANUAL, DRY_RUN)
- **Key Fields:** `startDate`, `endDate`, `totalClients`, `totalInvoices`, `totalAmount`

#### `client_billing_results`

- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `billingJobId` → `billing_jobs.id`, `clientId` → `clients.id`
- **Enums:** `status` (PENDING, PROCESSING, COMPLETED, FAILED, SKIPPED)
- **Key Fields:** `totalCalls`, `totalMinutes`, `totalAmount`, `qboInvoiceId`

#### `phone_usage`

- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `clientId` → `clients.id`, `billingJobId` → `billing_jobs.id`
- **Key Fields:** `callId`, `startedAt`, `endedAt`, `billableSeconds`, `amount`
- **Status:** `isBilled` (boolean)

### Enums

#### `billingjobstatus`

- `PENDING` - Job is queued for processing
- `IN_PROGRESS` - Job is currently running
- `COMPLETED` - Job finished successfully
- `FAILED` - Job encountered an error
- `CANCELLED` - Job was cancelled

#### `billingjobtype`

- `MONTHLY` - Automated monthly billing
- `MANUAL` - Manual billing run
- `DRY_RUN` - Test run without creating invoices

#### `clientbillingstatus`

- `PENDING` - Client billing is queued
- `PROCESSING` - Client billing is in progress
- `COMPLETED` - Client billing finished successfully
- `FAILED` - Client billing encountered an error
- `SKIPPED` - Client billing was skipped

## 🔧 Migration Process

The migration script (`migrate.ts`) performs the following operations:

1. **Enum Updates**

   - Renames enum values to match current TypeORM entities
   - Creates new enum types if they don't exist

2. **Schema Updates**

   - Adds missing columns to existing tables
   - Renames old columns to match new schema
   - Creates missing tables

3. **Constraint Updates**

   - Adds foreign key constraints
   - Ensures referential integrity

4. **Performance Optimization**
   - Creates missing indexes for better query performance
   - Adds triggers for automatic `updatedAt` maintenance

## 📊 Indexes

The following indexes are created for optimal performance:

### `clients` table

- `idx_clients_genesys_id` - For Genesys client ID lookups
- `idx_clients_qbo_id` - For QBO customer ID lookups
- `idx_clients_is_active` - For active client filtering
- `idx_clients_name` - For client name searches

### `billing_jobs` table

- `idx_billing_jobs_job_id` - For job ID lookups
- `idx_billing_jobs_status` - For status filtering
- `idx_billing_jobs_type` - For type filtering
- `idx_billing_jobs_period` - For date range queries

### `phone_usage` table

- `idx_phone_usage_client_started_pst` - For client usage queries
- `idx_phone_usage_billing_job` - For billing job lookups
- `idx_phone_usage_call_id` - For call ID lookups
- `idx_phone_usage_client_id` - For client ID lookups
- `idx_phone_usage_is_billed` - For billing status filtering

### `client_billing_results` table

- `idx_client_billing_results_billing_job` - For billing job lookups
- `idx_client_billing_results_client` - For client lookups
- `idx_client_billing_results_status` - For status filtering

## 🚨 Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test migrations in a development environment first
3. **Downtime**: Some migrations may require brief application downtime
4. **Rollback**: The migration script doesn't support rollbacks - use database backups instead

## 🔍 Troubleshooting

### Common Issues

1. **Permission Errors**

   - Ensure the database user has sufficient privileges
   - Check if the user can create tables, indexes, and triggers

2. **Enum Value Conflicts**

   - The migration script handles enum updates automatically
   - If conflicts occur, check for existing data with old enum values

3. **Foreign Key Violations**
   - Ensure all referenced data exists before adding constraints
   - Check for orphaned records

### Getting Help

If you encounter issues during migration:

1. Check the application logs for detailed error messages
2. Verify database connectivity and permissions
3. Ensure all required extensions are available (uuid-ossp)
4. Check PostgreSQL version compatibility (requires 12+)

## 📈 Performance Considerations

- **Large Tables**: For tables with millions of records, consider running migrations during low-traffic periods
- **Index Creation**: Large indexes may take time to create on big tables
- **Locking**: Some operations may briefly lock tables

## 🔄 Future Migrations

When adding new entities or modifying existing ones:

1. Update the `init.sql` file with the new schema
2. Add migration logic to `migrate.ts`
3. Test thoroughly in development
4. Document changes in this README
5. Update the application entities to match
