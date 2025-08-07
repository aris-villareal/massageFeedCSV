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
    score: (parseFloat(inputRow.score) * 10000).toString()
  };
}

/**
 * Finds the most recent feed file before the current one
 */
function findPreviousFeedFile(currentOutputPath: string): string | null {
  try {
    const currentDir = path.dirname(currentOutputPath);
    const currentFileName = path.basename(currentOutputPath);
    
    // Extract timestamp from current file name (format: prod_feed_YYYYMMDD_HHMMSS.csv)
    const timestampMatch = currentFileName.match(/prod_feed_(\d{8}_\d{6})\.csv/);
    if (!timestampMatch) {
      console.log('⚠️  Current file does not match expected feed file pattern');
      return null;
    }
    
    const currentTimestamp = timestampMatch[1];
    
    // Find all prod_feed files in the directory
    const feedFiles = fs.readdirSync(currentDir)
      .filter(file => file.match(/^prod_feed_\d{8}_\d{6}\.csv$/))
      .filter(file => file !== currentFileName) // Exclude current file
      .sort()
      .reverse(); // Most recent first
    
    if (feedFiles.length === 0) {
      console.log('ℹ️  No previous feed files found for comparison');
      return null;
    }
    
    const previousFile = feedFiles[0];
    const previousPath = path.join(currentDir, previousFile);
    
    console.log(`🔍 Found previous feed file: ${previousFile}`);
    return previousPath;
    
  } catch (error) {
    console.warn('⚠️  Error finding previous feed file:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Reads a CSV file and extracts discussionIds
 */
function extractDiscussionIds(csvFilePath: string): Set<string> {
  try {
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    if (lines.length <= 1) {
      return new Set();
    }
    
    // Parse header to find discussionId column index
    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine);
    const discussionIdIndex = headers.indexOf('discussionId');
    
    if (discussionIdIndex === -1) {
      console.warn(`⚠️  discussionId column not found in ${csvFilePath}`);
      return new Set();
    }
    
    const discussionIds = new Set<string>();
    
    // Extract discussionIds from data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      
      const values = parseCsvLine(line);
      if (values.length > discussionIdIndex) {
        discussionIds.add(values[discussionIdIndex]);
      }
    }
    
    return discussionIds;
    
  } catch (error) {
    console.warn(`⚠️  Error reading CSV file ${csvFilePath}:`, error instanceof Error ? error.message : error);
    return new Set();
  }
}

/**
 * Compares two feed files and identifies entries that were removed
 */
function compareFeedsAndFindRemoved(currentFilePath: string, previousFilePath: string): void {
  console.log('\n🔄 Comparing feeds to identify removed entries...');
  
  const currentIds = extractDiscussionIds(currentFilePath);
  const previousIds = extractDiscussionIds(previousFilePath);
  
  console.log(`📊 Current feed contains ${currentIds.size} discussions`);
  console.log(`📊 Previous feed contained ${previousIds.size} discussions`);
  
  // Find discussionIds that were in previous but not in current
  const removedIds = Array.from(previousIds).filter(id => !currentIds.has(id));
  
  if (removedIds.length === 0) {
    console.log('✅ No discussions were removed from the feed');
    return;
  }
  
  console.log(`\n⚠️  Found ${removedIds.length} discussions that were removed:`);
  
  // Generate removed entries report as CSV
  const currentDir = path.dirname(currentFilePath);
  const currentFileName = path.basename(currentFilePath, '.csv');
  const reportPath = path.join(currentDir, `${currentFileName}-removed-entries.csv`);
  
  try {
    // Create CSV report with just the discussionIds
    const csvLines = ['discussionId']; // Header
    removedIds.forEach(id => csvLines.push(id));
    
    // Write CSV report file
    fs.writeFileSync(reportPath, csvLines.join('\n'), 'utf-8');
    
    console.log(`📄 Removed entries report saved to: ${reportPath}`);
    console.log('\n📋 Removed discussion IDs:');
    removedIds.forEach(id => console.log(`   • ${id}`));
    
  } catch (error) {
    console.error('❌ Error generating removed entries report:', error instanceof Error ? error.message : error);
    
    // Fallback: just list the IDs
    console.log('\n📋 Removed discussion IDs:');
    removedIds.forEach(id => console.log(`   • ${id}`));
  }
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
    console.log(`   • All score values multiplied by 10000`);
    
    // Compare with previous feed if this is a prod feed file
    const outputFileName = path.basename(outputFilePath);
    if (outputFileName.match(/^prod_feed_\d{8}_\d{6}\.csv$/)) {
      const previousFeedPath = findPreviousFeedFile(outputFilePath);
      if (previousFeedPath) {
        compareFeedsAndFindRemoved(outputFilePath, previousFeedPath);
      }
    }
    
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
3. Multiplying score values by 10000

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

export { processCsvFile, transformRow, findPreviousFeedFile, compareFeedsAndFindRemoved, extractDiscussionIds };