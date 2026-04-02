#!/bin/bash

# Clean up script

echo "🧹 Cleaning up..."

# Stop Docker containers
docker-compose down

# Remove node_modules
rm -rf node_modules

# Remove dist
rm -rf dist

# Remove logs
rm -rf logs/*.log

echo "✅ Cleanup complete"
