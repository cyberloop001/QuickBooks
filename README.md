# Phone Billing System

A production-ready MVP for automated phone usage billing with QuickBooks Online integration.

## 🚀 Features

- **Automated Billing**: Monthly scheduled billing jobs with timezone-safe processing
- **QBO Integration**: Full OAuth2 integration with QuickBooks Online API v3
- **Phone System API**: REST API integration for usage data retrieval
- **Idempotency**: Prevents duplicate invoices with comprehensive deduplication
- **Dashboard**: Real-time monitoring and management interface
- **Kill Switch**: Emergency system shutdown capability
- **Comprehensive Logging**: Structured logging with file rotation
- **Rate Limiting**: API protection against abuse
- **Error Handling**: Robust error handling with retries and backoff

## 🏗️ Architecture

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL with TypeORM
- **Scheduling**: Node-cron for automated jobs
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, rate limiting
- **API**: RESTful API with validation

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- QuickBooks Online Developer Account
- Phone System API Access

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd phone-billing-system
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**

   ```bash
   # Create PostgreSQL database
   createdb phone_billing

   # Run migrations (in development)
   npm run db:migrate
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=phone_billing
DB_USER=postgres
DB_PASSWORD=your_password

# QuickBooks Online
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_client_secret
QBO_REDIRECT_URI=http://localhost:3001/auth/qbo/callback
QBO_ENVIRONMENT=sandbox
QBO_ACCOUNT_ID=your_qbo_account_id

# Phone System
PHONE_API_BASE_URL=https://api.phonesystem.com
PHONE_API_KEY=your_phone_api_key
PHONE_API_SECRET=your_phone_api_secret

# Billing
BILLING_RATE_PER_MINUTE=1.00
BILLING_TIMEZONE=America/Los_Angeles
BILLING_ITEM_ID=PHONE_USAGE_ITEM_ID
```

## 🚀 Usage

### Start the server

```bash
# Development
npm run dev

# Production
npm start
```

### Run billing jobs

```bash
# Run monthly billing (previous month)
npm run billing:run

# Run billing for specific period
npm run billing:run --start-date 2025-07-01 --end-date 2025-07-31

# Dry run (no invoices created)
npm run billing:run --dry-run

# Process CSV file
npm run billing:run --csv-file ./usage.csv --output-file ./results.json

# Run for specific client
npm run billing:run --client-id PS-1001
```

### API Endpoints

- `GET /health` - Health check
- `GET /api/v1/billing/jobs` - List billing jobs
- `POST /api/v1/billing/run` - Run billing job
- `GET /api/v1/clients` - List clients
- `GET /api/v1/qbo/auth` - QBO OAuth URL
- `GET /api/v1/dashboard/overview` - System overview

## 📊 CSV Processing

The system can process CSV files with phone usage data:

```csv
call_id,client_id,started_at,ended_at,billable_seconds,started_pst,ended_pst
PS-1001-5012,PS-1001,2025-07-03 19:47:00+00:00,2025-07-03 19:52:41+00:00,341,2025-07-03 12:47:00-07:00,2025-07-03 12:52:41-07:00
```

Process with:

```bash
npm run billing:run --csv-file ./usage.csv --output-file ./results.json
```

## 🔐 QuickBooks Online Setup

1. **Create QBO App**

   - Go to [QBO Developer Portal](https://developer.intuit.com/)
   - Create new app
   - Set OAuth2 redirect URI
   - Note Client ID and Secret

2. **Configure Environment**

   ```bash
   QBO_CLIENT_ID=your_client_id
   QBO_CLIENT_SECRET=your_client_secret
   QBO_REDIRECT_URI=http://localhost:3001/api/v1/qbo/auth/callback
   QBO_ENVIRONMENT=sandbox
   ```

3. **Authorize Access**
   - Visit `/api/v1/qbo/auth`
   - Complete OAuth flow
   - Store tokens securely

## 🗄️ Database Schema

### Core Entities

- **Client**: Maps phone system clients to QBO customers
- **PhoneUsage**: Stores phone usage records
- **BillingJob**: Tracks billing job executions

### Key Fields

- `phoneSystemClientId`: Phone system identifier
- `qboCustomerId`: QuickBooks customer ID
- `billableSeconds`: Usage in seconds
- `jobId`: Unique billing job identifier

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Test specific file
npm test -- --testNamePattern="BillingService"
```

## 📝 Logging

Logs are stored in `./logs/` with daily rotation:

- `combined-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only

## 🚨 Monitoring & Alerts

### Health Checks

- `/health` - Basic health
- `/health/detailed` - Comprehensive status
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Dashboard

- `/api/v1/dashboard/overview` - System overview
- `/api/v1/dashboard/metrics` - Performance metrics
- `/api/v1/dashboard/alerts` - System alerts

### Kill Switch

Emergency system shutdown:

```bash
# Enable
curl -X POST http://localhost:3001/api/v1/dashboard/kill-switch \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Emergency maintenance"}'

# Disable
curl -X POST http://localhost:3001/api/v1/dashboard/kill-switch \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## 🔒 Security Features

- **Rate Limiting**: Configurable API rate limits
- **Input Validation**: Express-validator for all inputs
- **CORS Protection**: Configurable cross-origin settings
- **Helmet**: Security headers
- **Environment Variables**: Secure configuration management

## 📦 Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment-Specific Configs

```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Production
NODE_ENV=production
LOG_LEVEL=info
KILL_SWITCH_ENABLED=false
```

## 🚀 Production Checklist

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

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Check PostgreSQL service
   - Verify connection credentials
   - Check firewall settings

2. **QBO Authentication Failed**

   - Verify OAuth credentials
   - Check redirect URI configuration
   - Ensure app is approved

3. **Phone System API Errors**
   - Verify API credentials
   - Check network connectivity
   - Review API rate limits

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Check logs
tail -f logs/combined-$(date +%Y-%m-%d).log
```

## 📚 API Documentation

### Billing Endpoints

| Method | Endpoint                 | Description           |
| ------ | ------------------------ | --------------------- |
| GET    | `/api/v1/billing/jobs`   | List billing jobs     |
| POST   | `/api/v1/billing/run`    | Run billing job       |
| GET    | `/api/v1/billing/status` | Billing system status |

### Client Management

| Method | Endpoint              | Description   |
| ------ | --------------------- | ------------- |
| GET    | `/api/v1/clients`     | List clients  |
| POST   | `/api/v1/clients`     | Create client |
| PUT    | `/api/v1/clients/:id` | Update client |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the logs for error details
- Review the troubleshooting section
- Contact the development team

## 🔄 Changelog

### v1.0.0

- Initial release
- Core billing functionality
- QBO integration
- Phone system API integration
- Automated scheduling
- Dashboard and monitoring
- Kill switch functionality
