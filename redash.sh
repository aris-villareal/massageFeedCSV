#!/bin/bash

# Redash Query Executor Helper Script
# Usage: ./redash.sh <command> [args...]

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo "❌ ts-node is not installed. Please run: npm install"
    exit 1
fi

# Check if the TypeScript file exists
if [ ! -f "redash-query.ts" ]; then
    echo "❌ redash-query.ts not found in current directory"
    exit 1
fi

# Run the TypeScript script with all provided arguments
exec ts-node redash-query.ts "$@"