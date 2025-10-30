#!/bin/bash

# Vision Board Tauri Development Script
# Starts the backend server and Tauri dev environment

PID_FILE="server.pid"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR" || exit 1

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "✓ Server is already running with PID $PID"
    else
        echo "Removing stale PID file"
        rm -f "$PID_FILE"
        echo "Starting backend server..."
        node server/app.js &
        sleep 2
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            echo "✓ Server started with PID $PID"
        else
            echo "✗ Failed to start server"
            exit 1
        fi
    fi
else
    echo "Starting backend server..."
    node server/app.js &
    sleep 2
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo "✓ Server started with PID $PID"
    else
        echo "✗ Failed to start server"
        exit 1
    fi
fi

echo "Starting Tauri development environment..."
echo "(Press Ctrl+C to stop)"
npm run tauri:dev
