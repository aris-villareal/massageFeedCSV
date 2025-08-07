# CSV Feed Massage Tool

A TypeScript project that provides:
1. **🚀 Production Feed Automation** - complete workflow from Redash query to processed CSV
2. **CSV transformation tool** - transforms CSV feed data with specific operations
3. **Redash query executor** - executes Redash queries and exports results to CSV

## 🗺️ Quick Navigation

- **🚀 [Production Workflow](#-production-feed-automation-prepprodFeed)** - Start here for automated production feeds
- **🔧 [CSV Transform Tool](#csv-transformation-tool)** - Individual CSV processing
- **📊 [Redash Query Tool](#redash-query-executor)** - Individual query execution
- **📚 [Detailed Guide](USAGE_prepProdFeed.md)** - Complete documentation

## 🚀 Production Feed Automation (prepProdFeed)

**For production use, start here!** The `prepProdFeed.sh` script provides a complete automated workflow:

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Configure Redash (one-time setup)
cp redash-config.example .env
# Edit .env with your Redash URL and API key

# 3. Make scripts executable
chmod +x prepProdFeed.sh redash.sh run.sh

# 4. Run the complete production workflow
./prepProdFeed.sh

```
5. Use the collection runner in this Feed Service [collection](https://postman.postman.co/workspace/6dc19bf3-4a25-4d04-88f2-ec91e0f7ae10/folder/34230463-dae351f7-d758-4a51-bd39-7542a257718b) to add all the feed items from the generated `prod_feed_<date>_<time>.csv`. See [loom](https://www.loom.com/share/9d6eb0a267774f0c9d00ec59bdc9a9f5?sid=dd5ef6ef-7396-443b-96d0-da0ed2d4ad33) for steps.

6. Delete the feed items from the generated `prod_feed_<date>_<time>-removed-entries.csv`

### What It Does
1. **📊 Fetches Data**: Executes Redash query 33047 and exports raw CSV
2. **🔄 Transforms Data**: Applies all transformations (camelCase columns, entityType fixes, score scaling)
3. **📄 Outputs Final File**: Creates timestamped production-ready CSV: `prod_feed_YYYYMMDD_HHMMSS.csv`
4. **🧹 Cleanup**: Removes temporary files automatically

### Example Output
```
🚀 Production Feed Preparation Script
Query ID: 33047
Timestamp: 20240731_143022

📊 Step 1: Executing Redash query 33047...
✅ Query executed successfully in 123ms
📄 Results exported to: temp/query_33047_raw_20240731_143022.csv

🔄 Step 2: Processing CSV through massage script...
✅ Successfully processed 1,234 rows
📄 Output file: prod_feed_20240731_143022.csv

🎉 Production feed preparation completed successfully!
📄 Final file: prod_feed_20240731_143022.csv
📊 File contains: 1,234 data rows
```

> 💡 **Tip**: This is the recommended way to generate production feeds. It combines query execution + data transformation in one command with proper error handling and cleanup.

### Detailed Documentation
📚 **[Complete prepProdFeed Usage Guide](USAGE_prepProdFeed.md)** - Comprehensive documentation with troubleshooting, examples, and advanced usage.

### Common Issues & Quick Fixes
- **"ts-node not found"** → Run `npm install`
- **"Missing Redash configuration"** → Create `.env` file from `redash-config.example`
- **"Permission denied"** → Run `chmod +x prepProdFeed.sh redash.sh run.sh`
- **"Query execution failed"** → Verify query ID 33047 exists and check API key permissions

---

## CSV Transformation Tool

A TypeScript script that transforms CSV feed data with the following operations:

1. **Column name transformation**: Converts column names to camelCase
   - `discussionid` → `discussionId`
   - `discussiontype` → `discussionType`
   - `entityid` → `entityId`
   - `entitytype` → `entityType`
   - `discussioncreatedat` → `discussionCreatedAt`
   - `score` → `score` (already camelCase)

2. **Entity type transformation**: Replaces "update" with "workspace" in the `entityType` column

3. **Score transformation**: Multiplies all score values by 10000

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Command Line

Run with ts-node (recommended):
```bash
# Process a file (output will be automatically named)
npm run start input.csv

# Process with custom output name
npm run start input.csv output.csv

# Process the sample file
npm run process
```

Or run directly:
```bash
npx ts-node massage-csv.ts input.csv [output.csv]
```

### Programmatic Usage

```typescript
import { processCsvFile } from './massage-csv';

// Process a file
processCsvFile('input.csv', 'output.csv');
```

## Example

Input CSV:
```csv
discussionid,discussiontype,entityid,entitytype,discussioncreatedat,score
56270,2,405e0480-49cf-463b-8052-6c0d05a8e8f3,update,2025-07-30 15:18:28.000000,0.952579225657124
56228,4,Pen1BQq4V4oQ,notebook,2025-07-29 17:21:03.000000,0.891466666666667
```

Output CSV:
```csv
discussionId,discussionType,entityId,entityType,discussionCreatedAt,score
56270,2,405e0480-49cf-463b-8052-6c0d05a8e8f3,workspace,2025-07-30 15:18:28.000000,9525.79225657124
56228,4,Pen1BQq4V4oQ,notebook,2025-07-29 17:21:03.000000,8914.66666666667
```

## Output

- The script automatically generates an output filename by appending `_transformed` to the input filename
- Provides a summary of transformations performed
- Handles CSV parsing correctly including quoted values and commas within fields

## Redash Query Executor

A TypeScript script that can execute Redash queries via API and export results to CSV.

### Setup

1. Copy the configuration template:
   ```bash
   cp redash-config.example .env
   ```

2. Edit `.env` file with your Redash instance details:
   ```
   REDASH_BASE_URL=https://your-redash-instance.com
   REDASH_API_KEY=your-api-key
   ```

3. Find your API key in your Redash user profile settings.

### Usage

Using npm scripts (recommended):
```bash
# Execute a query and save to CSV
npm run redash execute 123

# Execute a query with custom output filename
npm run redash execute 123 my-results.csv

# Get cached results (faster, if available)
npm run redash cached 123

# List recent queries to find query IDs
npm run redash list

# Get information about a specific query
npm run redash info 123
```

Alternative using the shell script:
```bash
# Execute a query and save to CSV
./redash.sh execute 123

# Execute a query with custom output filename
./redash.sh execute 123 my-results.csv

# Get cached results
./redash.sh cached 123

# List recent queries
./redash.sh list

# Get information about a specific query
./redash.sh info 123
```

### Features

- **Query execution**: Execute any Redash query by ID
- **Cached results**: Retrieve cached results without re-running the query
- **CSV export**: Automatically export results to CSV format
- **Query discovery**: List and inspect available queries
- **Progress monitoring**: Real-time status updates during query execution
- **Error handling**: Comprehensive error reporting and timeout handling

### Examples

```bash
# Execute marketing dashboard query
npm run redash execute 456 marketing-data.csv

# Get last week's cached user metrics
npm run redash cached 789 user-metrics.csv

# Find queries containing "revenue" in the name
npm run redash list | grep -i revenue
```

## Requirements

- **Node.js 16+**
- **TypeScript**
- **ts-node** (for direct execution)
- **Redash instance with API access** (for Redash functionality and prepProdFeed)
- **Bash shell** (for prepProdFeed automation script)

> 💡 **Quick Start**: Most users should start with [prepProdFeed](#-production-feed-automation-prepprodFeed) for the complete automated workflow.