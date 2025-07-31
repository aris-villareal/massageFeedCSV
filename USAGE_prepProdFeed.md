# prepProdFeed Script Usage Guide

## Overview

The `prepProdFeed.sh` script automates the production feed preparation process by:

1. **Executing Redash query 33047** to fetch raw data
2. **Processing the CSV** through the massage script (transforms columns, entityTypes, and scores)  
3. **Generating a timestamped output file** with the final processed data

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Redash Connection
Create a `.env` file from the example:
```bash
cp redash-config.example .env
```

Edit `.env` with your actual Redash credentials:
```env
REDASH_BASE_URL=https://your-redash-instance.com
***REMOVED***your-api-key-here
```

### 3. Make Scripts Executable
```bash
chmod +x prepProdFeed.sh
chmod +x redash.sh  
chmod +x run.sh
```

## Usage

### Basic Usage
```bash
./prepProdFeed.sh
```

### What Happens
1. **Query Execution**: Runs Redash query `33047` and saves raw CSV to a temporary file
2. **Data Processing**: Applies transformations:
   - Converts column names to camelCase
   - Changes `entitytype` "update" values to "workspace" 
   - Multiplies `score` values by 100
3. **Output Generation**: Creates final CSV with timestamp: `prod_feed_YYYYMMDD_HHMMSS.csv`
4. **Cleanup**: Removes temporary files

### Example Output
```
🚀 Production Feed Preparation Script
Query ID: 33047
Timestamp: 20240131_143022

📊 Step 1: Executing Redash query 33047...
🚀 Executing query 33047...
📋 Query: Your Query Name
⏳ Job started with ID: abc123
✅ Query executed successfully in 2341ms
📄 Results exported to: temp/query_33047_raw_20240131_143022.csv
📊 1234 rows, 6 columns
✅ Raw CSV file created: temp/query_33047_raw_20240131_143022.csv

🔄 Step 2: Processing CSV through massage script...
✅ Successfully processed 1234 rows
📄 Input file: temp/query_33047_raw_20240131_143022.csv
📄 Output file: prod_feed_20240131_143022.csv

🎉 Production feed preparation completed successfully!
📄 Output file: prod_feed_20240131_143022.csv
📊 File contains: 1234 data rows
```

## File Structure

- **Input**: Redash query 33047 results
- **Temporary**: `temp/query_33047_raw_TIMESTAMP.csv` (auto-cleaned)
- **Output**: `prod_feed_TIMESTAMP.csv` (final processed file)

## Error Handling

The script will stop and show an error message if:
- Redash credentials are missing or invalid
- Query 33047 fails to execute
- CSV processing fails
- File operations fail

## Individual Component Usage

You can also run the components separately:

### Execute Redash Query Only
```bash
./redash.sh execute 33047 my_output.csv
```

### Process Existing CSV Only  
```bash
./run.sh input.csv output.csv
```

## Troubleshooting

### Common Issues

1. **"ts-node not found"**
   ```bash
   npm install
   ```

2. **"Missing Redash configuration"**
   - Ensure `.env` file exists with valid `REDASH_BASE_URL` and `REDASH_API_KEY`

3. **"Query execution failed"**
   - Verify query ID 33047 exists and you have access
   - Check your Redash API key permissions

4. **"Permission denied"**
   ```bash
   chmod +x prepProdFeed.sh redash.sh run.sh
   ```

### Getting Help

Run individual scripts without arguments to see usage information:
```bash
./redash.sh
./run.sh  
ts-node redash-query.ts
ts-node massage-csv.ts
```