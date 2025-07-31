#!/usr/bin/env ts-node

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

interface RedashConfig {
  baseUrl: string;
  apiKey: string;
}

interface QueryResult {
  id?: number;
  query_hash?: string;
  query?: string;
  data?: {
    columns?: Array<{ name: string; friendly_name?: string; type: string }>;
    rows?: Array<Record<string, any>>; // Rows are objects, not arrays
  };
  columns?: Array<{ name: string; friendly_name?: string; type: string }>;
  rows?: Array<Record<string, any>>;
  data_source_id?: number;
  runtime?: number;
  retrieved_at?: string;
  query_result?: QueryResult; // Redash wraps response in query_result
}

interface Job {
  id: string;
  status: number; // 1=PENDING, 2=STARTED, 3=SUCCESS, 4=FAILURE, 5=RETRY
  result?: QueryResult | number; // Can be result object or result ID
  error?: string;
}

interface QueryInfo {
  id: number;
  name: string;
  description: string;
  query: string;
  data_source_id: number;
  latest_query_data_id?: number;
}

class RedashQueryExecutor {
  private client: AxiosInstance;
  private config: RedashConfig;

  constructor(config: RedashConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Key ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Get query information by ID
   */
  async getQuery(queryId: number): Promise<QueryInfo> {
    try {
      const response: AxiosResponse<QueryInfo> = await this.client.get(`/api/queries/${queryId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get query ${queryId}: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Execute a query and wait for results
   */
  async executeQuery(queryId: number, parameters: Record<string, any> = {}): Promise<QueryResult> {
    try {
      console.log(`🚀 Executing query ${queryId}...`);
      
      // First, get the query info
      const queryInfo = await this.getQuery(queryId);
      console.log(`📋 Query: ${queryInfo.name}`);
      
      // Start query execution
      const jobResponse = await this.client.post(`/api/queries/${queryId}/refresh`, {
        parameters
      });
      
      const job: Job = jobResponse.data.job;
      console.log(`⏳ Job started with ID: ${job.id}`);
      
      // Poll for job completion
      const result = await this.pollJobCompletion(job.id);
      
      const runtime = result.query_result?.runtime || result.runtime;
      console.log(`✅ Query executed successfully in ${runtime ? Math.round(runtime * 1000) + 'ms' : 'unknown time'}`);
      return result;
      
    } catch (error) {
      throw new Error(`Failed to execute query ${queryId}: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get query result by result ID
   */
  async getQueryResult(resultId: number): Promise<QueryResult> {
    try {
      const response: AxiosResponse<QueryResult> = await this.client.get(
        `/api/query_results/${resultId}.json`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get query result ${resultId}: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get the latest cached results for a query (if available)
   */
  async getCachedResults(queryId: number): Promise<QueryResult | null> {
    try {
      const queryInfo = await this.getQuery(queryId);
      
      if (!queryInfo.latest_query_data_id) {
        return null;
      }
      
      const response: AxiosResponse<QueryResult> = await this.client.get(
        `/api/queries/${queryId}/results/${queryInfo.latest_query_data_id}.json`
      );
      
      return response.data;
    } catch (error) {
      console.warn(`Could not get cached results: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Poll job status until completion
   */
  private async pollJobCompletion(jobId: string, maxAttempts: number = 60): Promise<QueryResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await this.client.get(`/api/jobs/${jobId}`);
        const job: Job = response.data.job;
        
        switch (job.status) {
          case 3: // SUCCESS
            if (!job.result) {
              throw new Error('Job completed but no result available');
            }
            // job.result is likely just the result ID, fetch the actual data
            const resultId = typeof job.result === 'number' ? job.result : job.result?.id;
            if (typeof resultId !== 'number') {
              throw new Error('Invalid result ID received from job');
            }
            return await this.getQueryResult(resultId);
            
          case 4: // FAILURE
            throw new Error(`Query execution failed: ${job.error || 'Unknown error'}`);
            
          case 1: // PENDING
          case 2: // STARTED
          case 5: // RETRY
            console.log(`⏳ Job status: ${this.getJobStatusName(job.status)} (attempt ${attempts + 1}/${maxAttempts})`);
            await this.sleep(2000); // Wait 2 seconds before next poll
            attempts++;
            break;
            
          default:
            throw new Error(`Unknown job status: ${job.status}`);
        }
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        await this.sleep(2000);
        attempts++;
      }
    }
    
    throw new Error('Query execution timed out');
  }

  /**
   * Export query results to CSV
   */
  async exportToCSV(result: QueryResult, outputPath: string): Promise<void> {
    // Handle Redash's response wrapper
    let actualResult = result;
    if (result.query_result) {
      actualResult = result.query_result;
    }
    
    // Try to find columns and rows in different possible locations
    let columns: Array<{ name: string; friendly_name?: string; type: string }>;
    let rows: Array<Record<string, any>>;
    
    // Check if data is nested under 'data' property
    if (actualResult.data?.columns && actualResult.data?.rows) {
      columns = actualResult.data.columns;
      rows = actualResult.data.rows;
    }
    // Check if columns and rows are direct properties
    else if (actualResult.columns && actualResult.rows) {
      columns = actualResult.columns;
      rows = actualResult.rows;
    }
    // No valid data structure found
    else {
      throw new Error(`Query result does not contain valid data structure. Found properties: ${Object.keys(actualResult).join(', ')}`);
    }
    
    if (!Array.isArray(columns)) {
      throw new Error('Columns is not an array');
    }
    
    if (!Array.isArray(rows)) {
      throw new Error('Rows is not an array');
    }
    
    // Create CSV header
    const header = columns.map(col => col.name).join(',');
    
    // Create CSV rows - convert objects to arrays in column order
    const csvRows = rows.map(rowObj => {
      const rowArray = columns.map(col => {
        const value = rowObj[col.name];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Convert to string and escape if needed
        const stringValue = String(value);
        
        // Quote values that contain commas, quotes, or newlines
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      
      return rowArray.join(',');
    });
    
    const csvContent = [header, ...csvRows].join('\n');
    
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    console.log(`📄 Results exported to: ${outputPath}`);
    console.log(`📊 ${rows.length} rows, ${columns.length} columns`);
  }

  /**
   * List recent queries (useful for discovery)
   */
  async listQueries(page: number = 1, pageSize: number = 25): Promise<any> {
    try {
      const response = await this.client.get('/api/queries', {
        params: {
          page,
          page_size: pageSize,
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list queries: ${this.getErrorMessage(error)}`);
    }
  }

  private getJobStatusName(status: number): string {
    const statusNames = {
      1: 'PENDING',
      2: 'STARTED', 
      3: 'SUCCESS',
      4: 'FAILURE',
      5: 'RETRY'
    };
    return statusNames[status as keyof typeof statusNames] || 'UNKNOWN';
  }

  private getErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔍 Redash Query Executor

Usage: ts-node redash-query.ts <command> [options]

Commands:
  execute <query-id> [output-file]     Execute a query and optionally save to CSV
  cached <query-id> [output-file]      Get cached results for a query
  list [page]                          List recent queries
  info <query-id>                      Get query information

Environment Variables (create .env file):
  REDASH_BASE_URL=https://your-redash-instance.com
  REDASH_API_KEY=your-api-key

Examples:
  ts-node redash-query.ts execute 123
  ts-node redash-query.ts execute 123 results.csv
  ts-node redash-query.ts cached 123 cached-results.csv
  ts-node redash-query.ts list
  ts-node redash-query.ts info 123
`);
    process.exit(0);
  }

  const command = args[0];
  
  // Check configuration
  const baseUrl = process.env.REDASH_BASE_URL;
  const apiKey = process.env.REDASH_API_KEY;
  
  if (!baseUrl || !apiKey) {
    console.error(`❌ Missing configuration. Please create a .env file with:
REDASH_BASE_URL=https://your-redash-instance.com
REDASH_API_KEY=your-api-key`);
    process.exit(1);
  }

  const executor = new RedashQueryExecutor({ baseUrl, apiKey });

  try {
    switch (command) {
      case 'execute': {
        const queryId = parseInt(args[1]);
        if (isNaN(queryId)) {
          console.error('❌ Invalid query ID');
          process.exit(1);
        }
        
        const result = await executor.executeQuery(queryId);
        
        const outputFile = args[2];
        if (outputFile) {
          await executor.exportToCSV(result, outputFile);
        } else {
          // Generate default filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const defaultFile = `query_${queryId}_${timestamp}.csv`;
          await executor.exportToCSV(result, defaultFile);
        }
        break;
      }
      
      case 'cached': {
        const queryId = parseInt(args[1]);
        if (isNaN(queryId)) {
          console.error('❌ Invalid query ID');
          process.exit(1);
        }
        
        const result = await executor.getCachedResults(queryId);
        if (!result) {
          console.log('⚠️  No cached results available. Try executing the query first.');
          process.exit(0);
        }
        
        const timestamp = result.query_result?.retrieved_at || result.retrieved_at;
        console.log(`📋 Using cached results from: ${timestamp || 'unknown time'}`);
        
        const outputFile = args[2];
        if (outputFile) {
          await executor.exportToCSV(result, outputFile);
        } else {
          // Generate default filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const defaultFile = `query_${queryId}_cached_${timestamp}.csv`;
          await executor.exportToCSV(result, defaultFile);
        }
        break;
      }
      
      case 'list': {
        const page = parseInt(args[1]) || 1;
        const queries = await executor.listQueries(page);
        
        console.log(`\n📋 Recent Queries (Page ${page}):\n`);
        queries.results.forEach((query: any) => {
          console.log(`ID: ${query.id} | ${query.name}`);
          if (query.description) {
            console.log(`   Description: ${query.description}`);
          }
          console.log('');
        });
        
        console.log(`Total: ${queries.count} queries`);
        break;
      }
      
      case 'info': {
        const queryId = parseInt(args[1]);
        if (isNaN(queryId)) {
          console.error('❌ Invalid query ID');
          process.exit(1);
        }
        
        const query = await executor.getQuery(queryId);
        console.log(`\n📋 Query Information:\n`);
        console.log(`ID: ${query.id}`);
        console.log(`Name: ${query.name}`);
        console.log(`Description: ${query.description || 'No description'}`);
        console.log(`Data Source ID: ${query.data_source_id}`);
        console.log(`\nQuery:\n${query.query}`);
        break;
      }
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { RedashQueryExecutor };