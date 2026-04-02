#!/bin/bash

# Test script runner

set -e

echo "🧪 Running Tests"
echo "================"
echo ""

# Unit tests
echo "Running unit tests..."
npm run test -- tests/unit

# Integration tests  
echo ""
echo "Running integration tests..."
npm run test -- tests/integration

echo ""
echo "✅ All tests passed!"
