# 🚀 QuickBooks Phone Billing System

A production-ready, automated phone usage billing system that integrates with **QuickBooks Online** and **Genesys Cloud** to create invoices automatically.

## ✨ **Features**

- 🔐 **QBO Integration**: Complete OAuth2 flow with automatic token refresh
- 📞 **Genesys Cloud**: Phone system integration for call data retrieval
- 💰 **Automated Billing**: Monthly scheduled billing with idempotency
- 📊 **Real-time Dashboard**: Comprehensive system monitoring and analytics
- 🚨 **Error Handling**: Robust error handling with detailed logging
- 🔄 **Scheduled Jobs**: Automated monthly billing on the 1st of each month
- 🛡️ **Production Ready**: Security, monitoring, and deployment guides

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Node.js Backend │    │  PostgreSQL DB │
│                 │◄──►│                  │◄──►│                 │
│   - Dashboard   │    │  - Express API   │    │  - Clients     │
│   - Billing UI  │    │  - TypeORM       │    │  - Usage Data  │
│   - Settings    │    │  - Cron Jobs     │    │  - Billing Jobs│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌──────────────────┐
                    │   External APIs  │
                    │                  │
                    │  QBO API v3      │
                    │  Genesys Cloud   │
                    └──────────────────┘
```

## 🚀 **Quick Start**

### 1. **Prerequisites**

- Node.js 18+ and npm
- PostgreSQL 13+
- QuickBooks Online Developer Account
- Genesys Cloud Account

### 2. **Installation**

```bash
# Clone repository
git clone <repository-url>
cd QuickBooks

# Install dependencies
npm install

# Build the application
npm run build
```

### 3. **Environment Setup**

```bash
# Copy environment template
cp env.example .env

# Configure your credentials
# Edit .env with your QBO and Genesys Cloud details
```

### 4. **Database Setup**

```sql
CREATE DATABASE phone_billing_system;
CREATE USER billing_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE phone_billing_system TO billing_user;
```

### 5. **Start the System**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 **Configuration**

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=billing_user
DB_PASSWORD=secure_password
DB_NAME=phone_billing_system

# QuickBooks Online
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_client_secret
QBO_ENVIRONMENT=production
QBO_REDIRECT_URI=https://your-domain.com/qbo-callback

# Genesys Cloud
GENESYS_BASE_URL=https://api.mypurecloud.com
GENESYS_CLIENT_ID=your_genesys_client_id
GENESYS_CLIENT_SECRET=your_genesys_client_secret
GENESYS_ORGANIZATION_ID=your_org_id

# Billing
BILLING_TIMEZONE=America/Los_Angeles
BILLING_CURRENCY=USD
```

## 📱 **API Endpoints**

### Core Endpoints

- `GET /health` - System health check
- `GET /api/v1/dashboard/overview` - System overview
- `GET /api/v1/dashboard/system-status` - System status

### QuickBooks Integration

- `GET /api/v1/qbo/auth` - Get OAuth authorization URL
- `GET /api/v1/qbo/callback` - OAuth callback handler
- `POST /api/v1/qbo/refresh` - Refresh access token
- `GET /api/v1/qbo/token-status` - Token health status

### Genesys Cloud Integration

- `GET /api/v1/genesys/status` - Connection status
- `POST /api/v1/genesys/test-connection` - Test connection
- `GET /api/v1/genesys/call-records` - Get call records
- `GET /api/v1/genesys/analytics` - Get call analytics

### Billing Management

- `GET /api/v1/billing/jobs` - Get billing jobs
- `GET /api/v1/billing/summary` - Billing summary

## 🎯 **Key Features**

### 1. **Automated Billing Scheduler**

- Runs monthly on the 1st at 2:00 AM PST
- Configurable timezone support
- Idempotent execution (prevents duplicate invoices)
- Comprehensive error handling and logging

### 2. **QuickBooks Online Integration**

