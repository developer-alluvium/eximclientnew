# EXIM Application - EC2 + S3 Deployment Guide

This guide covers deploying the EXIM application with:
- **Frontend**: React app hosted on S3 (with optional CloudFront)
- **Backend**: Node.js API running in Docker containers on EC2
- **Database**: MongoDB (existing configuration)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Users/Clients │───▶│  S3 + CloudFront │    │   EC2 Instance  │
└─────────────────┘    │   (Frontend)     │    │                 │
                       └──────────────────┘    │ ┌─────────────┐ │
                                │               │ │   Nginx     │ │
                                │               │ │   (HTTPS)   │ │
                                │               │ └─────────────┘ │
                                │               │        │        │
                                └──────────────────────▶│        │
                                     API Calls          │        │
                                                        │ ┌─────────────┐ │
                                                        │ │   Docker    │ │
                                                        │ │  Container  │ │
                                                        │ │ (Backend)   │ │
                                                        │ └─────────────┘ │
                                                        └─────────────────┘
                                                               │
                                                               ▼
                                                        ┌─────────────────┐
                                                        │   MongoDB       │
                                                        │   (Atlas/Cloud) │
                                                        └─────────────────┘
```

## 📋 Prerequisites

### AWS Setup
1. **AWS CLI installed and configured**
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure AWS CLI
   aws configure
   ```

2. **S3 Bucket for frontend** (will be created automatically)
3. **EC2 Instance** with Docker installed
4. **SSL Certificate** for your domain
5. **Domain/DNS** pointing to your EC2 instance

### EC2 Instance Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Logout and login again for docker group to take effect
```

## 🚀 Deployment Steps

### Step 1: Configure Deployment Settings

Edit the deployment script variables:
```bash
# Edit deploy-ec2-s3.sh
S3_BUCKET="exim-client-prod"  # Your S3 bucket name
EC2_HOST="your-ec2-ip-or-domain"  # Your EC2 IP
EC2_USER="ubuntu"  # Your EC2 username
EC2_KEY_PATH="/path/to/your/key.pem"  # Path to EC2 private key
CLOUDFRONT_DISTRIBUTION_ID=""  # Optional: CloudFront distribution ID
```

### Step 2: Run Deployment Script

```bash
# Make script executable
chmod +x deploy-ec2-s3.sh

# Run full deployment
./deploy-ec2-s3.sh

# Or deploy components separately
./deploy-ec2-s3.sh frontend-only    # Deploy frontend to S3 only
./deploy-ec2-s3.sh backend-only     # Prepare backend package only
```

### Step 3: Manual EC2 Backend Deployment (if not automated)

If you didn't configure EC2 details in the script:

```bash
# 1. Upload deployment package to EC2
scp -i your-key.pem backend-deployment.tar.gz ubuntu@your-ec2-ip:~/

# 2. SSH to EC2 and deploy
ssh -i your-key.pem ubuntu@your-ec2-ip
tar -xzf backend-deployment.tar.gz
./deploy-on-ec2.sh
```

### Step 4: Configure SSL on EC2

```bash
# On your EC2 instance, copy SSL certificates
sudo mkdir -p /etc/ssl/alvision
sudo cp your-certificate.crt /etc/ssl/alvision/fullchain.crt
sudo cp your-private-key.key /etc/ssl/alvision/wildcard.key
sudo chmod 600 /etc/ssl/alvision/wildcard.key

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/exim.alvision.in
sudo ln -sf /etc/nginx/sites-available/exim.alvision.in /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
```

## 🌐 DNS Configuration

Point your domain to the EC2 instance:

```
# DNS Records needed:
exim.alvision.in    A    YOUR_EC2_PUBLIC_IP
api.alvision.in     A    YOUR_EC2_PUBLIC_IP  (optional)
```

## 📱 Frontend Environment Configuration

The deployment script automatically creates production environment:

```bash
# client/.env.production (auto-created)
REACT_APP_API_STRING=https://exim.alvision.in/api
REACT_APP_VERSION="15.07.01"
REACT_APP_S3_BUCKET=exim-test-upload
REACT_APP_ACCESS_KEY=your-aws-access-key
REACT_APP_SECRET_ACCESS_KEY=your-aws-secret-key
REACT_APP_AWS_REGION=ap-south-1
REACT_APP_ELOCK_URL=http://elock-tracking.s3-website.ap-south-1.amazonaws.com/
NODE_ENV=production
```

## 🐳 Docker Configuration

### Backend Dockerfile Features:
- **Multi-stage build** for smaller image size
- **Non-root user** for security
- **Health checks** for container monitoring
- **Production optimizations**

### Docker Compose Features:
- **Service networking** between Nginx and backend
- **Volume mounting** for logs and SSL certificates
- **Health checks** and restart policies
- **Environment variable management**

## 🔧 Available Commands

### Frontend Deployment
```bash
# Build and deploy frontend only
./deploy-ec2-s3.sh frontend-only

