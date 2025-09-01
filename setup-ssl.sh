#!/bin/bash

# SSL Setup Script for nrmedicalreports.com
# This script helps you set up SSL certificates for your domain

set -e

DOMAIN="nrmedicalreports.com"
SSL_DIR="nginx/ssl"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 SSL Certificate Setup for $DOMAIN${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create SSL directory
create_ssl_dir() {
    echo -e "${YELLOW}📁 Creating SSL directory...${NC}"
    mkdir -p "$SSL_DIR"
    echo "✅ SSL directory created at $SSL_DIR"
}

# Function to generate self-signed certificates (for development)
generate_self_signed() {
    echo -e "${YELLOW}🔧 Generating self-signed certificates...${NC}"
    
    # Main domain certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/$DOMAIN.key" \
        -out "$SSL_DIR/$DOMAIN.crt" \
        -subj "/C=US/ST=CA/L=San Francisco/O=NR Medical Reports/CN=$DOMAIN"
    
    # Default certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/default.key" \
        -out "$SSL_DIR/default.crt" \
        -subj "/C=US/ST=CA/L=San Francisco/O=Default/CN=default"
    
    # Set proper permissions
    chmod 644 "$SSL_DIR"/*.crt
    chmod 600 "$SSL_DIR"/*.key
    
    echo "✅ Self-signed certificates generated"
    echo -e "${RED}⚠️  Note: Self-signed certificates will show browser warnings${NC}"
}

# Function to setup Let's Encrypt certificates
setup_letsencrypt() {
    if ! command_exists certbot; then
        echo -e "${RED}❌ Certbot not found. Please install it first:${NC}"
        echo "   Ubuntu/Debian: sudo apt install certbot"
        echo "   CentOS/RHEL:   sudo yum install certbot"
        exit 1
    fi
    
    echo -e "${YELLOW}🔧 Setting up Let's Encrypt certificate...${NC}"
    echo "This will:"
    echo "1. Stop Docker services temporarily"
    echo "2. Generate SSL certificate"
    echo "3. Copy certificates to project"
    echo "4. Restart services"
    echo ""
    
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    
    # Stop services
    echo "Stopping Docker services..."
    docker compose down
    
    # Generate certificate
    echo "Generating certificate..."
    sudo certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN"
    
    # Copy certificates
    echo "Copying certificates..."
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/$DOMAIN.crt"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/$DOMAIN.key"
    
    # Generate default certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/default.key" \
        -out "$SSL_DIR/default.crt" \
        -subj "/C=US/ST=CA/L=San Francisco/O=Default/CN=default"
    
    # Set permissions
    sudo chmod 644 "$SSL_DIR"/*.crt
    sudo chmod 600 "$SSL_DIR"/*.key
    sudo chown "$USER:$USER" "$SSL_DIR"/*
    
    echo "✅ Let's Encrypt certificates configured"
    
    # Setup auto-renewal
    echo "Setting up auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 0,12 * * * /usr/bin/certbot renew --quiet && cd $(pwd) && docker compose restart nginx") | crontab -
    echo "✅ Auto-renewal configured"
}

# Function to check existing certificates
check_certificates() {
    echo -e "${YELLOW}🔍 Checking existing certificates...${NC}"
    
    if [ -f "$SSL_DIR/$DOMAIN.crt" ] && [ -f "$SSL_DIR/$DOMAIN.key" ]; then
        echo "✅ Main certificate exists: $SSL_DIR/$DOMAIN.crt"
        
        # Check expiration
        expires=$(openssl x509 -enddate -noout -in "$SSL_DIR/$DOMAIN.crt" | cut -d= -f2)
        echo "   Expires: $expires"
    else
        echo "❌ Main certificate not found"
    fi
    
    if [ -f "$SSL_DIR/default.crt" ] && [ -f "$SSL_DIR/default.key" ]; then
        echo "✅ Default certificate exists: $SSL_DIR/default.crt"
    else
        echo "❌ Default certificate not found"
    fi
}

# Function to test SSL configuration
test_ssl() {
    echo -e "${YELLOW}🧪 Testing SSL configuration...${NC}"
    
    # Start services if not running
    docker compose up -d
    
    # Wait a moment for services to start
    sleep 5
    
    # Test nginx configuration
    if docker compose exec nginx nginx -t >/dev/null 2>&1; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors"
        docker compose exec nginx nginx -t
        return 1
    fi
    
    echo "🎉 SSL setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Ensure your domain $DOMAIN points to this server"
    echo "2. Test HTTPS: https://$DOMAIN"
    echo "3. Check SSL grade: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
}

# Main menu
case "${1:-}" in
    "letsencrypt")
        create_ssl_dir
        setup_letsencrypt
        test_ssl
        ;;
    "self-signed")
        create_ssl_dir
        generate_self_signed
        test_ssl
        ;;
    "check")
        check_certificates
        ;;
    "test")
        test_ssl
        ;;
    *)
        echo "Usage: $0 {letsencrypt|self-signed|check|test}"
        echo ""
        echo "Commands:"
        echo "  letsencrypt  - Set up Let's Encrypt SSL certificates (recommended)"
        echo "  self-signed  - Generate self-signed certificates (development only)"
        echo "  check        - Check existing certificates"
        echo "  test         - Test SSL configuration"
        echo ""
        echo "Examples:"
        echo "  $0 letsencrypt    # Production setup with free SSL"
        echo "  $0 self-signed    # Development setup"
        echo "  $0 check          # Check certificate status"
        exit 1
        ;;
esac 