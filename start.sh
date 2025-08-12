#!/bin/bash

# Phone Billing System - Quick Start Script

echo "🚀 Starting Phone Billing System..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

if ! command_exists docker; then
    echo "⚠️  Docker not found. Will use local PostgreSQL if available."
fi

echo "✅ Prerequisites check completed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing"
    echo "   - Set your QBO credentials"
    echo "   - Set your phone system API details"
    echo "   - Configure database connection"
    echo ""
    read -p "Press Enter after editing .env file..."
else
    echo "✅ .env file already exists"
fi

# Build backend
echo "🔨 Building backend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed. Please check the errors above."
    exit 1
fi

echo "✅ Backend built successfully"

# Start database (if Docker is available)
if command_exists docker; then
    echo "🐳 Starting PostgreSQL with Docker..."
    docker-compose up -d postgres
    
    # Wait for database to be ready
    echo "⏳ Waiting for database to be ready..."
    sleep 10
else
    echo "⚠️  Docker not available. Please ensure PostgreSQL is running locally."
    echo "   Database should be accessible with the credentials in your .env file"
fi

# Start backend in background
echo "🚀 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:3001"
else
    echo "❌ Backend failed to start. Check the logs above."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Start frontend in background
echo "🚀 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running on http://localhost:3000"
else
    echo "❌ Frontend failed to start. Check the logs above."
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Go back to root directory
cd ..

echo ""
echo "🎉 Phone Billing System is now running!"
echo "========================================"
echo ""
echo "🌐 Access Points:"
echo "   • Frontend Dashboard: http://localhost:3000"
echo "   • Backend API: http://localhost:3001"
echo "   • Health Check: http://localhost:3001/api/health"
echo ""
echo "🔑 Login:"
echo "   • Use any email and password (demo mode)"
echo ""
echo "📚 Next Steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Login with any credentials"
echo "   3. Configure your QBO and phone system settings"
echo "   4. Add your first client mapping"
echo "   5. Test the billing system with a dry run"
echo ""
echo "🛑 To stop the system:"
echo "   • Press Ctrl+C in this terminal"
echo "   • Or run: pkill -f 'npm run dev'"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Phone Billing System..."
    
    # Kill background processes
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    
    # Stop Docker containers
    if command_exists docker; then
        echo "🐳 Stopping Docker containers..."
        docker-compose down
    fi
    
    echo "✅ Shutdown complete"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Keep script running
echo "🔄 System is running. Press Ctrl+C to stop..."
wait 