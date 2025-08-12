# Phone Billing System MVP

A production-ready internal web tool that automates phone usage billing and QuickBooks Online (QBO) invoice creation. The system pulls per-client minute usage from a phone system API, calculates charges, and creates QBO invoices with an option to auto-charge.

## 🚀 Features

### Core Functionality

- **Phone System Integration**: REST API integration for usage CDRs (Call Detail Records)
- **QuickBooks Online Integration**: OAuth2-based QBO API v3 integration
- **Automated Billing**: Scheduled monthly billing jobs with timezone-safe processing
- **Flat Rate Billing**: Per-minute rating engine (v1)
- **Client Mapping**: Stable mapping between Phone System Client ID and QBO Customer ID
- **Invoice Creation**: Draft invoice creation in QBO with correct Items, tax codes, and memos
- **Idempotency**: Prevents duplicate invoices on job re-runs

### Dashboard & Management

- **Modern Web Dashboard**: React-based responsive interface
- **Real-time Monitoring**: Live job status, totals, and error flags
- **Manual Controls**: Manual job re-run, global kill switch
- **Client Management**: Add, edit, and manage client mappings
- **Settings Configuration**: System parameters and integration settings

### Reliability & Security

- **Scheduled Jobs**: Automated monthly billing using node-cron
- **Error Handling**: Retries with exponential backoff, structured logging
- **Alerts**: Email and Slack notifications on failures
- **Security**: Secrets in environment variables, least-privilege scopes
- **Audit Logging**: Comprehensive logging for operations and debugging

## 🏗️ Architecture

### Backend Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with RESTful API design
- **Database**: PostgreSQL with TypeORM
- **Scheduling**: node-cron for automated jobs
- **HTTP Client**: Axios with retry logic
- **Logging**: Winston with daily rotation
- **Authentication**: OAuth2 for QBO, API keys for phone system

### Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand with persistence
- **Routing**: React Router for navigation
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React icon library

### Infrastructure

- **Containerization**: Docker and Docker Compose
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session and job state
- **Reverse Proxy**: Nginx for production deployment
- **Environment**: Development and production configurations

## 📁 Project Structure

```
QuickBooks/
├── src/                    # Backend source code
│   ├── config/            # Configuration management
│   ├── entities/          # TypeORM database entities
│   ├── services/          # Business logic services
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── jobs/              # Scheduled job management
│   └── utils/             # Utility functions
├── frontend/              # React frontend application
│   ├── src/               # Frontend source code
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # State management
│   │   └── App.tsx        # Main application
│   ├── public/            # Static assets
│   └── dist/              # Production build output
├── docker-compose.yml     # Local development environment
├── Dockerfile             # Backend container
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Docker and Docker Compose (optional)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd QuickBooks
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Or use Docker Compose
docker-compose up -d postgres
```

### 5. Access the Application

- **Backend API**: http://localhost:3001
- **Frontend Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:3001/api/health

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=phone_billing
DB_USER=postgres
DB_PASSWORD=your_password

# QuickBooks Online
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_client_secret
QBO_REDIRECT_URI=http://localhost:3001/api/qbo/callback
QBO_ENVIRONMENT=sandbox

# Phone System API
PHONE_API_BASE_URL=https://api.phonesystem.com
PHONE_API_KEY=your_phone_api_key
PHONE_API_SECRET=your_phone_api_secret

# Billing Configuration
BILLING_RATE_PER_MINUTE=1.00
BILLING_TIMEZONE=America/Los_Angeles
BILLING_ITEM_ID=your_qbo_item_id
BILLING_TAX_CODE=your_qbo_tax_code
```

### QBO Setup

1. **Create QBO App**: Register at [Intuit Developer](https://developer.intuit.com/)
2. **Configure OAuth**: Set redirect URI and scopes
3. **Get Credentials**: Note Client ID and Client Secret
4. **Test in Sandbox**: Use sandbox environment for development

### Phone System API

1. **API Documentation**: Review your phone system's API docs
2. **Authentication**: Configure API keys and endpoints
3. **Usage Endpoints**: Ensure CDR data is accessible
4. **Rate Limits**: Understand API call limitations

## 📊 Usage

### Dashboard Access

1. **Login**: Use any email/password (demo mode)
2. **Navigate**: Use sidebar for different sections
3. **Monitor**: View real-time billing job status
4. **Manage**: Add/edit clients and run manual jobs

### Running Billing Jobs

1. **Automatic**: Monthly jobs run automatically on the 1st at 2:00 AM PST
2. **Manual**: Use dashboard to run jobs for specific periods
3. **Dry Run**: Test billing logic without creating invoices
4. **Monitoring**: Track job progress and results in real-time

### Client Management

1. **Add Clients**: Create new client records with mapping
2. **Phone System ID**: Enter the client ID from your phone system
3. **QBO Customer ID**: Enter the corresponding QBO customer ID
4. **Contact Info**: Add billing address and contact details

## 🧪 Testing

### Backend Testing

```bash
# Run unit tests
npm test

