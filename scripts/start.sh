#!/bin/bash

PID_FILE="server.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Server is already running with PID $PID"
        exit 1
    else
        echo "Removing stale PID file"
        rm -f "$PID_FILE"
    fi
fi

echo "Starting Vision Board server..."
node server/app.js &

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "Server started successfully with PID $PID"
else
    echo "Failed to start server"
    exit 1
fi