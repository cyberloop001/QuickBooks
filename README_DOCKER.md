# QuickBooks Phone Billing System - Docker Deployment

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd QuickBooks
```

### 2. Configure Environment

```bash
cp env.production .env
# Edit .env with your actual values
```

### 3. Deploy Everything

```bash
./deploy.sh
```

## 📋 What Gets Deployed

- **Backend API** (Node.js/TypeScript) - Port 3001
- **Frontend React App** - Accessible via Nginx proxy
- **PostgreSQL Database** - Port 5433
- **Nginx Reverse Proxy** - Ports 80/443

## 🛠️ Common Commands

```bash
# Deploy everything
./deploy.sh

# Check status
./deploy.sh status

# View logs
./deploy.sh logs

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# Clean up everything
./deploy.sh cleanup
```

## 🌐 Access URLs

- **Main Application**: http://localhost:80 (or http://localhost)
- **Backend API**: http://localhost:3001
- **Database**: localhost:5433
- **Nginx**: http://localhost:80

## ⚙️ Environment Variables

Required in `.env`:

- `QBO_CLIENT_ID` - QuickBooks client ID
- `QBO_CLIENT_SECRET` - QuickBooks client secret
- `GENESYS_CLIENT_ID` - Genesys Cloud client ID
- `GENESYS_CLIENT_SECRET` - Genesys Cloud client secret
- `JWT_SECRET` - JWT signing secret

## 🔧 Troubleshooting

```bash
# Check service health
./deploy.sh health

# View detailed logs
docker compose logs -f

# Access database
docker compose exec postgres psql -U postgres -d phone_billing

# Rebuild from scratch
./deploy.sh cleanup
./deploy.sh deploy
```

## 📚 Full Documentation

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for complete deployment guide.

## 🆘 Need Help?

1. Check service logs: `./deploy.sh logs`
2. Verify environment configuration
3. Ensure ports are available
4. Check Docker is running
