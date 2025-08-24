# Nginx Configuration

This directory contains the Nginx configuration for the QuickBooks Phone Billing System, providing reverse proxy functionality and SSL termination.

## 📁 Files

- **`nginx.conf`** - Main Nginx configuration file
- **`ssl/`** - Directory for SSL certificates and keys
- **`README.md`** - This documentation file

## 🚀 Quick Start

### Docker Compose (Recommended)

The Nginx service is automatically configured when using Docker Compose:

```bash
# Start all services including Nginx
docker-compose up -d

# Check Nginx status
docker-compose ps nginx
```

### Manual Setup

1. **Install Nginx** (Ubuntu/Debian):

   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Copy configuration**:

   ```bash
   sudo cp nginx.conf /etc/nginx/nginx.conf
   ```

3. **Start Nginx**:
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

## 🏗️ Configuration Overview

### Current Setup

The current `nginx.conf` provides:

- **Reverse Proxy**: Routes traffic to the Node.js backend
- **Load Balancing**: Single upstream server (expandable)
- **Header Forwarding**: Preserves client information
- **Port 80**: HTTP traffic handling

### Configuration Details

```nginx
upstream app_upstream {
  server host.docker.internal:3001;  # Backend service
}

server {
  listen 80;                         # HTTP port
  server_name _;                     # All hostnames

  location / {
    proxy_pass http://app_upstream;  # Route to backend
    # Forward client headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 🔒 SSL Configuration

### SSL Certificate Setup

1. **Obtain SSL certificates** (Let's Encrypt, commercial CA, or self-signed)
2. **Place certificates** in the `ssl/` directory:

   ```
   ssl/
   ├── cert.pem          # Certificate file
   ├── key.pem           # Private key
   └── chain.pem         # Certificate chain (optional)
   ```

3. **Update nginx.conf** to include SSL:

   ```nginx
   server {
     listen 443 ssl http2;
     server_name your-domain.com;

     ssl_certificate /etc/nginx/ssl/cert.pem;
     ssl_certificate_key /etc/nginx/ssl/key.pem;

     # SSL configuration
     ssl_protocols TLSv1.2 TLSv1.3;
     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
     ssl_prefer_server_ciphers off;

     location / {
       proxy_pass http://app_upstream;
       # ... other proxy settings
     }
   }

   # Redirect HTTP to HTTPS
   server {
     listen 80;
     server_name your-domain.com;
     return 301 https://$server_name$request_uri;
   }
   ```

## 🚀 Production Deployment

### Environment-Specific Configuration

#### Development

```nginx
upstream app_upstream {
  server localhost:3001;  # Local backend
}
```

#### Production

```nginx
upstream app_upstream {
  server 127.0.0.1:3001;  # Production backend
  # Add more servers for load balancing
  # server 127.0.0.1:3002;
}
```

### Load Balancing

For high availability, add multiple backend servers:

```nginx
upstream app_upstream {
  server 127.0.0.1:3001 weight=3;
  server 127.0.0.1:3002 weight=2;
  server 127.0.0.1:3003 weight=1;

  # Health checks
  keepalive 32;
}
```

### Rate Limiting

Add rate limiting for API protection:

```nginx
# Rate limiting configuration
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
  limit_req zone=api burst=20 nodelay;
  proxy_pass http://app_upstream;
  # ... other settings
}
```

## 🔧 Advanced Configuration

### Gzip Compression

Enable compression for better performance:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types
  text/plain
  text/css
  text/xml
  text/javascript
  application/javascript
  application/xml+rss
  application/json;
```

### Caching

Add caching for static assets:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### Security Headers

Add security headers:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 🐳 Docker Integration

### Docker Compose

The Nginx service in `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    - ./nginx/ssl:/etc/nginx/ssl
  depends_on:
    - app
  restart: unless-stopped
```

### Custom Dockerfile

For custom Nginx builds:

```dockerfile
FROM nginx:alpine

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL certificates
COPY ssl/ /etc/nginx/ssl/

# Expose ports
EXPOSE 80 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 🔍 Monitoring and Logs

### Access Logs

Enable access logging:

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for"';

access_log /var/log/nginx/access.log main;
```

### Error Logs

Enable error logging:

```nginx
error_log /var/log/nginx/error.log warn;
```

### Health Checks

Add health check endpoint:

```nginx
location /health {
  access_log off;
  return 200 "healthy\n";
  add_header Content-Type text/plain;
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**

   - Check if backend service is running
   - Verify port 3001 is accessible
   - Check firewall settings

2. **SSL Errors**

   - Verify certificate paths
   - Check certificate validity
   - Ensure proper permissions

3. **Permission Denied**
   - Check file permissions
   - Verify Nginx user access
   - Check SELinux settings (if applicable)

### Debug Commands

```bash
# Test configuration
nginx -t

# Check Nginx status
systemctl status nginx

# View logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Check ports
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Docker Nginx](https://hub.docker.com/_/nginx)
- [Let's Encrypt](https://letsencrypt.org/)

## 🔄 Updates and Maintenance

### Configuration Updates

1. **Edit nginx.conf**
2. **Test configuration**: `nginx -t`
3. **Reload Nginx**: `nginx -s reload`

### SSL Certificate Renewal

1. **Update certificates** in `ssl/` directory
2. **Reload Nginx**: `nginx -s reload`
3. **Verify renewal**: Check certificate validity

---

**Last updated: December 2024**
