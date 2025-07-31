#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface InputRow {
  discussionid: string;
  discussiontype: string;
  entityid: string;
  entitytype: string;
  discussioncreatedat: string;
  score: string;
}

interface OutputRow {
  discussionId: string;
  discussionType: string;
  entityId: string;
  entityType: string;
  discussionCreatedAt: string;
  score: string;
}

/**
 * Converts a CSV line to an array of values, handling quoted values properly
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Converts an array of values to a CSV line, quoting values that contain commas
 */
function toCsvLine(values: string[]): string {
  return values.map(value => {
    // Quote values that contain commas, quotes, or newlines
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(',');
}

/**
 * Transforms the input row according to the requirements
 */
function transformRow(inputRow: InputRow): OutputRow {
  return {
    discussionId: inputRow.discussionid,
    discussionType: inputRow.discussiontype,
    entityId: inputRow.entityid,
    entityType: inputRow.entitytype === 'update' ? 'workspace' : inputRow.entitytype,
    discussionCreatedAt: inputRow.discussioncreatedat,
    score: (parseFloat(inputRow.score) * 100).toString()
  };
}

/**
 * Processes a CSV file according to the specified transformations
 */
function processCsvFile(inputFilePath: string, outputFilePath?: string): void {
  try {
    // Read the input file
    const fileContent = fs.readFileSync(inputFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('Input file is empty');
    }
    
    // Parse header
    const headerLine = lines[0];
    const inputHeaders = parseCsvLine(headerLine);
    
    // Validate expected headers
    const expectedHeaders = ['discussionid', 'discussiontype', 'entityid', 'entitytype', 'discussioncreatedat', 'score'];
    const headerMismatch = expectedHeaders.find(expected => !inputHeaders.includes(expected));
    if (headerMismatch) {
      console.warn(`Warning: Expected header '${headerMismatch}' not found. Proceeding anyway...`);
    }
    
    // Define output headers (camelCase)
    const outputHeaders = ['discussionId', 'discussionType', 'entityId', 'entityType', 'discussionCreatedAt', 'score'];
    
    // Process data rows
    const outputLines: string[] = [toCsvLine(outputHeaders)];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue; // Skip empty lines
      
      const values = parseCsvLine(line);
      
      // Create input row object
      const inputRow: InputRow = {
        discussionid: values[inputHeaders.indexOf('discussionid')] || '',
        discussiontype: values[inputHeaders.indexOf('discussiontype')] || '',
        entityid: values[inputHeaders.indexOf('entityid')] || '',
        entitytype: values[inputHeaders.indexOf('entitytype')] || '',
        discussioncreatedat: values[inputHeaders.indexOf('discussioncreatedat')] || '',
        score: values[inputHeaders.indexOf('score')] || '0'
      };
      
      // Transform the row
      const outputRow = transformRow(inputRow);
      
      // Convert to output line
      const outputValues = [
        outputRow.discussionId,
        outputRow.discussionType,
        outputRow.entityId,
        outputRow.entityType,
        outputRow.discussionCreatedAt,
        outputRow.score
      ];
      
      outputLines.push(toCsvLine(outputValues));
    }
    
    // Generate output file path if not provided
    if (!outputFilePath) {
      const inputDir = path.dirname(inputFilePath);
      const inputName = path.basename(inputFilePath, path.extname(inputFilePath));
      outputFilePath = path.join(inputDir, `${inputName}_transformed.csv`);
    }
    
    // Write the output file
    const outputContent = outputLines.join('\n');
    fs.writeFileSync(outputFilePath, outputContent, 'utf-8');
    
    console.log(`✅ Successfully processed ${lines.length - 1} rows`);
    console.log(`📄 Input file: ${inputFilePath}`);
    console.log(`📄 Output file: ${outputFilePath}`);
    
    // Show summary of transformations
    const entityTypeChanges = outputLines.slice(1).filter(line => 
      parseCsvLine(line)[3] === 'workspace'
    ).length;
    
    console.log(`\n📊 Transformation Summary:`);
    console.log(`   • Column names converted to camelCase`);
    console.log(`   • ${entityTypeChanges} "update" values changed to "workspace"`);
    console.log(`   • All score values multiplied by 100`);
    
  } catch (error) {
    console.error('❌ Error processing CSV file:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: ts-node massage-csv.ts <input-file> [output-file]

This script transforms a CSV file by:
1. Converting column names to camelCase
2. Replacing "update" with "workspace" in entityType column
3. Multiplying score values by 100

Examples:
  ts-node massage-csv.ts data.csv
  ts-node massage-csv.ts data.csv output.csv
  node massage-csv.js data.csv
`);
    process.exit(0);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }
  
  processCsvFile(inputFile, outputFile);
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

export { processCsvFile, transformRow };