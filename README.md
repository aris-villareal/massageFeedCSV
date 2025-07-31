# CSV Feed Massage Tool

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

## Requirements

- Node.js 16+
- TypeScript
- ts-node (for direct execution)