# Run billing job manually
npm run billing:run -- --dry-run --start-date 2025-01-01 --end-date 2025-01-31

# Test CSV processing
npm run billing:run -- --csv-file ./test-data.csv --output-file ./results.json
```

### Frontend Testing

```bash
cd frontend

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

### Integration Testing

1. **QBO Sandbox**: Test invoice creation in sandbox environment
2. **Phone API**: Verify usage data retrieval
3. **End-to-End**: Run complete billing cycle
4. **Error Scenarios**: Test failure handling and recovery

## 🚀 Deployment

### Production Deployment

1. **Environment**: Set NODE_ENV=production
2. **Database**: Use production PostgreSQL instance
3. **Secrets**: Store sensitive data in environment variables
4. **SSL**: Configure HTTPS for production
5. **Monitoring**: Set up logging and alerting

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Or build individual containers
docker build -t phone-billing-backend .
docker build -t phone-billing-frontend ./frontend
```

### Cloud Deployment

- **AWS**: Use Lightsail, ECS, or EC2
- **Azure**: App Service or Container Instances
- **Google Cloud**: Compute Engine or Cloud Run
- **Heroku**: Container deployment
- **DigitalOcean**: Droplet or App Platform

## 📈 Monitoring & Maintenance

### Health Checks

- **API Endpoints**: `/health`, `/health/detailed`
- **Database**: Connection status and query performance
- **External APIs**: QBO and phone system connectivity
- **Job Status**: Scheduled job execution monitoring

### Logging

- **Application Logs**: Winston-based structured logging
- **Access Logs**: HTTP request/response logging
- **Error Logs**: Detailed error tracking and stack traces
- **Audit Logs**: User actions and system changes

### Alerts

- **Email Notifications**: Job completion/failure alerts
- **Slack Integration**: Real-time system status updates
- **Error Thresholds**: Automatic alerting on repeated failures
- **Performance Monitoring**: Response time and throughput tracking

## 🔒 Security

### Authentication & Authorization

- **API Security**: Rate limiting and request validation
- **Data Protection**: Environment variable secrets management
- **Access Control**: Role-based permissions (can be extended)
- **Audit Trail**: Comprehensive logging of all operations

### Data Security

- **Database**: Encrypted connections and access controls
- **API Keys**: Secure storage and rotation procedures
- **OAuth2**: Secure QBO integration with token refresh
- **HTTPS**: TLS encryption for all communications

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection**: Check PostgreSQL service and credentials
2. **QBO Authentication**: Verify OAuth configuration and tokens
3. **Phone API**: Confirm API endpoints and authentication
4. **Job Failures**: Review logs for specific error messages
5. **Frontend Issues**: Check browser console and network requests

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check job scheduler status
curl http://localhost:3001/api/billing/status

# Test API connections
curl http://localhost:3001/api/health/detailed
```

### Support Resources

- **Logs**: Check application and system logs
- **Documentation**: Review API documentation and examples
- **Configuration**: Verify environment variables and settings
- **Network**: Test external API connectivity

## 🔮 Future Enhancements

### Planned Features

- **Multi-tenant Support**: Multiple company billing management
- **Advanced Billing**: Tiered pricing and volume discounts
- **Payment Integration**: Auto-charging and payment processing
- **Reporting**: Advanced analytics and custom reports
- **Mobile App**: Native mobile application for monitoring

### Scalability Improvements

- **Microservices**: Break down into smaller, focused services
- **Message Queues**: Redis-based job queuing system
- **Caching**: Redis caching for frequently accessed data
- **Load Balancing**: Multiple backend instances
- **Database Sharding**: Horizontal database scaling

## 📚 API Documentation

### Core Endpoints

- `GET /api/health` - System health check
- `GET /api/billing/jobs` - List billing jobs
- `POST /api/billing/run` - Run manual billing job
- `GET /api/clients` - List clients
- `POST /api/clients` - Create new client
- `GET /api/settings` - System configuration

### Authentication

- **QBO OAuth**: `/api/qbo/auth` and `/api/qbo/callback`
- **Phone System**: API key authentication in headers
- **Session Management**: JWT tokens for user sessions

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes** and test thoroughly
4. **Commit changes**: `git commit -am 'Add new feature'`
5. **Push to branch**: `git push origin feature/new-feature`
6. **Create pull request**

## 📄 License

This project is proprietary software developed for internal business automation.

## 🆘 Support

For support and questions:

- **Documentation**: Review this README and component documentation
- **Issues**: Report bugs and feature requests
- **Development**: Contact the development team
- **Operations**: Follow the operational runbook

---

**Built with ❤️ for automated business efficiency**

_Phone Billing System MVP - Production Ready_
