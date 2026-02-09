#!/bin/sh
set -e

mkdir -p /data /app/generated-images

echo "Running database migrations..."
bunx drizzle-kit push --force

echo "Starting AImage server..."
exec node .next/standalone/server.js
