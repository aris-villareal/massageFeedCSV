#!/bin/bash

# CSV Massage Script Runner
# Usage: ./run.sh [input-file] [output-file]

if [ $# -eq 0 ]; then
    echo "Usage: ./run.sh <input-file> [output-file]"
    echo "Example: ./run.sh data.csv"
    echo "Example: ./run.sh data.csv output.csv"
    exit 1
fi

./node_modules/.bin/ts-node massage-csv.ts "$@"