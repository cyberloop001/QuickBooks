#!/bin/bash

# Phone Billing Dashboard Frontend Deployment Script

echo "🚀 Starting frontend deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🔨 Building for production..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Production files are in the 'dist' directory"
    echo ""
    echo "🌐 To deploy:"
    echo "   1. Upload contents of 'dist' directory to your web server"
    echo "   2. Configure your web server to serve index.html for all routes"
    echo "   3. Update environment variables for production"
    echo ""
    echo "📋 Deployment options:"
    echo "   • Netlify: Drag 'dist' folder to Netlify dashboard"
    echo "   • Vercel: Run 'vercel --prod' from project root"
    echo "   • AWS S3: Upload 'dist' contents to S3 bucket"
    echo "   • Docker: Use the provided Dockerfile"
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi 