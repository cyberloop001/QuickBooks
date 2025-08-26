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

#### `customer_profiles` (formerly `clients`)

- **Primary Key:** `id` (UUID)
- **Unique Constraints:** `genesysClientId`, `qboCustomerId`
- **Key Fields:** `name`, `email`, `phone`, `address`, `ratePerMinute`
- **Status:** `isActive` (boolean)
- **Additional Fields:** `billingAddress`, `taxExempt`, `notes`

#### `billing_jobs`

- **Primary Key:** `id` (UUID)
- **Unique Constraints:** `jobId`
- **Enums:** `status` (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- **Enums:** `type` (MONTHLY, MANUAL, DRY_RUN)
- **Key Fields:** `startDate`, `endDate`, `totalClients`, `totalInvoices`, `totalAmount`
- **Additional Fields:** `executionTime`, `errorDetails`, `dryRun`

#### `phone_usage`

- **Primary Key:** `id` (UUID)
- **Foreign Keys:** `clientId` → `customer_profiles.id`, `billingJobId` → `billing_jobs.id`
- **Key Fields:** `callId`, `startedAt`, `endedAt`, `billableSeconds`, `amount`
- **Status:** `isBilled` (boolean)
- **Additional Fields:** `queueName`, `agentName`, `callType`, `direction`

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

### `customer_profiles` table

- `idx_customer_profiles_genesys_id` - For Genesys client ID lookups
- `idx_customer_profiles_qbo_id` - For QBO customer ID lookups
- `idx_customer_profiles_is_active` - For active client filtering
- `idx_customer_profiles_name` - For client name searches
- `idx_customer_profiles_email` - For email lookups

### `billing_jobs` table

- `idx_billing_jobs_job_id` - For job ID lookups
- `idx_billing_jobs_status` - For status filtering
- `idx_billing_jobs_type` - For type filtering
- `idx_billing_jobs_period` - For date range queries
- `idx_billing_jobs_created_at` - For chronological ordering

### `phone_usage` table

- `idx_phone_usage_client_started_pst` - For client usage queries
- `idx_phone_usage_billing_job` - For billing job lookups
- `idx_phone_usage_call_id` - For call ID lookups
- `idx_phone_usage_client_id` - For client ID lookups
- `idx_phone_usage_is_billed` - For billing status filtering
- `idx_phone_usage_started_at` - For date range queries

## 🚨 Important Notes

### Connection Management

The system uses TypeORM with the following configuration:

```typescript
// Database connection options
{
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  ssl: config.database.ssl,
  entities: [__dirname + '/entities/**/*.ts'],
  migrations: [__dirname + '/database/migrations/**/*.ts'],
  synchronize: config.server.environment === 'development',
  logging: config.server.environment === 'development',
}
```

### Connection Pooling

```typescript
// Connection pool configuration
{
  extra: {
    max: 20,        // Maximum connections
    min: 5,         // Minimum connections
    acquire: 30000, // Connection acquire timeout
    idle: 10000,    // Connection idle timeout
  }
}
```

### Transaction Management

```typescript
// Example transaction usage
await getManager().transaction(async (transactionalEntityManager) => {
  // Database operations within transaction
  const result = await transactionalEntityManager.save(entity);
  return result;
});
```

## 📈 Performance Optimization

### Query Optimization

1. **Use Query Builder** for complex queries:

   ```typescript
   const results = await getRepository(PhoneUsage)
     .createQueryBuilder("usage")
     .select("SUM(usage.billableMinutes)", "totalMinutes")
     .addSelect("COUNT(usage.id)", "totalCalls")
     .where("usage.clientId = :clientId", { clientId })
     .andWhere("usage.startedAt >= :startDate", { startDate })
     .getRawOne();
   ```

2. **Implement Pagination** for large datasets:

   ```typescript
   const [items, total] = await getRepository(Entity).findAndCount({
     skip: (page - 1) * limit,
     take: limit,
     order: { createdAt: "DESC" },
   });
   ```

3. **Use Relations** to avoid N+1 queries:
   ```typescript
   const jobs = await getRepository(BillingJob).find({
     relations: ["clientBillingResults", "clientBillingResults.client"],
   });
   ```

### Index Strategy

1. **Composite Indexes** for common query patterns:

   ```sql
   CREATE INDEX idx_phone_usage_client_date
   ON phone_usage(client_id, started_at);
   ```

2. **Partial Indexes** for filtered queries:

   ```sql
   CREATE INDEX idx_phone_usage_unbilled
   ON phone_usage(client_id, started_at)
   WHERE is_billed = false;
   ```

3. **Expression Indexes** for computed values:
   ```sql
   CREATE INDEX idx_phone_usage_billable_minutes
   ON phone_usage(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60);
   ```

## 🔒 Security Features

### Data Encryption

1. **Sensitive Data** should be encrypted at rest:

   ```sql
   -- Example: Encrypt credit card information
   ALTER TABLE customer_profiles
   ADD COLUMN encrypted_cc_data BYTEA;
   ```

2. **Connection Security** with SSL:
   ```typescript
   {
     ssl: {
       rejectUnauthorized: false,
       ca: fs.readFileSync('/path/to/ca-certificate.crt'),
       key: fs.readFileSync('/path/to/client-key.pem'),
       cert: fs.readFileSync('/path/to/client-certificate.crt')
     }
   }
   ```

### Access Control

1. **Row Level Security** (PostgreSQL 9.5+):

   ```sql
   ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY customer_access_policy ON customer_profiles
   FOR ALL TO billing_user
   USING (tenant_id = current_setting('app.tenant_id')::uuid);
   ```

2. **Column Level Security**:
   ```sql
   GRANT SELECT (id, name, email) ON customer_profiles TO billing_user;
   GRANT SELECT ON customer_profiles TO billing_user;
   ```

## 🧪 Testing and Development

### Test Database Setup

```bash
# Create test database
createdb phone_billing_test

# Run migrations on test database
NODE_ENV=test npm run db:migrate

# Run tests
npm test
```

### Database Seeding

```typescript
// Example seed data
const seedData = {
  customers: [
    {
      name: "Test Customer",
      email: "test@example.com",
      ratePerMinute: 0.15,
    },
  ],
  billingJobs: [
    {
      type: "MANUAL",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    },
  ],
};
```

### Performance Testing

```bash
# Run database performance tests
npm run test:db:performance

# Load testing with large datasets
npm run test:db:load
```

## 🔍 Monitoring and Maintenance

### Database Health Checks

```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes;
```

### Regular Maintenance

1. **Vacuum Operations**:

   ```sql
   -- Manual vacuum
   VACUUM ANALYZE customer_profiles;

   -- Full vacuum (requires exclusive lock)
   VACUUM FULL customer_profiles;
   ```

2. **Statistics Updates**:

   ```sql
   -- Update table statistics
   ANALYZE customer_profiles;

   -- Update specific columns
   ANALYZE customer_profiles(name, email);
   ```

3. **Index Maintenance**:

   ```sql
   -- Reindex specific index
   REINDEX INDEX idx_customer_profiles_name;

   -- Reindex all indexes on table
   REINDEX TABLE customer_profiles;
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Timeouts**

   - Check network connectivity
   - Verify firewall settings
   - Increase connection timeout values

2. **Performance Issues**

   - Check query execution plans with `EXPLAIN ANALYZE`
   - Monitor slow query log
   - Review index usage statistics

3. **Lock Contention**
   - Check for long-running transactions
   - Monitor lock wait times
   - Use `pg_stat_activity` to identify blocking queries

### Debug Commands

```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Check table bloat
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
FROM pg_stat_user_tables;
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeORM Documentation](https://typeorm.io/)
- [Database Performance Tuning](https://www.postgresql.org/docs/current/performance.html)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Best_Practices)

## 🔄 Future Migrations

When adding new entities or modifying existing ones:

1. Update the `init.sql` file with the new schema
2. Add migration logic to `migrate.ts`
3. Test thoroughly in development
4. Document changes in this README
5. Update the application entities to match

### Migration Best Practices

1. **Always backup** before running migrations
2. **Test migrations** in development first
3. **Use transactions** for complex migrations
4. **Provide rollback** procedures when possible
5. **Document changes** thoroughly

---

**Last updated: December 2024**
