#!/bin/bash

PID_FILE="server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "PID file not found. Server may not be running."
    exit 1
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
    echo "Process with PID $PID is not running. Removing stale PID file."
    rm -f "$PID_FILE"
    exit 1
fi

echo "Stopping Vision Board server (PID: $PID)..."
kill -TERM "$PID"

for i in {1..10}; do
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "Server stopped successfully"
        rm -f "$PID_FILE"
        exit 0
    fi
    sleep 1
done

echo "Server did not stop gracefully, forcing shutdown..."
kill -KILL "$PID"
rm -f "$PID_FILE"
echo "Server forcefully stopped"