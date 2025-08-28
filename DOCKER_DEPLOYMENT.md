# Docker Deployment Guide

This guide explains how to deploy the QuickBooks Phone Billing System using Docker Compose, including both the backend API and frontend React application.

## Overview

The system consists of four main services:

- **Backend API** (Node.js/TypeScript) - Port 3001
- **Frontend React App** (Vite/React) - Internal port 80, accessible via Nginx proxy
- **PostgreSQL Database** - Port 5433
- **Nginx Reverse Proxy** - Ports 80/443

## Prerequisites

- Docker and Docker Compose installed
- Git repository cloned
- Environment variables configured

## Quick Start

### 1. Environment Setup

Copy the production environment template and configure your values:

```bash
cp env.production .env
```

Edit `.env` with your actual configuration values:

- QuickBooks Online credentials
- Genesys Cloud API credentials
- Database passwords
- JWT secrets

### 2. Build and Deploy

```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check service status
docker compose ps
```

### 3. Access the Application

- **Main Application**: http://localhost:80 (or http://localhost)
- **Backend API**: http://localhost:3001
- **Database**: localhost:5433 (postgres/phone_billing)
- **Nginx**: http://localhost:80

## Service Details

### Backend Service

The backend service runs the Node.js API with:

- TypeScript compilation
- Production dependencies only
- Health checks
- Log volume mounting
- Environment variable injection

**Key Features:**

- Automatic TypeScript compilation
- Production-optimized dependencies
- Health check endpoint at `/health`
- Log persistence to host machine

### Frontend Service

The frontend service serves the React application:

- Multi-stage build (Node.js → Nginx)
- Optimized production build
- Static file serving via Nginx
- Client-side routing support
- Internal access only (routed through main Nginx)

**Build Process:**

1. Node.js builder stage compiles TypeScript and builds with Vite
2. Nginx stage serves the built static files
3. Custom Nginx configuration handles React Router

### Database Service

PostgreSQL 15 with:

- Persistent data storage
- Initial schema from `database/init.sql`
- Health checks
- Exposed port for external access

### Nginx Service

Reverse proxy configuration:

- Routes traffic to appropriate services
- SSL termination (when configured)
- Static file serving
- Load balancing capabilities
- Routes API calls to backend
- Routes all other requests to frontend

## Health Checks

All services include health checks:

- **Backend**: HTTP endpoint at `/health`
- **Frontend**: HTTP endpoint at `/health`
- **Database**: PostgreSQL connection test
- **Nginx**: HTTP endpoint at `/health`

## Environment Variables

### Required Variables

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=phone_billing
DB_USER=postgres
DB_PASSWORD=postgres

# QuickBooks
QBO_CLIENT_ID=your_client_id
QBO_CLIENT_SECRET=your_client_secret
QBO_ENVIRONMENT=sandbox

# Genesys Cloud
GENESYS_CLIENT_ID=your_genesys_client_id
GENESYS_CLIENT_SECRET=your_genesys_client_secret
```

### Optional Variables

```bash
# JWT
JWT_SECRET=your_jwt_secret

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Security
CORS_ORIGIN=http://localhost
```

## Production Considerations

### Security

1. **Change default passwords** in production
2. **Use strong JWT secrets**
3. **Configure proper CORS origins**
4. **Enable SSL/TLS** via Nginx
5. **Use environment-specific configurations**

### Performance

1. **Database connection pooling**
2. **Nginx caching** for static assets
3. **Gzip compression** enabled
4. **Health check monitoring**

### Monitoring

1. **Service health checks**
2. **Log aggregation**
3. **Database performance monitoring**
4. **Application metrics**

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3001, 5433, 80, 443 are available
2. **Database connection**: Check PostgreSQL health and credentials
3. **Build failures**: Verify Node.js version compatibility
4. **Environment variables**: Ensure `.env` file is properly configured

### Debug Commands

```bash
# Check service logs
docker compose logs [service_name]

# Access running container
docker compose exec [service_name] sh

# Restart specific service
docker compose restart [service_name]

# View resource usage
docker compose top

# Clean up and rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Database Issues

```bash
# Access PostgreSQL
docker compose exec postgres psql -U postgres -d phone_billing

# Check database status
docker compose exec postgres pg_isready -U postgres

# View database logs
docker compose logs postgres
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend service
docker compose up -d --scale backend=3

# Scale with load balancer
# Update nginx.conf to include upstream backend servers
```

### Resource Limits

Add resource constraints in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "0.5"
        reservations:
          memory: 512M
          cpus: "0.25"
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U postgres phone_billing > backup.sql

# Restore backup
docker compose exec -T postgres psql -U postgres phone_billing < backup.sql
```

### Volume Backup

```bash
# Backup PostgreSQL data
docker run --rm -v phone-billing_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore PostgreSQL data
docker run --rm -v phone-billing_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Maintenance

### Regular Tasks

1. **Update dependencies**: Rebuild containers with `--no-cache`
2. **Database maintenance**: Run VACUUM and ANALYZE
3. **Log rotation**: Monitor log file sizes
4. **Security updates**: Update base images regularly

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Run database migrations
docker compose exec backend npm run db:migrate
```

## Support

For deployment issues:

1. Check service logs: `docker compose logs -f`
2. Verify environment configuration
3. Check network connectivity between services
4. Review health check status

## Architecture Diagram

```
Internet → Nginx (80/443) → Frontend (internal:80) + Backend (3001)
                                    ↓
                              PostgreSQL (5433)
```

The system uses a bridge network (`phone-billing-network`) for inter-service communication, with Nginx acting as the entry point and routing traffic appropriately. The frontend is only accessible through the main Nginx proxy, while the backend API is accessible both directly and through the proxy.
