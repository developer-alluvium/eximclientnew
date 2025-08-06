#!/bin/bash

# EXIM Application HTTPS Deployment Script
# This script helps deploy the application with HTTPS support

set -e

echo "🚀 Starting EXIM Application HTTPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if running as root for nginx operations
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is required for nginx operations."
    else
        print_warning "Not running as root. You may need sudo privileges for nginx operations."
    fi
}

# Backup existing nginx configuration
backup_nginx_config() {
    if [ -f /etc/nginx/sites-available/exim.alvision.in ]; then
        print_status "Backing up existing nginx configuration..."
        sudo cp /etc/nginx/sites-available/exim.alvision.in /etc/nginx/sites-available/exim.alvision.in.backup.$(date +%Y%m%d_%H%M%S)
    fi
}

# Install nginx configuration
install_nginx_config() {
    print_status "Installing nginx configuration..."
    
    # Copy the nginx configuration
    sudo cp ./nginx.conf /etc/nginx/sites-available/exim.alvision.in
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/exim.alvision.in /etc/nginx/sites-enabled/
    
    # Remove default nginx site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    print_status "Nginx configuration installed."
}

# Test nginx configuration
test_nginx_config() {
    print_status "Testing nginx configuration..."
    if sudo nginx -t; then
        print_status "Nginx configuration is valid."
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    print_status "Checking SSL certificates..."
    
    if [ ! -f /etc/ssl/alvision/fullchain.crt ]; then
        print_error "SSL certificate not found at /etc/ssl/alvision/fullchain.crt"
        print_warning "Please ensure your SSL certificates are properly installed."
        return 1
    fi
    
    if [ ! -f /etc/ssl/alvision/wildcard.key ]; then
        print_error "SSL private key not found at /etc/ssl/alvision/wildcard.key"
        print_warning "Please ensure your SSL private key is properly installed."
        return 1
    fi
    
    print_status "SSL certificates found."
}

# Build React application
build_frontend() {
    print_status "Building React frontend for production..."
    cd client
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the application
    npm run build
    
    print_status "Frontend build completed."
    cd ..
}

# Install backend dependencies
setup_backend() {
    print_status "Setting up backend..."
    cd server
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm install
    fi
    
    print_status "Backend setup completed."
    cd ..
}

# Start/restart services
restart_services() {
    print_status "Restarting services..."
    
    # Restart nginx
    sudo systemctl restart nginx
    print_status "Nginx restarted."
    
    # Check nginx status
    if sudo systemctl is-active --quiet nginx; then
        print_status "Nginx is running."
    else
        print_error "Nginx failed to start!"
        sudo systemctl status nginx
        exit 1
    fi
}

# Create systemd service for the backend
create_backend_service() {
    print_status "Creating systemd service for backend..."
    
    cat << EOF | sudo tee /etc/systemd/system/exim-backend.service
[Unit]
Description=EXIM Backend API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable exim-backend
    sudo systemctl restart exim-backend
    
    print_status "Backend service created and started."
}

# Display final status
show_status() {
    print_status "Deployment Status:"
    echo "===================="
    
    # Check nginx
    if sudo systemctl is-active --quiet nginx; then
        echo -e "Nginx: ${GREEN}✓ Running${NC}"
    else
        echo -e "Nginx: ${RED}✗ Not Running${NC}"
    fi
    
    # Check backend service
    if sudo systemctl is-active --quiet exim-backend; then
        echo -e "Backend: ${GREEN}✓ Running${NC}"
    else
        echo -e "Backend: ${RED}✗ Not Running${NC}"
    fi
    
    echo ""
    print_status "Application should be available at: https://exim.alvision.in"
    print_status "API health check: https://exim.alvision.in/api/health"
    print_status "Nginx test: https://exim.alvision.in/test"
}

# Main deployment function
main() {
    print_status "Starting HTTPS deployment for EXIM Application..."
    
    check_permissions
    
    # SSL certificate check
    if ! check_ssl_certificates; then
        print_error "SSL certificates not found. Please install them first."
        exit 1
    fi
    
    # Backup and install nginx config
    backup_nginx_config
    install_nginx_config
    test_nginx_config
    
    # Build and setup application
    build_frontend
    setup_backend
    
    # Create backend service
    create_backend_service
    
    # Restart services
    restart_services
    
    # Show final status
    show_status
    
    print_status "HTTPS deployment completed successfully! 🎉"
}

# Help function
show_help() {
    echo "EXIM Application HTTPS Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  help              Show this help message"
    echo "  ssl-check         Check SSL certificates only"
    echo "  nginx-only        Install and test nginx configuration only"
    echo "  build-only        Build frontend and setup backend only"
    echo "  status            Show current service status"
    echo ""
    echo "Default: Run full deployment"
}

# Handle command line arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "ssl-check")
        check_ssl_certificates
        ;;
    "nginx-only")
        check_permissions
        backup_nginx_config
        install_nginx_config
        test_nginx_config
        restart_services
        ;;
    "build-only")
        build_frontend
        setup_backend
        ;;
    "status")
        show_status
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
