#!/bin/bash

# Change to frontend directory
cd "$(dirname "$0")"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Please install npm and Node.js first"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run tests
echo "Running tests..."
npm test

# Output test result status
TEST_STATUS=$?
if [ $TEST_STATUS -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed, please check error messages"
fi

exit $TEST_STATUS 