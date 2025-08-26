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
- 🎯 **React Frontend**: Modern dashboard built with React 18, TypeScript, and Tailwind CSS
- 🗄️ **PostgreSQL Database**: Robust data storage with TypeORM
- 🐳 **Docker Support**: Complete containerization with docker-compose

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
- PostgreSQL 15+
- Docker and Docker Compose (optional)
- QuickBooks Online Developer Account
- Genesys Cloud Account

### 2. **Installation**

```bash
# Clone repository
git clone <repository-url>
cd QuickBooks

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. **Environment Setup**

```bash
# Copy environment template
cp env.example .env

# Configure your credentials
# Edit .env with your QBO and Genesys Cloud details
```

### 4. **Database Setup**

#### Option A: Docker (Recommended)

```bash
# Start database with Docker
docker-compose up postgres -d
```

#### Option B: Local PostgreSQL

```sql
CREATE DATABASE phone_billing;
CREATE USER billing_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE phone_billing TO billing_user;
```

### 5. **Start the System**

#### Development Mode

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

#### Production Mode

```bash
# Build and start backend
npm run build
npm start

# Build and start frontend
cd frontend
npm run build
```

#### Docker Mode

```bash
# Start entire system with Docker
docker-compose up -d
```

## 🔧 **Configuration**

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=3001
API_BASE_URL=https://your-domain.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=billing_user
DB_PASSWORD=secure_password
DB_NAME=phone_billing
DB_SSL=false

# QuickBooks Online
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_client_secret
QBO_ENVIRONMENT=production
QBO_REDIRECT_URI=https://your-domain.com/qbo-callback
QBO_ACCOUNT_ID=your_account_id
QBO_SCOPE=com.intuit.quickbooks.accounting

# Genesys Cloud
GENESYS_BASE_URL=https://api.mypurecloud.com
GENESYS_CLIENT_ID=your_genesys_client_id
GENESYS_CLIENT_SECRET=your_genesys_client_secret
GENESYS_ORG_ID=your_org_id

# Billing
BILLING_CURRENCY=USD
BILLING_TIMEZONE=America/Los_Angeles
BILLING_ITEM_ID=your_item_id
BILLING_TAX_CODE=your_tax_code

# Security
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# Alerts (Optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
ALERT_EMAIL=alerts@yourdomain.com
SLACK_WEBHOOK_URL=your_slack_webhook
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

### Customer Management

- `GET /api/v1/customers` - Get customer profiles
- `POST /api/v1/customers` - Create customer profile
- `PUT /api/v1/customers/:id` - Update customer profile

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
- Kill switch functionality

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

### Customer Management

- Customer profile management
- Billing preferences
- Usage history
- Contact information

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
- Helmet.js security headers
- CORS configuration
- JWT token support

## 📈 **Performance Features**

- Database connection pooling
- Efficient query optimization
- Pagination for large datasets
- Caching strategies
- Background job processing
- Asynchronous operations
- Redis support (optional)

## 🚨 **Error Handling**

- Comprehensive error logging
- Graceful degradation
- Retry mechanisms
- User-friendly error messages
- Error tracking and alerting
- Automatic recovery where possible
- Structured error responses

## 📝 **Logging**

- Structured JSON logging with Winston
- Daily log rotation
- Error log separation
- Performance metrics
- Audit trail
- Debug mode support
- Configurable log levels

## 🧪 **Testing**

### Manual Testing

```bash
# Check system health
curl http://localhost:3001/health

# Check API status
curl http://localhost:3001/api/v1/dashboard/system-status
```

### Integration Testing

- QBO OAuth flow testing
- Genesys Cloud API testing
- Billing job execution testing
- Error scenario testing

## 🚀 **Deployment**

### Development

```bash
# Backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Production

```bash
# Backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve static files with nginx
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t phone-billing-system .
docker run -p 3001:3001 --env-file .env phone-billing-system
```

### PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📚 **Documentation**

- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Pagination Guide](./PAGINATION_README.md) - API pagination
- [Call Records Pagination](./CALL_RECORDS_PAGINATION_README.md) - Call data handling
- [React Router v7 Upgrade](./REACT_ROUTER_V7_UPGRADE.md) - Frontend routing

## 🔧 **Development**

### Project Structure

```
├── src/                    # Backend source code
│   ├── entities/          # Database entities (TypeORM)
│   │   ├── BillingJob.ts
│   │   ├── ClientBillingResult.ts
│   │   ├── CustomerProfile.ts
│   │   └── PhoneUsage.ts
│   ├── services/          # Business logic services
│   │   ├── BillingService.ts
│   │   ├── CustomerProfileService.ts
│   │   ├── GenesysService.ts
│   │   └── QBOService.ts
│   ├── routes/            # API route handlers
│   │   ├── billing.ts
│   │   ├── customerProfiles.ts
│   │   ├── dashboard.ts
│   │   ├── genesys.ts
│   │   ├── health.ts
│   │   ├── index.ts
│   │   └── qbo.ts
│   ├── jobs/              # Scheduled job definitions
│   ├── config/            # Configuration management
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   └── server.ts          # Main server file
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── BillingJobs.tsx
│   │   │   ├── CustomerProfiles.tsx
│   │   │   ├── GenesysIntegration.tsx
│   │   │   ├── QBOSetup.tsx
│   │   │   └── Settings.tsx
│   │   ├── stores/        # State management (Zustand)
│   │   ├── services/      # API services
│   │   └── App.tsx        # Main app component
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
├── database/              # Database scripts and migrations
├── nginx/                 # Nginx configuration
├── scripts/               # Utility scripts
├── logs/                  # Application logs
├── docker-compose.yml     # Docker services
├── Dockerfile             # Backend container
├── package.json           # Backend dependencies
└── tsconfig.json          # TypeScript configuration
```

### Available Scripts

#### Backend Scripts

```bash
npm run dev          # Development mode with nodemon
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run db:migrate   # Run database migrations
npm run billing:run  # Run billing job manually
```

#### Frontend Scripts

```bash
cd frontend
npm run dev          # Development mode with Vite
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
npm run type-check   # TypeScript type checking
```

### Dependencies

#### Backend Dependencies

- **Framework**: Express.js with TypeScript
- **Database**: TypeORM with PostgreSQL
- **Authentication**: OAuth2 for QBO, Client Credentials for Genesys
- **Scheduling**: Node-cron for job scheduling
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, Rate limiting
- **Validation**: Express-validator

#### Frontend Dependencies

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Charts**: Recharts
- **Forms**: React Hook Form
- **UI Components**: Lucide React icons

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

For support and questions:

1. Check the [documentation](./docs/)
2. Review the troubleshooting guides in the documentation files
3. Check system health endpoints (`/health`, `/api/v1/dashboard/system-status`)
4. Contact the development team

## 🎉 **Status**

✅ **MVP Complete** - Production-ready application  
✅ **QBO Integration** - Full OAuth and invoice creation  
✅ **Genesys Cloud** - Phone system integration  
✅ **Automated Billing** - Monthly scheduled jobs  
✅ **React Dashboard** - Modern, responsive frontend  
✅ **TypeScript Backend** - Type-safe API development  
✅ **Docker Support** - Complete containerization  
✅ **Documentation** - Comprehensive guides and API docs

---

**Built with ❤️ for automated phone billing**

_Last updated: December 2024_
