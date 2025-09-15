#!/bin/bash

echo "🔧 Setting up environment files..."

# Copy frontend environment file
if [ -f "frontend.env" ]; then
    cp frontend.env frontend/.env
    echo "✅ Frontend environment file created"
else
    echo "❌ frontend.env not found"
fi

# Copy backend environment file
if [ -f "backend.env" ]; then
    cp backend.env backend/.env
    cp backend.env backend/.env.local
    echo "✅ Backend environment file created"
else
    echo "❌ backend.env not found"
fi

echo "🎉 Environment setup complete!"
echo ""
echo "You can now run:"
echo "  docker-compose up --build    # For development"
echo "  docker-compose -f docker-compose.prod.yml up --build -d    # For production"
