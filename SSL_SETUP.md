# SSL Certificate Setup for nrmedicalreports.com

This guide explains how to set up SSL certificates for your domain `nrmedicalreports.com` with the Nginx configuration.

## 📋 Prerequisites

- Domain `nrmedicalreports.com` pointing to your server's IP address
- Docker and Docker Compose installed
- Port 80 and 443 accessible from the internet

## 🔒 SSL Certificate Options

### Option 1: Let's Encrypt (Recommended - Free)

Let's Encrypt provides free SSL certificates that auto-renew.

#### Step 1: Install Certbot

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install certbot

# On CentOS/RHEL
sudo yum install certbot
```

#### Step 2: Stop Docker Services (temporarily)

```bash
docker compose down
```

#### Step 3: Generate Certificate

```bash
# Generate certificate for your domain
sudo certbot certonly --standalone -d nrmedicalreports.com -d www.nrmedicalreports.com

# Follow the prompts to enter your email and agree to terms
```

#### Step 4: Copy Certificates to Project

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates (replace with your actual paths)
sudo cp /etc/letsencrypt/live/nrmedicalreports.com/fullchain.pem nginx/ssl/nrmedicalreports.com.crt
sudo cp /etc/letsencrypt/live/nrmedicalreports.com/privkey.pem nginx/ssl/nrmedicalreports.com.key

# Set proper permissions
sudo chmod 644 nginx/ssl/nrmedicalreports.com.crt
sudo chmod 600 nginx/ssl/nrmedicalreports.com.key
sudo chown $USER:$USER nginx/ssl/*
```

#### Step 5: Create Default Certificate (for fallback)

```bash
# Generate self-signed certificate for unknown domains
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/default.key \
    -out nginx/ssl/default.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=default"

sudo chmod 644 nginx/ssl/default.crt
sudo chmod 600 nginx/ssl/default.key
sudo chown $USER:$USER nginx/ssl/default.*
```

#### Step 6: Set up Auto-Renewal

```bash
# Add cron job for auto-renewal
sudo crontab -e

# Add this line to renew certificates twice daily
0 0,12 * * * /usr/bin/certbot renew --quiet && docker compose restart nginx
```

### Option 2: Commercial SSL Certificate

If you have a commercial SSL certificate:

#### Step 1: Place Certificate Files

```bash
# Copy your certificate files to the SSL directory
cp your-certificate.crt nginx/ssl/nrmedicalreports.com.crt
cp your-private-key.key nginx/ssl/nrmedicalreports.com.key
cp default-certificate.crt nginx/ssl/default.crt
cp default-private-key.key nginx/ssl/default.key

# Set proper permissions
chmod 644 nginx/ssl/*.crt
chmod 600 nginx/ssl/*.key
```

### Option 3: Self-Signed Certificate (Development Only)

⚠️ **Only for development/testing - browsers will show warnings**

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate for main domain
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/nrmedicalreports.com.key \
    -out nginx/ssl/nrmedicalreports.com.crt \
    -subj "/C=US/ST=CA/L=San Francisco/O=My Company/CN=nrmedicalreports.com"

# Generate self-signed certificate for default
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/default.key \
    -out nginx/ssl/default.crt \
    -subj "/C=US/ST=CA/L=San Francisco/O=My Company/CN=default"

# Set permissions
chmod 644 nginx/ssl/*.crt
chmod 600 nginx/ssl/*.key
```

## 🚀 Deployment

After setting up certificates:

```bash
# Start the services
docker compose up -d

# Check nginx status
docker compose logs nginx

# Test the configuration
curl -I https://nrmedicalreports.com
```

## 🔧 Docker Compose Configuration

The current `docker-compose.yml` should already include the SSL volume mount:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    - ./nginx/ssl:/etc/nginx/ssl # SSL certificates
```

## 🧪 Testing SSL Configuration

### Test HTTP to HTTPS Redirect

```bash
curl -I http://nrmedicalreports.com
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://nrmedicalreports.com/
```

### Test HTTPS

```bash
curl -I https://nrmedicalreports.com
# Should return: HTTP/2 200
```

### Test SSL Grade

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=nrmedicalreports.com

## 📁 Final SSL Directory Structure

```
nginx/ssl/
├── nrmedicalreports.com.crt  # Main SSL certificate
├── nrmedicalreports.com.key  # Main private key
├── default.crt               # Fallback certificate
└── default.key               # Fallback private key
```

## 🔒 Security Features Included

The Nginx configuration includes:

- ✅ **HTTP to HTTPS redirect** - All HTTP traffic redirected to HTTPS
- ✅ **Modern SSL protocols** - TLS 1.2 and 1.3 only
- ✅ **Strong ciphers** - Secure cipher suites
- ✅ **Security headers** - HSTS, X-Frame-Options, etc.
- ✅ **HTTP/2 support** - Better performance
- ✅ **Fallback handling** - Unknown domains get blocked

## 🚨 Troubleshooting

### Certificate Not Found Error

```bash
# Check if certificates exist
ls -la nginx/ssl/

# Check file permissions
ls -la nginx/ssl/nrmedicalreports.com.*
```

### Nginx Won't Start

```bash
# Check nginx configuration syntax
docker compose exec nginx nginx -t

# Check detailed nginx logs
docker compose logs nginx
```

### Domain Not Resolving

```bash
# Check DNS resolution
nslookup nrmedicalreports.com

# Check if domain points to your server
dig nrmedicalreports.com
```

## 📞 Need Help?

If you encounter issues:

1. Check the nginx logs: `docker compose logs nginx`
2. Verify DNS settings point to your server
3. Ensure ports 80 and 443 are open
4. Test certificate validity: `openssl x509 -in nginx/ssl/nrmedicalreports.com.crt -text -noout`

---

**Note**: Replace `nrmedicalreports.com` with your actual domain name if different.
