#!/bin/bash

# PromptPlay Quick Start Script
# This script helps you get both backend and frontend running

echo "🎾 PromptPlay Quick Start 🎾"
echo "=============================="
echo ""

# Check if in correct directory
if [ ! -d "promptplay-backend" ] || [ ! -d "promptplay-frontend" ]; then
    echo "❌ Error: Please run this script from the cw3 directory"
    echo "   Expected structure:"
    echo "   cw3/"
    echo "   ├── promptplay-backend/"
    echo "   └── promptplay-frontend/"
    exit 1
fi

echo "📦 Setting up Backend..."
echo "------------------------"

cd promptplay-backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from template..."
    cp .env.example .env
    echo "✅ Please edit promptplay-backend/.env and add your GROQ_API_KEY"
    echo ""
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

echo ""
echo "🔧 Installing Python dependencies..."
source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ Backend dependencies installed"

cd ..

echo ""
echo "📦 Setting up Frontend..."
echo "-------------------------"

cd promptplay-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "🔧 Installing Node dependencies..."
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Node dependencies already installed"
fi

cd ..

echo ""
echo "=============================="
echo "✅ Setup Complete!"
echo "=============================="
echo ""
echo "📝 To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd promptplay-backend"
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd promptplay-frontend"
echo "  npm run dev"
echo ""
echo "🌐 Then visit: http://localhost:5173"
echo ""
echo "⚠️  Don't forget to add your GROQ_API_KEY to promptplay-backend/.env"
echo ""
