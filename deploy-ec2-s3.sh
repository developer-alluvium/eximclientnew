#!/bin/bash

# EC2 + S3 Deployment Script for EXIM Application
# This script deploys backend to EC2 with Docker and frontend to S3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="server"
FRONTEND_DIR="client"
S3_BUCKET="exim-client-prod"  # Change this to your S3 bucket name
CLOUDFRONT_DISTRIBUTION_ID=""  # Add your CloudFront distribution ID if you have one
EC2_HOST=""  # Add your EC2 IP/hostname
EC2_USER="ubuntu"  # Change if using different user
EC2_KEY_PATH=""  # Path to your EC2 private key

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_header "Checking requirements..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if Docker is available (for local testing)
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed locally. Skipping local build test."
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    print_status "All requirements met."
}

# Build React frontend
build_frontend() {
    print_header "Building React frontend..."
    
    cd $FRONTEND_DIR
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Create production environment file
    print_status "Creating production environment configuration..."
    cat > .env.production << EOF
REACT_APP_API_STRING=https://exim.alvision.in/api
REACT_APP_VERSION="15.07.01"
REACT_APP_S3_BUCKET=exim-test-upload
REACT_APP_ACCESS_KEY=\${AWS_ACCESS_KEY_ID}
REACT_APP_SECRET_ACCESS_KEY=\${AWS_SECRET_ACCESS_KEY}
REACT_APP_AWS_REGION=ap-south-1
REACT_APP_ELOCK_URL=http://elock-tracking.s3-website.ap-south-1.amazonaws.com/
NODE_ENV=production
EOF
    
    # Build the application
    print_status "Building React application..."
    npm run build
    
    if [ ! -d "build" ]; then
        print_error "Build failed! Build directory not found."
        exit 1
    fi
    
    print_status "Frontend build completed successfully."
    cd ..
}

