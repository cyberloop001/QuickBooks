#!/bin/bash

# QuickBooks Phone Billing System Deployment Script
# This script automates the deployment of the entire system using Docker Compose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f env.production ]; then
            cp env.production .env
            print_warning "Please edit .env file with your actual configuration values before continuing."
            read -p "Press Enter after editing .env file to continue..."
        else
            print_error "No environment template found. Please create .env file manually."
            exit 1
        fi
    fi
    print_success "Environment file configured"
}

# Function to build services
build_services() {
    print_status "Building Docker services..."
    docker compose build --no-cache
    print_success "Services built successfully"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    docker compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    print_success "Services started"
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    # Check if all services are running
    if ! docker compose ps | grep -q "Up"; then
        print_error "Some services failed to start. Check logs with: docker compose logs"
        exit 1
    fi
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose ps | grep -q "healthy"; then
            print_success "All services are healthy"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts - Waiting for services to be healthy..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_warning "Some services may not be fully healthy. Check with: docker compose ps"
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    docker compose ps
    
    echo ""
    print_status "Access URLs:"
    echo -e "  Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "  Backend API: ${GREEN}http://localhost:3001${NC}"
    echo -e "  Database: ${GREEN}localhost:5433${NC}"
    echo -e "  Nginx: ${GREEN}http://localhost:80${NC}"
}

# Function to show logs
show_logs() {
    print_status "Recent logs from all services:"
    docker compose logs --tail=20
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    docker compose down
    print_success "Services stopped"
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."
    docker compose restart
    print_success "Services restarted"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker compose down -v --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     - Build and deploy all services (default)"
    echo "  build      - Build services only"
    echo "  start      - Start services only"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  status     - Show service status"
    echo "  logs       - Show recent logs"
    echo "  health     - Check service health"
    echo "  cleanup    - Stop services and clean up resources"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Deploy everything"
    echo "  $0 deploy       # Same as above"
    echo "  $0 status       # Check status only"
    echo "  $0 logs         # View logs only"
}

# Main execution
main() {
    local command=${1:-deploy}
    
    case $command in
        deploy)
            print_status "Starting deployment process..."
            check_docker
            check_docker_compose
            check_env_file
            build_services
            start_services
            check_health
            show_status
            print_success "Deployment completed successfully!"
            ;;
        build)
            check_docker
            check_docker_compose
            build_services
            ;;
        start)
            check_docker
            check_docker_compose
            start_services
            show_status
            ;;
        stop)
            check_docker
            stop_services
            ;;
        restart)
            check_docker
            restart_services
            show_status
            ;;
        status)
            check_docker
            show_status
            ;;
        logs)
            check_docker
            show_logs
            ;;
        health)
            check_docker
            check_health
            ;;
        cleanup)
            check_docker
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 