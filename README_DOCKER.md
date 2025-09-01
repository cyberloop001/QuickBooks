# QuickBooks Phone Billing System - Docker Deployment

Quick reference for Docker deployment with SSL support for `nrmedicalreports.com`.

## 🚀 Quick Start

### 1. Clone and Setup Environment

```bash
git clone <repository>
cd QuickBooks
cp env.production .env
# Edit .env with your configuration
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended - Free)

```bash
chmod +x setup-ssl.sh
./setup-ssl.sh letsencrypt
```

#### Option B: Self-Signed (Development Only)

```bash
chmod +x setup-ssl.sh
./setup-ssl.sh self-signed
```

#### Option C: Commercial Certificate

```bash
mkdir -p nginx/ssl
# Copy your certificates:
cp your-cert.crt nginx/ssl/nrmedicalreports.com.crt
cp your-key.key nginx/ssl/nrmedicalreports.com.key
cp fallback-cert.crt nginx/ssl/default.crt
cp fallback-key.key nginx/ssl/default.key
```

### 3. Deploy Services

```bash
docker compose up -d
```

## 🌐 Access URLs

- **HTTPS (Production)**: https://nrmedicalreports.com
- **HTTP (Redirects to HTTPS)**: http://nrmedicalreports.com
- **API**: https://nrmedicalreports.com/api/v1
- **Health Check**: https://nrmedicalreports.com/health

## 📋 Essential Commands

### Service Management

```bash
# Deploy all services
docker compose up -d

# View logs
docker compose logs -f

# Restart specific service
docker compose restart nginx

# Stop all services
docker compose down

# Rebuild and restart
docker compose build && docker compose up -d
```

### SSL Management

```bash
# Check SSL certificates
./setup-ssl.sh check

# Test SSL configuration
./setup-ssl.sh test

# View nginx logs
docker compose logs nginx
```

### Health Checks

```bash
# Check all services
docker compose ps

# Test endpoints
curl -I https://nrmedicalreports.com/health
curl -I https://nrmedicalreports.com/api/v1

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=nrmedicalreports.com
```

## 🔧 Environment Variables

Key environment variables for production:

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=phone_billing
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Application
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://nrmedicalreports.com

# QuickBooks Online
QBO_CLIENT_ID=your_qbo_client_id
QBO_CLIENT_SECRET=your_qbo_client_secret
QBO_REDIRECT_URI=https://nrmedicalreports.com/auth/qbo/callback

# Genesys Cloud
GENESYS_CLIENT_ID=your_genesys_client_id
GENESYS_CLIENT_SECRET=your_genesys_client_secret
```

## 🚨 Troubleshooting

### SSL Issues

```bash
# Check certificates exist
ls -la nginx/ssl/

# Test nginx config
docker compose exec nginx nginx -t

# View nginx errors
docker compose logs nginx
```

### Database Issues

```bash
# Check database connection
docker compose exec postgres pg_isready -U postgres

# View database logs
docker compose logs postgres
```

### Application Issues

```bash
# Check backend logs
docker compose logs backend

# Check frontend logs
docker compose logs frontend

# Restart problem service
docker compose restart backend
```

## 📞 Support

For detailed setup instructions, see:

- `SSL_SETUP.md` - Complete SSL certificate guide
- `DOCKER_DEPLOYMENT.md` - Comprehensive deployment documentation

## 🔒 Security Features

✅ **HTTPS Only** - All HTTP traffic redirected to HTTPS  
✅ **Modern SSL** - TLS 1.2+ with strong ciphers  
✅ **Security Headers** - HSTS, X-Frame-Options, etc.  
✅ **Domain Validation** - Only nrmedicalreports.com allowed  
✅ **Auto-Renewal** - Let's Encrypt certificates auto-renew

---

**Domain**: nrmedicalreports.com  
**SSL**: Required for production  
**Monitoring**: Built-in health checks
