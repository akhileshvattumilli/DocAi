#!/bin/bash

# Start development servers for DocAI
# This script starts both Django and Yjs WebSocket server

echo "Starting DocAI development servers..."

# Function to cleanup background processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $DJANGO_PID $YJS_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Django development server
echo "Starting Django server on port 8000..."
cd src
python manage.py runserver 8000 &
DJANGO_PID=$!

# Start Yjs WebSocket server
echo "Starting Yjs WebSocket server on port 1234..."
cd ..
python yjs_server.py &
YJS_PID=$!

echo "Servers started!"
echo "Django server: http://localhost:8000"
echo "Yjs WebSocket server: ws://localhost:1234"
echo "Press Ctrl+C to stop both servers"

# Wait for background processes
wait
