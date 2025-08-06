# EXIM Application HTTPS Setup Guide

This guide explains how to configure and deploy the EXIM application with HTTPS support using Nginx as a reverse proxy.

## 🔧 Architecture Overview

```
Internet → Nginx (HTTPS/SSL Termination) → Express.js Backend (HTTP on port 9000)
                      ↓
               React Frontend (Static Files or Separate Hosting)
```

## 📋 Prerequisites

1. **SSL Certificate**: Wildcard certificate for `*.alvision.in` domain
2. **Nginx**: Web server for reverse proxy and SSL termination
3. **Domain**: `exim.alvision.in` pointing to your server
4. **Node.js**: Version 14+ for running the application

## 🚀 Quick Setup

### 1. SSL Certificate Installation
Ensure your SSL certificates are installed at:
- Certificate: `/etc/ssl/alvision/fullchain.crt`
- Private Key: `/etc/ssl/alvision/wildcard.key`

### 2. Update Environment Variables
The deployment script automatically updates:
- Frontend: `REACT_APP_API_STRING=https://exim.alvision.in/api`
- Backend: `PORT=9000` (to match Nginx proxy)
- CORS: Added `https://exim.alvision.in` to allowed origins

### 3. Run Deployment Script
```bash
# Make script executable
chmod +x deploy-https.sh

# Run full deployment
./deploy-https.sh

# Or run specific parts
./deploy-https.sh ssl-check      # Check SSL certificates
./deploy-https.sh nginx-only     # Configure Nginx only
./deploy-https.sh build-only     # Build application only
./deploy-https.sh status         # Check service status
```

## 🔍 Manual Setup (if needed)

### 1. Install Nginx Configuration
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/exim.alvision.in

# Enable the site
sudo ln -sf /etc/nginx/sites-available/exim.alvision.in /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 2. Build Frontend
```bash
cd client
npm install
npm run build
cd ..
```

### 3. Setup Backend
```bash
cd server
npm install
# Server will run on port 9000 as configured in .env
npm start
cd ..
```

### 4. Create Backend Service (Optional)
```bash
# Create systemd service
sudo cp exim-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable exim-backend
sudo systemctl start exim-backend
```

## 🌐 Nginx Configuration Features

### Security Headers
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### Performance Optimizations
- Gzip compression
- Static file caching
- Proper proxy headers

### SSL/TLS Configuration
- TLS 1.2 and 1.3 support
- Strong cipher suites
- HTTP/2 support

## 🔗 Endpoints After Setup

- **Main Application**: `https://exim.alvision.in`
- **API Health Check**: `https://exim.alvision.in/api/health`
- **Nginx Test**: `https://exim.alvision.in/test`
- **API Endpoints**: `https://exim.alvision.in/api/*`

## 🛠️ Development with HTTPS

### Local HTTPS Development
1. Generate self-signed certificates:
```bash
# Install mkcert (recommended)
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/

# Generate certificates
mkcert -install
cd server
mkdir ssl
mkcert -key-file ssl/localhost.key -cert-file ssl/localhost.crt localhost 127.0.0.1 ::1
```

2. Use development environment:
```bash
# Frontend
cp client/.env.development client/.env

# Backend - modify for HTTPS support if needed
# The current setup uses HTTP for development, HTTPS for production
```

## 🔧 Environment Files

### Production (`.env.production`)
```bash
REACT_APP_API_STRING=https://exim.alvision.in/api
NODE_ENV=production
```

### Development (`.env.development`)
```bash
REACT_APP_API_STRING=https://localhost:9001/api
NODE_ENV=development
HTTPS=true
```

### Current (`.env`)
```bash
REACT_APP_API_STRING=https://exim.alvision.in/api
# Fallback: http://localhost:9001/api
```

## 🚨 Troubleshooting

### Common Issues

1. **SSL Certificate Not Found**
   ```bash
   # Check certificate files exist
   ls -la /etc/ssl/alvision/
   
   # Check certificate validity
   openssl x509 -in /etc/ssl/alvision/fullchain.crt -text -noout
   ```

2. **Nginx Configuration Errors**
   ```bash
   # Test nginx configuration
   sudo nginx -t
   
   # Check nginx error logs
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Backend Connection Issues**
   ```bash
   # Check if backend is running
   sudo systemctl status exim-backend
   
   # Check backend logs
   sudo journalctl -u exim-backend -f
   
   # Test backend directly
   curl http://localhost:9000/api/health
   ```

4. **CORS Issues**
   ```bash
   # Check if CORS origin is correct in server/app.js
   # Ensure https://exim.alvision.in is in the allowed origins
   ```

### Service Management

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status exim-backend

# Restart services
sudo systemctl restart nginx
sudo systemctl restart exim-backend

# View logs
sudo journalctl -u nginx -f
sudo journalctl -u exim-backend -f
```

## 📊 Monitoring

### Health Checks
- **Nginx**: `https://exim.alvision.in/test`
- **Backend**: `https://exim.alvision.in/api/health`
- **SSL**: Use online SSL checkers or `openssl s_client -connect exim.alvision.in:443`

### Log Locations
- **Nginx Access**: `/var/log/nginx/access.log`
- **Nginx Error**: `/var/log/nginx/error.log`
- **Backend**: `sudo journalctl -u exim-backend`

## 🔄 Updates and Maintenance

### Updating Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./deploy-https.sh
```

### SSL Certificate Renewal
```bash
# If using Let's Encrypt
sudo certbot renew

# If using custom certificates, replace files and restart nginx
sudo systemctl restart nginx
```

### Performance Monitoring
- Monitor Nginx access logs for traffic patterns
- Use tools like `htop`, `iotop` for system resource monitoring
- Set up log rotation for application logs

## 🔐 Security Considerations

1. **Keep SSL certificates secure and updated**
2. **Regular security updates for Nginx and Node.js**
3. **Monitor access logs for suspicious activity**
4. **Use strong passwords for database connections**
5. **Implement rate limiting if needed**
6. **Regular backups of application data and configuration**

## 📚 Additional Resources

- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

---

**Note**: This setup uses Nginx for SSL termination, which is the recommended approach for production deployments. The backend runs on HTTP internally, and Nginx handles all HTTPS traffic and forwards requests to the backend.