# Manual S3 sync (after building)
aws s3 sync client/build/ s3://exim-client-prod --delete
```

### Backend Management
```bash
# On EC2 instance
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose logs -f            # View logs
docker-compose ps                 # Check status
docker system prune -f            # Clean up old images
```

### Monitoring
```bash
# Check service health
curl https://exim.alvision.in/api/health
curl https://exim.alvision.in/test

# View logs
sudo journalctl -u nginx -f
docker logs exim-backend -f
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Check if S3 bucket URL is in CORS origins
   # Update server/app.js CORS configuration
   ```

2. **SSL Certificate Issues**
   ```bash
   # Verify certificate files
   sudo openssl x509 -in /etc/ssl/alvision/fullchain.crt -text -noout
   
   # Check nginx configuration
   sudo nginx -t
   ```

3. **Docker Container Not Starting**
   ```bash
   # Check logs
   docker logs exim-backend
   
   # Check environment variables
   docker exec exim-backend env
   ```

4. **S3 Access Issues**
   ```bash
   # Check bucket policy
   aws s3api get-bucket-policy --bucket exim-client-prod
   
   # Check AWS credentials
   aws sts get-caller-identity
   ```

### Health Checks

```bash
# Frontend (S3)
curl -I http://exim-client-prod.s3-website.ap-south-1.amazonaws.com

# Backend API
curl https://exim.alvision.in/api/health

# Nginx
curl https://exim.alvision.in/test

# Docker services
docker ps
docker-compose ps
```

## 📊 Performance Optimizations

### S3 + CloudFront
- **Static file caching** with appropriate headers
- **Gzip compression** for text files
- **CloudFront CDN** for global distribution

### Backend Optimizations
- **Docker multi-stage builds** for smaller images
- **Health checks** for container monitoring
- **Log rotation** and management
- **Resource limits** in docker-compose

### Nginx Optimizations
- **Gzip compression** enabled
- **Static file caching** headers
- **Security headers** for protection
- **Proxy buffering** for better performance

## 🔄 Updates and Maintenance

### Frontend Updates
```bash
# Deploy new frontend version
./deploy-ec2-s3.sh frontend-only

# Invalidate CloudFront cache (if using)
aws cloudfront create-invalidation \
    --distribution-id YOUR_DISTRIBUTION_ID \
    --paths "/*"
```

### Backend Updates
```bash
# Build and deploy new backend version
./deploy-ec2-s3.sh backend-only

# On EC2: Update running containers
docker-compose down
docker-compose up -d --build
```

### Database Maintenance
- Regular backups of MongoDB
- Monitor connection strings and credentials
- Update environment variables as needed

## 🔐 Security Considerations

1. **SSL/TLS Configuration**
   - Use strong cipher suites
   - Enable HSTS headers
   - Regular certificate updates

2. **Container Security**
   - Run containers as non-root user
   - Regular image updates
   - Resource limits and monitoring

3. **Network Security**
   - Configure EC2 security groups appropriately
   - Limit SSH access to specific IPs
   - Use VPC for additional isolation

4. **Access Management**
   - Use IAM roles for EC2 S3 access
   - Rotate AWS access keys regularly
   - Implement least privilege principle

## 📈 Monitoring and Logging

### Application Monitoring
```bash
# Set up log aggregation
docker-compose logs --tail=100 -f

# Monitor resource usage
docker stats

# Check disk usage
df -h
du -sh /var/log/nginx/
```

### AWS Monitoring
- **CloudWatch** for S3 and CloudFront metrics
- **S3 access logs** for traffic analysis
- **CloudFront logs** for performance insights

---

## 🎯 Final URLs After Deployment

- **Frontend**: `http://exim-client-prod.s3-website.ap-south-1.amazonaws.com`
- **Backend API**: `https://exim.alvision.in/api`
- **Health Check**: `https://exim.alvision.in/api/health`
- **Nginx Test**: `https://exim.alvision.in/test`

This setup provides a scalable, secure, and maintainable deployment for your EXIM application! 🚀
