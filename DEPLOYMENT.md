# Phone Billing System - Deployment Guide

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ running
- QuickBooks Online Developer account
- Phone system API access

### 2. Installation

```bash
# Clone and setup
git clone <repository-url>
cd phone-billing-system
npm install
npm run build

# Environment configuration
cp env.example .env
# Edit .env with your credentials
```

### 3. Database Setup

```bash
# Create database
createdb phone_billing

# Run migrations (development mode)
npm run db:migrate
```

### 4. Start the System

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 Testing the System

### Test CSV Processing

```bash
# Run the test script
node test-csv.js

# Or use the billing job runner
npm run billing:run --csv-file ./test-data.csv --output-file ./results.json
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3001/health

# System overview
curl http://localhost:3001/api/v1/dashboard/overview

# Billing status
curl http://localhost:3001/api/v1/billing/status
```

## 🔐 QuickBooks Online Setup

### 1. Create QBO App

1. Go to [QBO Developer Portal](https://developer.intuit.com/)
2. Create new app
3. Set OAuth2 redirect URI: `http://localhost:3001/api/v1/qbo/auth/callback`
4. Note Client ID and Secret

### 2. Configure Environment

```bash
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_REDIRECT_URI=http://localhost:3001/api/v1/qbo/auth/callback
QBO_ENVIRONMENT=sandbox
QBO_ACCOUNT_ID=your_qbo_account_id
```

### 3. Authorize Access

```bash
# Get authorization URL
curl http://localhost:3001/api/v1/qbo/auth

# Complete OAuth flow in browser
# Store returned tokens securely
```

## 🗄️ Database Configuration

### PostgreSQL Setup

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create user and database
sudo -u postgres createuser --interactive
sudo -u postgres createdb phone_billing

# Configure .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=phone_billing
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false
```

### Database Schema

The system automatically creates tables using TypeORM:

- `clients` - Client mapping table
- `phone_usage` - Usage records
- `billing_jobs` - Job tracking

## 📱 Phone System Integration

### API Configuration

```bash
PHONE_API_BASE_URL=https://api.phonesystem.com
PHONE_API_KEY=your_api_key
PHONE_API_SECRET=your_api_secret
```

### Test Connection

```bash
curl http://localhost:3001/api/v1/phone-system/connection/test
```

## 🧪 Running Billing Jobs

### Manual Billing

```bash
# Run for previous month
npm run billing:run

# Run for specific period
npm run billing:run --start-date 2025-07-01 --end-date 2025-07-31

# Dry run (no invoices)
npm run billing:run --dry-run

# Specific client
npm run billing:run --client-id PS-1001
```

### CSV Processing

```bash
# Process CSV file
npm run billing:run --csv-file ./usage.csv --output-file ./results.json

# The system will:
# 1. Parse CSV data
# 2. Filter by date range
# 3. Aggregate by client
# 4. Generate invoice payloads
# 5. Save results to JSON
```

## 📊 Monitoring & Dashboard

### Health Checks

- `/health` - Basic health
- `/health/detailed` - Comprehensive status
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Dashboard Endpoints

- `/api/v1/dashboard/overview` - System overview
- `/api/v1/dashboard/metrics` - Performance metrics
- `/api/v1/dashboard/jobs` - Recent billing jobs
- `/api/v1/dashboard/alerts` - System alerts

### Kill Switch

```bash
# Enable emergency shutdown
curl -X POST http://localhost:3001/api/v1/dashboard/kill-switch \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Emergency maintenance"}'

# Disable
curl -X POST http://localhost:3001/api/v1/dashboard/kill-switch \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build image
docker build -t phone-billing-system .

# Run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### Environment Variables

```bash
# Create .env file for Docker
cp env.example .env
# Edit with production values

# Or set environment variables
docker run -e NODE_ENV=production -e DB_HOST=host.docker.internal phone-billing-system
```

## 🔒 Production Security

### Environment Variables

```bash
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret
KILL_SWITCH_ENABLED=false
LOG_LEVEL=info
```

### SSL/TLS Configuration

```bash
# Use reverse proxy (nginx) for SSL termination
# Configure firewall rules
# Set up monitoring and alerting
```

### Database Security

```bash
# Use connection pooling
# Enable SSL connections
# Set up backup strategy
# Configure access controls
```

## 📝 Logging & Monitoring

### Log Files

```bash
# View logs
tail -f logs/combined-$(date +%Y-%m-%d).log
tail -f logs/error-$(date +%Y-%m-%d).log

# Log rotation is automatic
# Logs are kept for 14 days by default
```

### Monitoring

```bash
# System metrics
curl http://localhost:3001/api/v1/dashboard/metrics

# Recent jobs
curl http://localhost:3001/api/v1/dashboard/jobs

# Billing summary
curl http://localhost:3001/api/v1/billing/summary
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   ```bash
   # Check PostgreSQL service
   sudo systemctl status postgresql

   # Test connection
   psql -h localhost -U your_username -d phone_billing
   ```

2. **QBO Authentication Failed**

   ```bash
   # Check environment variables
   echo $QBO_CLIENT_ID
   echo $QBO_CLIENT_SECRET

   # Test connection
   curl http://localhost:3001/api/v1/qbo/connection/test
   ```

3. **Phone System API Errors**

   ```bash
   # Test connection
   curl http://localhost:3001/api/v1/phone-system/connection/test

   # Check API credentials
   echo $PHONE_API_KEY
   ```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Check application logs
tail -f logs/combined-$(date +%Y-%m-%d).log
```

## 📋 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set secure `JWT_SECRET`
- [ ] Configure SSL/TLS
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up backup strategy
- [ ] Test kill switch functionality
- [ ] Verify idempotency
- [ ] Test QBO sandbox integration
- [ ] Configure rate limiting
- [ ] Set up health checks
- [ ] Test CSV processing
- [ ] Verify timezone handling

## 🔄 Maintenance

### Regular Tasks

```bash
# Check system health
curl http://localhost:3001/health

# Monitor billing jobs
curl http://localhost:3001/api/v1/billing/jobs

# Review logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Test connections
curl http://localhost:3001/api/v1/qbo/connection/test
curl http://localhost:3001/api/v1/phone-system/connection/test
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Restart service
# (depends on your deployment method)
```

## 📞 Support

For issues and questions:

1. Check the logs for error details
2. Review the troubleshooting section
3. Check system health endpoints
4. Create an issue in the repository
5. Contact the development team

## 🎯 Next Steps

After successful deployment:

1. **Test CSV Processing**: Run with sample data
2. **Configure QBO**: Complete OAuth setup
3. **Set up Phone System**: Configure API credentials
4. **Test Billing**: Run dry-run billing jobs
5. **Monitor System**: Set up monitoring and alerts
6. **Production Deployment**: Deploy to production environment
7. **User Training**: Train operations team
8. **Go Live**: Enable automated billing
