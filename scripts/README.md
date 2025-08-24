# Scripts and Utilities

This directory contains utility scripts and tools for the QuickBooks Phone Billing System.

## 📁 Files

- **`README.md`** - This documentation file
- **Utility scripts** - Various automation and deployment scripts

## 🚀 Quick Start Scripts

### Main Start Script

The `start.sh` script in the root directory provides a complete setup and startup process:

```bash
# Make executable and run
chmod +x start.sh
./start.sh
```

**What it does:**

1. Checks prerequisites (Node.js, npm, Docker)
2. Installs backend dependencies
3. Creates `.env` file from template if needed
4. Builds the backend application
5. Starts PostgreSQL database (Docker or local)
6. Starts the backend server
7. Sets up and starts the frontend

### Usage

```bash
# From project root
./start.sh

# Or with specific options
./start.sh --help
```

## 🔧 Utility Scripts

### Database Management

#### Migration Script

```bash
# Run database migrations
npm run db:migrate

# Or directly with ts-node
npx ts-node src/database/migrate.ts
```

#### Database Initialization

```bash
# Initialize new database
psql -U your_user -d phone_billing -f database/init.sql

# With Docker
docker exec -i your_postgres_container psql -U postgres -d phone_billing < database/init.sql
```

### Billing Operations

#### Manual Billing Job

```bash
# Run billing job manually
npm run billing:run

# Or directly
npx ts-node src/jobs/billing-job.ts
```

#### Billing Job Testing

```bash
# Run dry-run billing (no invoices created)
# Set environment variable: BILLING_DRY_RUN=true
BILLING_DRY_RUN=true npm run billing:run
```

## 🐳 Docker Utilities

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres
docker-compose up -d redis
docker-compose up -d nginx

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Stop services
docker-compose down

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Database Operations

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d phone_billing

# Backup database
docker-compose exec postgres pg_dump -U postgres phone_billing > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d phone_billing < backup.sql

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

## 📊 Monitoring Scripts

### Health Checks

```bash
# Check system health
curl http://localhost:3001/health

# Check API status
curl http://localhost:3001/api/v1/dashboard/system-status

# Check database connection
curl http://localhost:3001/api/v1/health/database
```

### Log Monitoring

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View access logs
tail -f logs/access.log

# Search logs for errors
grep -i error logs/app.log
```

## 🔍 Debugging Scripts

### Environment Check

```bash
# Check environment variables
node -e "console.log(require('dotenv').config())"

# Validate configuration
npx ts-node -e "
import { validateConfig } from './src/config';
try { validateConfig(); console.log('✅ Config valid'); }
catch(e) { console.log('❌ Config error:', e.message); }
"
```

### Database Connection Test

```bash
# Test database connection
npx ts-node -e "
import { createConnection } from 'typeorm';
import { config } from './src/config';

createConnection({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
}).then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch(e => {
  console.log('❌ Database connection failed:', e.message);
  process.exit(1);
});
"
```

## 🚀 Deployment Scripts

### Production Build

```bash
# Build backend
npm run build

# Build frontend
cd frontend
npm run build
cd ..

# Start production server
npm start
```

### PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart phone-billing-system
```

## 📝 Custom Scripts

### Create Custom Script

1. **Create script file** in `scripts/` directory:

   ```bash
   #!/bin/bash
   # scripts/custom-script.sh

   echo "Running custom script..."
   # Your script logic here
   ```

2. **Make executable**:

   ```bash
   chmod +x scripts/custom-script.sh
   ```

3. **Add to package.json** scripts section:

   ```json
   {
     "scripts": {
       "custom": "./scripts/custom-script.sh"
     }
   }
   ```

4. **Run script**:
   ```bash
   npm run custom
   ```

### Example: Data Export Script

```bash
#!/bin/bash
# scripts/export-data.sh

echo "Exporting billing data..."

# Export billing jobs
psql -U $DB_USER -d $DB_NAME -c "
  COPY (
    SELECT * FROM billing_jobs
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) TO STDOUT WITH CSV HEADER
" > billing_jobs_export.csv

# Export customer data
psql -U $DB_USER -d $DB_NAME -c "
  COPY (
    SELECT * FROM customer_profiles
    WHERE is_active = true
  ) TO STDOUT WITH CSV HEADER
" > customers_export.csv

echo "Export completed: billing_jobs_export.csv, customers_export.csv"
```

## 🔒 Security Scripts

### SSL Certificate Management

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout
```

### Environment Security

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate secure database password
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 📚 Script Templates

### Node.js Script Template

```javascript
#!/usr/bin/env node
// scripts/template.js

import dotenv from "dotenv";
import { config } from "../src/config/index.js";

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log("Starting script...");

    // Your script logic here

    console.log("Script completed successfully");
  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

main();
```

### Bash Script Template

```bash
#!/bin/bash
# scripts/template.sh

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Main function
main() {
  log_info "Starting script..."

  # Your script logic here

  log_info "Script completed successfully"
}

# Run main function
main "$@"
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**

   ```bash
   chmod +x scripts/*.sh
   ```

2. **Script Not Found**

   - Ensure you're in the correct directory
   - Check file paths in scripts

3. **Environment Variables**
   - Verify `.env` file exists
   - Check variable names and values

### Debug Mode

Enable debug output:

```bash
# Bash scripts
bash -x scripts/script.sh

# Node.js scripts
DEBUG=* node scripts/script.js
```

## 📚 Additional Resources

- [Bash Scripting Guide](https://tldp.org/LDP/abs/html/)
- [Node.js Scripts](https://nodejs.org/api/process.html)
- [Docker Compose](https://docs.docker.com/compose/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

## 🔄 Maintenance

### Regular Tasks

- **Weekly**: Check script logs and performance
- **Monthly**: Update script dependencies
- **Quarterly**: Review and optimize scripts
- **Annually**: Audit script security and permissions

### Script Updates

1. **Test changes** in development environment
2. **Update documentation** for any new features
3. **Version control** all script changes
4. **Backup** existing scripts before major changes

---

**Last updated: December 2024**