# Deploy frontend to S3
deploy_frontend_to_s3() {
    print_header "Deploying frontend to S3..."
    
    if [ -z "$S3_BUCKET" ]; then
        print_error "S3_BUCKET is not set. Please configure it in the script."
        exit 1
    fi
    
    # Check if bucket exists
    if ! aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        print_status "Creating S3 bucket: $S3_BUCKET"
        aws s3 mb "s3://$S3_BUCKET"
        
        # Configure bucket for static website hosting
        aws s3 website "s3://$S3_BUCKET" \
            --index-document index.html \
            --error-document index.html
    fi
    
    # Sync build files to S3
    print_status "Uploading files to S3..."
    aws s3 sync $FRONTEND_DIR/build/ "s3://$S3_BUCKET" \
        --delete \
        --cache-control "public, max-age=31536000" \
        --exclude "*.html" \
        --exclude "service-worker.js" \
        --exclude "manifest.json"
    
    # Upload HTML files with no-cache
    aws s3 sync $FRONTEND_DIR/build/ "s3://$S3_BUCKET" \
        --delete \
        --cache-control "no-cache, no-store, must-revalidate" \
        --include "*.html" \
        --include "service-worker.js" \
        --include "manifest.json"
    
    # Set bucket policy for public read access
    print_status "Setting bucket policy for public access..."
    cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3_BUCKET/*"
        }
    ]
}
EOF
    
    aws s3api put-bucket-policy \
        --bucket "$S3_BUCKET" \
        --policy file://bucket-policy.json
    
    rm bucket-policy.json
    
    # Get website URL
    WEBSITE_URL="http://$S3_BUCKET.s3-website.$(aws configure get region).amazonaws.com"
    print_status "Frontend deployed to: $WEBSITE_URL"
    
    # Invalidate CloudFront if distribution ID is provided
    if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
        print_status "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/*"
    fi
}

# Prepare backend deployment package
prepare_backend_deployment() {
    print_header "Preparing backend deployment package..."
    
    # Create deployment directory
    DEPLOY_DIR="deploy-$(date +%Y%m%d_%H%M%S)"
    mkdir -p $DEPLOY_DIR
    
    # Copy backend files
    cp -r $BACKEND_DIR/* $DEPLOY_DIR/
    
    # Copy nginx configuration
    cp nginx.conf $DEPLOY_DIR/
    
    # Create deployment script for EC2
    cat > $DEPLOY_DIR/deploy-on-ec2.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Starting backend deployment on EC2..."

# Stop existing containers
docker-compose down || true

# Remove old images
docker system prune -f

# Build and start new containers
docker-compose up -d --build

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 30

# Check health
if curl -f http://localhost:9000/api/health; then
    echo "✅ Backend deployment successful!"
    echo "✅ API Health: http://localhost:9000/api/health"
    docker ps
else
    echo "❌ Backend deployment failed!"
    docker logs exim-backend
    exit 1
fi
EOF
    
    chmod +x $DEPLOY_DIR/deploy-on-ec2.sh
    
    # Create archive
    tar -czf backend-deployment.tar.gz -C $DEPLOY_DIR .
    rm -rf $DEPLOY_DIR
    
    print_status "Backend deployment package created: backend-deployment.tar.gz"
}

# Deploy backend to EC2 (if EC2 details are provided)
deploy_backend_to_ec2() {
    if [ -z "$EC2_HOST" ] || [ -z "$EC2_KEY_PATH" ]; then
        print_warning "EC2 details not configured. Skipping automatic EC2 deployment."
        print_status "To deploy manually:"
        print_status "1. Upload backend-deployment.tar.gz to your EC2 instance"
        print_status "2. Extract: tar -xzf backend-deployment.tar.gz"
        print_status "3. Run: ./deploy-on-ec2.sh"
        return
    fi
    
    print_header "Deploying backend to EC2..."
    
    # Upload deployment package
    scp -i "$EC2_KEY_PATH" backend-deployment.tar.gz "$EC2_USER@$EC2_HOST:~/"
    
    # Deploy on EC2
    ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'EOF'
        # Extract deployment package
        tar -xzf backend-deployment.tar.gz
        
        # Run deployment script
        ./deploy-on-ec2.sh
        
        # Clean up
        rm backend-deployment.tar.gz
EOF
    
    print_status "Backend deployed to EC2: $EC2_HOST"
}

# Create CloudFormation template for S3 + CloudFront
create_cloudformation_template() {
    print_header "Creating CloudFormation template..."
    
    cat > cloudformation-s3-cloudfront.yaml << EOF
AWSTemplateFormatVersion: '2010-09-09'
Description: 'EXIM Frontend - S3 + CloudFront Distribution'

Parameters:
  BucketName:
    Type: String
    Default: exim-client-prod
    Description: Name of the S3 bucket for static website hosting

Resources:
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: index.html
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false

  S3BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref S3Bucket
      PolicyDocument:
        Statement:
          - Sid: PublicReadGetObject
            Effect: Allow
            Principal: '*'
            Action: 's3:GetObject'
            Resource: !Sub '\${S3Bucket}/*'

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - DomainName: !GetAtt S3Bucket.RegionalDomainName
            Id: S3Origin
            CustomOriginConfig:
              HTTPPort: 80
              HTTPSPort: 443
              OriginProtocolPolicy: http-only
        Enabled: true
        DefaultRootObject: index.html
        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - DELETE
            - GET
            - HEAD
            - OPTIONS
            - PATCH
            - POST
            - PUT
          CachedMethods:
            - GET
            - HEAD
          Compress: true
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
        PriceClass: PriceClass_100

Outputs:
  WebsiteURL:
    Description: URL of the website
    Value: !GetAtt S3Bucket.WebsiteURL
  
  CloudFrontURL:
    Description: CloudFront Distribution URL
    Value: !GetAtt CloudFrontDistribution.DomainName
    
  CloudFrontDistributionId:
    Description: CloudFront Distribution ID
    Value: !Ref CloudFrontDistribution
EOF
    
    print_status "CloudFormation template created: cloudformation-s3-cloudfront.yaml"
}

# Main deployment function
main() {
    print_header "EXIM Application EC2 + S3 Deployment"
    echo "========================================"
    
    check_requirements
    build_frontend
    deploy_frontend_to_s3
    prepare_backend_deployment
    deploy_backend_to_ec2
    create_cloudformation_template
    
    echo ""
    print_status "🎉 Deployment completed!"
    echo "Frontend: $WEBSITE_URL"
    echo "Backend: https://exim.alvision.in/api (after EC2 deployment)"
    echo ""
    print_status "Next steps:"
    echo "1. Deploy backend to EC2 using backend-deployment.tar.gz"
    echo "2. Configure SSL certificates on EC2"
    echo "3. Update DNS to point exim.alvision.in to your EC2"
    echo "4. (Optional) Use CloudFormation template for CloudFront setup"
}

# Help function
show_help() {
    echo "EXIM Application EC2 + S3 Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  help              Show this help message"
    echo "  frontend-only     Build and deploy frontend to S3 only"
    echo "  backend-only      Prepare backend deployment package only"
    echo "  cloudformation    Create CloudFormation template only"
    echo ""
    echo "Configuration (edit script):"
    echo "  S3_BUCKET         S3 bucket name for frontend"
    echo "  EC2_HOST          EC2 instance IP/hostname"
    echo "  EC2_USER          EC2 SSH username"
    echo "  EC2_KEY_PATH      Path to EC2 private key"
    echo ""
    echo "Default: Run full deployment"
}

# Handle command line arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "frontend-only")
        check_requirements
        build_frontend
        deploy_frontend_to_s3
        ;;
    "backend-only")
        prepare_backend_deployment
        ;;
    "cloudformation")
        create_cloudformation_template
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
