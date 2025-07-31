# CSV Feed Massage Tool

A TypeScript project that provides:
1. **CSV transformation tool** - transforms CSV feed data with specific operations
2. **Redash query executor** - executes Redash queries and exports results to CSV

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

3. **Score transformation**: Multiplies all score values by 100

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
56270,2,405e0480-49cf-463b-8052-6c0d05a8e8f3,workspace,2025-07-30 15:18:28.000000,95.2579225657124
56228,4,Pen1BQq4V4oQ,notebook,2025-07-29 17:21:03.000000,89.1466666666667
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
   REDASH_API_KEY=your-api-key-here
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

- Node.js 16+
- TypeScript
- ts-node (for direct execution)
- Redash instance with API access (for Redash functionality)