#!/bin/bash

# EXIM Application Health Monitor
# This script monitors the health of your deployed application

set -e

# Configuration
FRONTEND_URL="http://exim-client-prod.s3-website.ap-south-1.amazonaws.com"
API_URL="https://exim.alvision.in/api/health"
NGINX_TEST_URL="https://exim.alvision.in/test"
SLACK_WEBHOOK_URL=""  # Add your Slack webhook URL for notifications
EMAIL=""              # Add email for notifications

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print status
print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to send notification
send_notification() {
    local message="$1"
    local status="$2"
    
    # Send to Slack if webhook is configured
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 EXIM App Alert: $message\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Send email if configured
    if [ ! -z "$EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "EXIM Application Alert" "$EMAIL" || true
    fi
    
    # Log to system log
    logger "EXIM Monitor: $message"
}

# Check frontend (S3)
check_frontend() {
    echo "Checking frontend..."
    
    if curl -s -f -I "$FRONTEND_URL" > /dev/null; then
        print_status "Frontend is accessible"
        return 0
    else
        print_error "Frontend is not accessible"
        send_notification "Frontend is down at $FRONTEND_URL" "error"
        return 1
    fi
}

# Check backend API
check_backend() {
    echo "Checking backend API..."
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL" || echo "HTTPSTATUS:000")
    http_code=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    body=$(echo $response | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [ "$http_code" -eq 200 ]; then
        print_status "Backend API is healthy"
        echo "Response: $body"
        return 0
    else
        print_error "Backend API is not responding correctly (HTTP: $http_code)"
        send_notification "Backend API is down. HTTP Status: $http_code" "error"
        return 1
    fi
}

# Check nginx
check_nginx() {
    echo "Checking Nginx..."
    
    if curl -s -f "$NGINX_TEST_URL" > /dev/null; then
        print_status "Nginx is working"
        return 0
    else
        print_error "Nginx test failed"
        send_notification "Nginx is not responding at $NGINX_TEST_URL" "error"
        return 1
    fi
}

# Check SSL certificate
check_ssl() {
    echo "Checking SSL certificate..."
    
    domain="exim.alvision.in"
    expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [ ! -z "$expiry_date" ]; then
        expiry_timestamp=$(date -d "$expiry_date" +%s)
        current_timestamp=$(date +%s)
        days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_until_expiry -gt 30 ]; then
            print_status "SSL certificate is valid (expires in $days_until_expiry days)"
        elif [ $days_until_expiry -gt 7 ]; then
            print_warning "SSL certificate expires in $days_until_expiry days"
            send_notification "SSL certificate for $domain expires in $days_until_expiry days" "warning"
        else
            print_error "SSL certificate expires in $days_until_expiry days"
            send_notification "SSL certificate for $domain expires in $days_until_expiry days - URGENT!" "error"
        fi
    else
        print_error "Could not check SSL certificate"
        send_notification "Failed to check SSL certificate for $domain" "error"
    fi
}

# Check Docker services (if running on EC2)
check_docker_services() {
    echo "Checking Docker services..."
    
    if command -v docker &> /dev/null; then
        # Check if containers are running
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "exim-backend"; then
            backend_status=$(docker ps --filter "name=exim-backend" --format "{{.Status}}")
            print_status "Backend container: $backend_status"
        else
            print_error "Backend container is not running"
            send_notification "Backend Docker container is not running" "error"
        fi
        
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "exim-nginx"; then
            nginx_status=$(docker ps --filter "name=exim-nginx" --format "{{.Status}}")
            print_status "Nginx container: $nginx_status"
        else
            print_error "Nginx container is not running"
            send_notification "Nginx Docker container is not running" "error"
        fi
        
        # Check container resource usage
        echo ""
        echo "Container resource usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | head -n 5
        
    else
        print_warning "Docker not available (not running on EC2?)"
    fi
}

# Check system resources
check_system_resources() {
    echo "Checking system resources..."
    
    # Check disk usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $disk_usage -gt 90 ]; then
        print_error "Disk usage is critical: ${disk_usage}%"
        send_notification "Disk usage is critical: ${disk_usage}%" "error"
    elif [ $disk_usage -gt 80 ]; then
        print_warning "Disk usage is high: ${disk_usage}%"
    else
        print_status "Disk usage: ${disk_usage}%"
    fi
    
    # Check memory usage
    if command -v free &> /dev/null; then
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ $memory_usage -gt 90 ]; then
            print_error "Memory usage is critical: ${memory_usage}%"
            send_notification "Memory usage is critical: ${memory_usage}%" "error"
        elif [ $memory_usage -gt 80 ]; then
            print_warning "Memory usage is high: ${memory_usage}%"
        else
            print_status "Memory usage: ${memory_usage}%"
        fi
    fi
    
    # Check load average
    if command -v uptime &> /dev/null; then
        load_avg=$(uptime | awk '{print $(NF-2)}' | sed 's/,//')
        print_status "Load average: $load_avg"
    fi
}

# Generate health report
generate_report() {
    echo ""
    echo "==================================="
    echo "EXIM Application Health Report"
    echo "Generated: $(date)"
    echo "==================================="
    
    local overall_status="HEALTHY"
    local failed_checks=0
    
    # Run all checks
    check_frontend || ((failed_checks++))
    echo ""
    
    check_backend || ((failed_checks++))
    echo ""
    
    check_nginx || ((failed_checks++))
    echo ""
    
    check_ssl
    echo ""
    
    check_docker_services
    echo ""
    
    check_system_resources
    echo ""
    
    # Overall status
    if [ $failed_checks -eq 0 ]; then
        overall_status="HEALTHY"
        print_status "Overall status: $overall_status"
    elif [ $failed_checks -eq 1 ]; then
        overall_status="DEGRADED"
        print_warning "Overall status: $overall_status ($failed_checks issue)"
    else
        overall_status="UNHEALTHY"
        print_error "Overall status: $overall_status ($failed_checks issues)"
        send_notification "Application is $overall_status with $failed_checks issues" "error"
    fi
    
    echo "==================================="
    
    return $failed_checks
}

# Main function
main() {
    case "${1:-}" in
        "report")
            generate_report
            ;;
        "frontend")
            check_frontend
            ;;
        "backend")
            check_backend
            ;;
        "nginx")
            check_nginx
            ;;
        "ssl")
            check_ssl
            ;;
        "docker")
            check_docker_services
            ;;
        "resources")
            check_system_resources
            ;;
        "continuous")
            echo "Starting continuous monitoring (every 5 minutes)..."
            while true; do
                generate_report
                sleep 300  # 5 minutes
            done
            ;;
        "help"|"-h"|"--help")
            echo "EXIM Application Health Monitor"
            echo ""
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  report       Generate full health report (default)"
            echo "  frontend     Check frontend only"
            echo "  backend      Check backend API only"
            echo "  nginx        Check nginx only"
            echo "  ssl          Check SSL certificate only"
            echo "  docker       Check Docker services only"
            echo "  resources    Check system resources only"
            echo "  continuous   Run continuous monitoring"
            echo "  help         Show this help message"
            ;;
        "")
            generate_report
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