- OAuth2 authentication with automatic token refresh
- Invoice creation with proper tax codes and memos
- Duplicate invoice prevention
- Sandbox and production environment support

### 3. **Genesys Cloud Phone System**

- Call Detail Records (CDRs) retrieval
- User and queue management
- Call analytics and reporting
- Automatic authentication with client credentials

### 4. **Comprehensive Dashboard**

- Real-time system health monitoring
- Billing job history and status
- Usage analytics and reporting
- System configuration management

### 5. **Production Features**

- Structured logging with rotation
- Health check endpoints
- Error tracking and alerting
- Database connection pooling
- Rate limiting and security

## 📊 **Dashboard Features**

### System Overview

- Total clients and revenue
- Billing job statistics
- Phone usage metrics
- System health status

### Billing Jobs

- Job execution history
- Success/failure rates
- Manual job execution
- Dry-run testing

### System Status

- QBO connection status
- Genesys Cloud status
- Scheduler status
- Active issues and alerts

### Usage Analytics

- Call volume trends
- Client usage patterns
- Revenue projections
- Performance metrics

## 🔄 **Scheduled Jobs**

### Monthly Billing Job

```cron
0 2 1 * *  # 2:00 AM PST on 1st of month
```

**Process:**

1. Fetch phone usage from Genesys Cloud
2. Aggregate minutes per client
3. Calculate billing amounts
4. Create QBO invoices
5. Log results and errors

### Job Monitoring

- Real-time status tracking
- Error notification and alerting
- Manual re-run capabilities
- Comprehensive logging

## 🛡️ **Security Features**

- OAuth2 authentication for QBO
- Client credentials for Genesys Cloud
- Environment variable configuration
- Database connection security
- Rate limiting and validation
- Input sanitization and validation

## 📈 **Performance Features**

- Database connection pooling
- Efficient query optimization
- Pagination for large datasets
- Caching strategies
- Background job processing
- Asynchronous operations

## 🚨 **Error Handling**

- Comprehensive error logging
- Graceful degradation
- Retry mechanisms
- User-friendly error messages
- Error tracking and alerting
- Automatic recovery where possible

## 📝 **Logging**

- Structured JSON logging
- Daily log rotation
- Error log separation
- Performance metrics
- Audit trail
- Debug mode support

## 🧪 **Testing**

### Manual Testing

```bash
# Check system health
curl /api/v1/dashboard/system-status
```

### Integration Testing

- QBO OAuth flow testing
- Genesys Cloud API testing
- Billing job execution testing
- Error scenario testing

## 🚀 **Deployment**

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t phone-billing-system .
docker run -p 3000:3000 --env-file .env phone-billing-system
```

### PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📚 **Documentation**

- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [API Documentation](./docs/API.md) - API reference
- [Configuration Guide](./docs/CONFIG.md) - System configuration
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues

## 🔧 **Development**

### Project Structure

```
src/
├── entities/          # Database entities
├── services/          # Business logic services
├── routes/            # API route handlers
├── jobs/              # Scheduled job definitions
├── config/            # Configuration management
├── utils/             # Utility functions
└── server.ts          # Main server file

frontend/
├── src/
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── stores/        # State management
│   └── App.tsx        # Main app component
```

### Available Scripts

```bash
npm run dev          # Development mode
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
npm run type-check   # TypeScript type checking
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

For support and questions:

1. Check the [documentation](./docs/)
2. Review the [troubleshooting guide](./docs/TROUBLESHOOTING.md)
3. Check system health endpoints
4. Contact the development team

## 🎉 **Status**

✅ **MVP Complete** - Production-ready application  
✅ **QBO Integration** - Full OAuth and invoice creation  
✅ **Genesys Cloud** - Phone system integration  
✅ **Automated Billing** - Monthly scheduled jobs  
✅ **Dashboard** - Comprehensive monitoring  
✅ **Documentation** - Deployment and user guides

---

**Built with ❤️ for automated phone billing**
