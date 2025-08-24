# QuickBooks Phone Billing System - Production Deployment Guide

## 🚀 **Overview**

This guide covers deploying the QuickBooks Phone Billing System to production. The system is a Node.js/TypeScript application that automates phone usage billing by integrating with QuickBooks Online and Genesys Cloud.

## 📋 **Prerequisites**

- Node.js 18+ and npm
- PostgreSQL 13+
- Redis (optional, for caching)
- ngrok or similar for webhook testing
- QuickBooks Online Developer Account
- Genesys Cloud Account with API access

## 🏗️ **Architecture**

```
Frontend (React) → Backend (Node.js/Express) → Database (PostgreSQL)
                              ↓
                    QuickBooks Online API
                    Genesys Cloud API
```

## 🔧 **Installation & Setup**

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd QuickBooks
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Configure the following environment variables:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database Configuration
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_SSL=true

# QuickBooks Online Configuration
QBO_CLIENT_ID=your-qbo-client-id
QBO_CLIENT_SECRET=your-qbo-client-secret
QBO_ENVIRONMENT=production
QBO_REDIRECT_URI=https://your-domain.com/qbo-callback

# Genesys Cloud Configuration
GENESYS_BASE_URL=https://api.mypurecloud.com
GENESYS_CLIENT_ID=your-genesys-client-id
GENESYS_CLIENT_SECRET=your-genesys-client-secret
GENESYS_ORGANIZATION_ID=your-org-id

# Billing Configuration
BILLING_TIMEZONE=America/Los_Angeles
BILLING_CURRENCY=USD

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Logging
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14
```

### 3. Database Setup

Create the PostgreSQL database:

```sql
CREATE DATABASE phone_billing_system;
CREATE USER billing_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE phone_billing_system TO billing_user;
```

The application will automatically create tables on first run (with `synchronize: true` in development).

### 4. Build the Application

```bash
npm run build
```

## 🚀 **Deployment Options**

### Option 1: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t phone-billing-system .
docker run -p 3000:3000 --env-file .env phone-billing-system
```

### Option 2: PM2 Deployment

Install PM2 globally:

```bash
npm install -g pm2
```

Create ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: "phone-billing-system",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      time: true,
    },
  ],
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Systemd Service

Create `/etc/systemd/system/phone-billing.service`:

```ini
[Unit]
Description=Phone Billing System
After=network.target postgresql.service

[Service]
Type=simple
User=billing
WorkingDirectory=/opt/phone-billing-system
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable phone-billing
sudo systemctl start phone-billing
```

## 🔐 **Security Configuration**

### 1. SSL/TLS Setup

Use a reverse proxy (nginx) with Let's Encrypt:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 3. Database Security

```sql
-- Restrict database access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE phone_billing_system TO billing_user;
GRANT USAGE ON SCHEMA public TO billing_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO billing_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO billing_user;
```

## 📊 **Monitoring & Logging**

### 1. Application Monitoring

The system includes built-in health checks:

```bash
curl https://your-domain.com/health
curl https://your-domain.com/api/v1/dashboard/system-status
```

### 2. Log Management

Logs are automatically rotated and stored in `./logs/`:

- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only

### 3. System Monitoring

Monitor system resources:

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Log file sizes
du -sh logs/*

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🔄 **Scheduled Jobs**

The system automatically runs monthly billing jobs:

- **Schedule**: 1st of each month at 2:00 AM PST
- **Timezone**: Configurable via `BILLING_TIMEZONE`
- **Monitoring**: Check `/api/v1/dashboard/system-status`

## 🚨 **Troubleshooting**

### Common Issues

1. **Database Connection Failed**

   - Check database credentials and network connectivity
   - Verify PostgreSQL is running
   - Check firewall settings

2. **QBO Authentication Failed**

   - Verify OAuth credentials
   - Check redirect URI configuration
   - Ensure tokens are valid

3. **Genesys API Errors**

   - Verify API credentials
   - Check rate limits
   - Ensure proper permissions

4. **Scheduled Jobs Not Running**
   - Check system timezone
   - Verify cron job is active
   - Check application logs

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Health Check Endpoints

```bash
# System health
GET /health

# API health
GET /api/v1/health

# System status
GET /api/v1/dashboard/system-status

## 📈 **Performance Optimization**

### 1. Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_billing_jobs_status ON billing_jobs(status);
CREATE INDEX idx_billing_jobs_created_at ON billing_jobs(created_at);
CREATE INDEX idx_phone_usage_client_id ON phone_usage(client_id);
CREATE INDEX idx_phone_usage_started_at ON phone_usage(started_at);
```

### 2. Application Optimization

- Use PM2 cluster mode for multiple processes
- Implement Redis caching for frequently accessed data
- Use database connection pooling
- Monitor memory usage and implement garbage collection

### 3. Monitoring Setup

Consider implementing:

- Prometheus + Grafana for metrics
- ELK stack for log aggregation
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)

## 🔄 **Backup & Recovery**

### 1. Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U billing_user phone_billing_system > "$BACKUP_DIR/backup_$DATE.sql"

# Keep backups for 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

### 2. Application Backups

```bash
# Backup application files
tar -czf "/backups/app/app_$DATE.tar.gz" /opt/phone-billing-system

# Backup logs
tar -czf "/backups/logs/logs_$DATE.tar.gz" /opt/phone-billing-system/logs
```

### 3. Recovery Procedures

1. **Database Recovery**

   ```bash
   psql -h localhost -U billing_user phone_billing_system < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Application Recovery**
   ```bash
   tar -xzf app_YYYYMMDD_HHMMSS.tar.gz -C /opt/
   npm install
   npm run build
   ```

## 📚 **Maintenance**

### 1. Regular Tasks

- **Daily**: Check application logs and health status
- **Weekly**: Review billing job results and error logs
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize database performance

### 2. Update Procedures

```bash
# Stop application
pm2 stop phone-billing-system

# Backup current version
cp -r /opt/phone-billing-system /opt/phone-billing-system.backup

# Update code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Start application
pm2 start phone-billing-system

# Verify health
curl https://your-domain.com/health
```

## 🆘 **Support & Contact**

For technical support:

1. Check application logs first
2. Review this deployment guide
3. Check system health endpoints
4. Contact development team with error details

## 📝 **Changelog**

- **v1.0.0**: Initial production release
- Complete QBO integration
- Genesys Cloud phone system integration
- Automated billing scheduler
- Comprehensive dashboard
- Production-ready deployment guide
