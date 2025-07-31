#!/bin/bash

# Production Feed Preparation Script
# This script:
# 1. Runs Redash query 33047
# 2. Processes the CSV through the massage script
# 3. Outputs a timestamped CSV file

set -e  # Exit on any error

# Configuration
QUERY_ID=33047
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
TEMP_DIR="temp"
RAW_CSV="${TEMP_DIR}/query_${QUERY_ID}_raw_${TIMESTAMP}.csv"
FINAL_CSV="prod_feed_${TIMESTAMP}.csv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Production Feed Preparation Script${NC}"
echo -e "Query ID: ${QUERY_ID}"
echo -e "Timestamp: ${TIMESTAMP}"
echo ""

# Create temp directory if it doesn't exist
if [ ! -d "$TEMP_DIR" ]; then
    echo -e "${YELLOW}📁 Creating temp directory...${NC}"
    mkdir -p "$TEMP_DIR"
fi

# Step 1: Execute Redash query
echo -e "${BLUE}📊 Step 1: Executing Redash query ${QUERY_ID}...${NC}"
if ! ./redash.sh execute "$QUERY_ID" "$RAW_CSV"; then
    echo -e "${RED}❌ Failed to execute Redash query${NC}"
    exit 1
fi

# Verify the raw CSV was created
if [ ! -f "$RAW_CSV" ]; then
    echo -e "${RED}❌ Raw CSV file was not created: $RAW_CSV${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Raw CSV file created: $RAW_CSV${NC}"

# Step 2: Process CSV through massage script
echo -e "${BLUE}🔄 Step 2: Processing CSV through massage script...${NC}"
if ! ./run.sh "$RAW_CSV" "$FINAL_CSV"; then
    echo -e "${RED}❌ Failed to process CSV through massage script${NC}"
    exit 1
fi

# Verify the final CSV was created
if [ ! -f "$FINAL_CSV" ]; then
    echo -e "${RED}❌ Final CSV file was not created: $FINAL_CSV${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Final CSV file created: $FINAL_CSV${NC}"

# Step 3: Cleanup temp files (optional)
echo -e "${BLUE}🧹 Step 3: Cleaning up temporary files...${NC}"
if [ -f "$RAW_CSV" ]; then
    rm "$RAW_CSV"
    echo -e "${GREEN}✅ Temporary file removed: $RAW_CSV${NC}"
fi

# Remove temp directory if empty
if [ -d "$TEMP_DIR" ] && [ -z "$(ls -A $TEMP_DIR)" ]; then
    rmdir "$TEMP_DIR"
    echo -e "${GREEN}✅ Temporary directory removed${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}🎉 Production feed preparation completed successfully!${NC}"
echo -e "${GREEN}📄 Output file: $FINAL_CSV${NC}"

# Show file info
if command -v wc &> /dev/null && [ -f "$FINAL_CSV" ]; then
    LINES=$(wc -l < "$FINAL_CSV")
    ROWS=$((LINES - 1))  # Subtract header row
    echo -e "${BLUE}📊 File contains: $ROWS data rows${NC}"
fi

echo ""
echo -e "${YELLOW}💡 To use this file:${NC}"
echo -e "   • Upload to your data pipeline"
echo -e "   • Import into your analytics system"
echo -e "   • Process with downstream applications"