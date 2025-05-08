// app/api/bulk-find-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'; // Import Clerk's auth
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // Import S3 client
import crypto from 'crypto'; // For generating unique IDs
import { 
  AthenaClient, 
  StartQueryExecutionCommand, 
  GetQueryExecutionCommand, 
  GetQueryResultsCommand 
} from '@aws-sdk/client-athena';
import { 
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand
} from '@aws-sdk/client-dynamodb';
import { 
  SESClient,
  VerifyEmailAddressCommand
} from '@aws-sdk/client-ses';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to verify email with AWS SES
async function verifyEmailWithSES(email: string, sesClient: SESClient): Promise<boolean> {
  if (!isValidEmail(email)) {
    return false;
  }
  
  try {
    await sesClient.send(new VerifyEmailAddressCommand({ EmailAddress: email }));
    return true;
  } catch (error: unknown) {
    console.error('Error verifying email with SES:', error);
    return false;
  }
}

// Helper function to validate and normalize email before processing
async function validateAndNormalizeEmail(email: string): Promise<string | null> {
  if (!email) return null;
  
  // Basic format validation
  if (!isValidEmail(email)) {
    console.warn(`Invalid email format: ${email}`);
    return null;
  }
  
  // Normalize email (lowercase)
  const normalizedEmail = email.trim().toLowerCase();
  
  // Check for common disposable email domains
  const disposableDomains = ['mailinator.com', 'tempmail.com', 'throwawaymail.com', 'guerrillamail.com'];
  const domain = normalizedEmail.split('@')[1];
  
  if (disposableDomains.some(disposable => domain.includes(disposable))) {
    console.warn(`Disposable email detected: ${normalizedEmail}`);
    return null;
  }
  
  // Check for obviously fake patterns
  const suspiciousPatterns = ['test@', 'fake@', 'example@', 'user@'];
  if (suspiciousPatterns.some(pattern => normalizedEmail.startsWith(pattern))) {
    console.warn(`Suspicious email pattern detected: ${normalizedEmail}`);
    return null;
  }
  
  return normalizedEmail;
}

// Define an interface for the expected record structure
interface BulkRecord {
  firstName: string;
  lastName: string;
  linkedin: string;
  companyName: string;
  // Add other potential columns if needed, marking them as optional
  personalEmails?: string[]; // Allow personalEmails to be an array of strings
  [key: string]: string | number | string[] | null | undefined; // Allow for other columns with specific types
}

// Helper function to check DynamoDB cache for a record
async function checkCache(record: BulkRecord, dynamoClient: DynamoDBClient): Promise<string | null> {
  const { firstName, lastName, linkedin, companyName } = record;
  
  // Create a cache key based on the record data
  const cacheKey = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${companyName.toLowerCase()}_${linkedin.toLowerCase()}`;
  
  try {
    const params = {
      TableName: process.env.DYNAMODB_CACHE_TABLE || 'email-lookup-cache',
      Key: {
        'cacheKey': { S: cacheKey }
      }
    };
    
    const result = await dynamoClient.send(new GetItemCommand(params));
    
    if (result.Item && result.Item.email && result.Item.email.S) {
      console.log('Cache hit for:', cacheKey);
      return result.Item.email.S;
    }
    
    return null; // Cache miss
  } catch (error: unknown) {
    console.error('Error checking DynamoDB cache:', error);
    return null; // Proceed without cache on error
  }
}

// Helper function to store result in DynamoDB cache
async function storeInCache(record: BulkRecord, email: string, dynamoClient: DynamoDBClient): Promise<void> {
  if (!email) return; // Don't cache null results
  
  const { firstName, lastName, linkedin, companyName } = record;
  const cacheKey = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${companyName.toLowerCase()}_${linkedin.toLowerCase()}`;
  
  try {
    const params = {
      TableName: process.env.DYNAMODB_CACHE_TABLE || 'email-lookup-cache',
      Item: {
        'cacheKey': { S: cacheKey },
        'email': { S: email },
        'ttl': { N: (Math.floor(Date.now() / 1000) + 86400 * 30).toString() } // 30 days TTL
      }
    };
    
    await dynamoClient.send(new PutItemCommand(params));
    console.log('Stored in cache:', cacheKey);
  } catch (error: unknown) {
    console.error('Error storing in DynamoDB cache:', error);
    // Continue even if caching fails
  }
}

// Helper function to extract LinkedIn username from URL
function extractLinkedInUsername(url: string): string {
  // Try to extract username from various LinkedIn URL formats
  const match = url.match(/linkedin\.com\/in\/(([\w-])+)/i);
  return match ? match[1] : url;
}

// Helper function to query Athena for a single record
async function findEmailInAthena(record: BulkRecord, athenaClient: AthenaClient, dynamoClient: DynamoDBClient): Promise<string | null> {
  const { firstName, lastName, linkedin, companyName } = record;

  // Enhanced validation with detailed logging
  if (!firstName || !lastName || !linkedin || !companyName) {
    const missingFields = [];
    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');
    if (!linkedin) missingFields.push('linkedin');
    if (!companyName) missingFields.push('companyName');
    
    console.warn(`Skipping record due to missing data (${missingFields.join(', ')}):`, record);
    return null; // Skip records with missing essential data
  }
  
  // First check cache
  const cachedEmail = await checkCache(record, dynamoClient);
  if (cachedEmail) {
    console.log(`Cache hit for ${firstName} ${lastName} at ${companyName}`);
    return cachedEmail;
  }
  
  // Extract LinkedIn username for better matching
  const linkedinUsername = extractLinkedInUsername(linkedin);
  
  // Build the optimized SQL query with better filtering and sanitization
  // Note: In a production environment, use parameterized queries to prevent SQL injection
  const sanitizedFirstName = firstName.replace(/'/g, "''");
  const sanitizedLastName = lastName.replace(/'/g, "''");
  const sanitizedLinkedin = linkedin.replace(/'/g, "''");
  const sanitizedLinkedinUsername = linkedinUsername.replace(/'/g, "''");
  const sanitizedCompanyName = companyName.replace(/'/g, "''");
  
  const query = `
    SELECT BUSINESS_EMAIL, PERSONAL_EMAILS
    FROM my_table
    WHERE
      (FIRST_NAME = '${sanitizedFirstName}' OR FIRST_NAME LIKE '${sanitizedFirstName}%')
      AND (LAST_NAME = '${sanitizedLastName}' OR LAST_NAME LIKE '${sanitizedLastName}%')
      AND (LINKEDIN_URL = '${sanitizedLinkedin}' 
           OR LINKEDIN_URL LIKE '%${sanitizedLinkedin}%' 
           OR LINKEDIN_URL LIKE '%${sanitizedLinkedinUsername}%')
      AND COMPANY_NAME LIKE '%${sanitizedCompanyName}%'
    LIMIT 1
  `;

  try {
    // Implement retry logic for Athena queries with improved error handling
    const MAX_RETRIES = 3;
    let retries = 0;
    let queryExecutionId = null;
    
    console.log(`Searching for email for ${firstName} ${lastName} at ${companyName}`);
    
    while (retries < MAX_RETRIES && !queryExecutionId) {
      try {
        const startQueryResponse = await athenaClient.send(
          new StartQueryExecutionCommand({
            QueryString: query,
            ResultConfiguration: {
              OutputLocation: process.env.ATHENA_OUTPUT_LOCATION!, 
            },
          })
        );
        
        queryExecutionId = startQueryResponse.QueryExecutionId;
        console.log(`Query execution started with ID: ${queryExecutionId}`);
      } catch (error) {
        retries++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Athena query attempt ${retries} failed: ${errorMessage}`);
        
        // Check for specific error types and handle accordingly
        if (error instanceof Error) {
          if (error.name === 'InvalidRequestException') {
            console.error('Invalid query syntax or configuration');
          } else if (error.name === 'ThrottlingException') {
            console.error('Query throttled by AWS, implementing longer backoff');
            await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Longer backoff for throttling
            continue;
          }
        }
        
        if (retries >= MAX_RETRIES) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      }
    }

    if (!queryExecutionId) {
      console.error('Query execution failed to start for record after retries:', record);
      return null;
    }

    // Poll until the query completes with exponential backoff and improved error handling
    let queryState = 'RUNNING';
    let pollAttempt = 0;
    const MAX_POLL_ATTEMPTS = 10;
    
    console.log(`Polling for query results (ID: ${queryExecutionId})`);
    
    while ((queryState === 'RUNNING' || queryState === 'QUEUED') && pollAttempt < MAX_POLL_ATTEMPTS) {
      const backoffTime = Math.min(1000 * Math.pow(2, pollAttempt), 10000); // Exponential backoff with 10s max
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      
      try {
        const queryExecutionResponse = await athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
        );
        
        queryState = queryExecutionResponse.QueryExecution?.Status?.State || 'FAILED';
        const stateReason = queryExecutionResponse.QueryExecution?.Status?.StateChangeReason || '';
        
        console.log(`Query state: ${queryState}${stateReason ? ` - ${stateReason}` : ''}`);
        
        // If query failed, log the reason and break out of the loop
        if (queryState === 'FAILED') {
          console.error(`Query execution failed: ${stateReason}`);
          break;
        }
      } catch (error: unknown) {
        console.error(`Error polling query status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue polling despite errors in status check
      }
      
      pollAttempt++;
    }
    
    // Log if we hit the maximum polling attempts
    if (pollAttempt >= MAX_POLL_ATTEMPTS && (queryState === 'RUNNING' || queryState === 'QUEUED')) {
      console.warn(`Reached maximum polling attempts (${MAX_POLL_ATTEMPTS}) for query ${queryExecutionId}`);
    }

    if (queryState !== 'SUCCEEDED') {
      console.error(`Athena query failed (${queryState}) for record:`, record);
      return null;
    }

    // Retrieve results with improved error handling
    try {
      console.log(`Retrieving results for query ${queryExecutionId}`);
      const resultsResponse = await athenaClient.send(
        new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId })
      );

      const rows = resultsResponse.ResultSet?.Rows;
      if (!rows || rows.length < 2) {
        console.log(`No matching records found for ${firstName} ${lastName} at ${companyName}`);
        return null; // No match found
      }
      
      console.log(`Found matching record for ${firstName} ${lastName} at ${companyName}`);
    } catch (error: unknown) {
      console.error(`Error retrieving query results: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null; // Return null on error
    }

    // Get the actual rows from the response
    const rows = (await athenaClient.send(
      new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId })
    )).ResultSet?.Rows;
    
    if (!rows || rows.length < 2) {
      return null; // Double-check no match found
    }

    const dataRow = rows[1];
    const rawEmail = dataRow.Data?.[0]?.VarCharValue || null;
    let personalEmails: string[] | null = null;
    
    // Check if personal emails exist in the second column
    if (dataRow.Data && dataRow.Data.length > 1 && dataRow.Data[1]?.VarCharValue) {
      try {
        // Personal emails might be stored as a comma-separated string or JSON array
        const personalEmailsValue = dataRow.Data[1].VarCharValue;
        if (personalEmailsValue.startsWith('[') && personalEmailsValue.endsWith(']')) {
          // Try parsing as JSON array
          personalEmails = JSON.parse(personalEmailsValue);
        } else if (personalEmailsValue.includes(',')) {
          // Try parsing as comma-separated string
          personalEmails = personalEmailsValue.split(',').map(email => email.trim());
        } else if (personalEmailsValue.trim()) {
          // Single email
          personalEmails = [personalEmailsValue.trim()];
        }
      } catch (e) {
        console.error('Error parsing personal emails:', e);
      }
    }
    
    // Validate and normalize email before returning
    const validatedEmail = rawEmail ? await validateAndNormalizeEmail(rawEmail) : null;
    
    // If valid email found, store in cache
    if (validatedEmail) {
      await storeInCache(record, validatedEmail, dynamoClient);
    }
    
    // Store personal emails in the record for later use
    if (personalEmails && personalEmails.length > 0) {
      record.personalEmails = personalEmails;
    }
    
    return validatedEmail;

  } catch (error) {
    console.error('Error querying Athena for record:', record, error);
    return null; // Indicate error for this record
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth(); // Get user ID from Clerk

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get pagination parameters from query string
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '100', 10);
  
  // Validate pagination parameters
  if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1 || pageSize > 1000) {
    return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Check file type (basic check)
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        return NextResponse.json({ error: 'Invalid file type. Please upload a CSV or XLSX file.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let records: BulkRecord[] = [];

    // Parse file content
    if (file.name.endsWith('.csv')) {
      const csvData = fileBuffer.toString('utf-8');
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        console.error('CSV parsing errors:', parsed.errors);
        return NextResponse.json({ error: 'Error parsing CSV file.' }, { status: 400 });
      }
      records = parsed.data as BulkRecord[];
    } else { // .xlsx
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      records = XLSX.utils.sheet_to_json(worksheet) as BulkRecord[];
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'File is empty or could not be parsed.' }, { status: 400 });
    }

    // --- Assume column names match: firstName, lastName, linkedin, companyName ---
    // --- You might need to add mapping logic if column names differ --- 
    const requiredColumns = ['firstName', 'lastName', 'linkedin', 'companyName'];
    const actualColumns = Object.keys(records[0] || {});
    const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));

    if (missingColumns.length > 0) {
        return NextResponse.json({ error: `Missing required columns: ${missingColumns.join(', ')}` }, { status: 400 });
    }

    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    // Extract just the bucket name from the S3_BUCKET_NAME environment variable
    // Format could be either 's3://bucketname/path/' or just 'bucketname'
    const s3BucketNameFull = process.env.S3_BUCKET_NAME!.replace('s3://', '');
    // Split by '/' and take the first part as the bucket name
    const s3BucketName = s3BucketNameFull.split('/')[0];
    
    // Determine the prefix - if the env var had a path, use it as part of the prefix
    let prefix = '';
    if (s3BucketNameFull.includes('/')) {
      // Get everything after the bucket name as the base prefix
      const basePrefix = s3BucketNameFull.substring(s3BucketName.length + 1);
      prefix = `${basePrefix}user-data/${userId}/bulk-find-email/`;
    } else {
      prefix = `user-data/${userId}/bulk-find-email/`;
    }
    
    // Generate a unique ID for this bulk request based on file content hash and timestamp
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const timestamp = Date.now();
    const bulkRequestId = `${timestamp}-${fileHash.substring(0, 8)}`;
    const s3Key = `${prefix}${bulkRequestId}-results.json`; // S3 key for results

    // Initialize Athena client
    const athenaClient = new AthenaClient({
      region: process.env.AWS_REGION || 'ap-south-1', // Use env var or default
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    // Initialize DynamoDB client for caching
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    // Initialize SES client for email verification
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Apply pagination to records
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRecords = records.slice(startIndex, endIndex);
    
    // Process records with controlled concurrency
    const BATCH_SIZE = 10; // Process 10 records at a time
    const results: (string | null)[] = [];
    
    for (let i = 0; i < paginatedRecords.length; i += BATCH_SIZE) {
      const batch = paginatedRecords.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(record => findEmailInAthena(record, athenaClient, dynamoClient))
      );
      results.push(...batchResults);
    }

    // Combine original record with found email and verify emails
    const responseData = await Promise.all(paginatedRecords.map(async (record, index) => {
      const foundEmail = results[index];
      let isVerified = false;
      let emailQuality = null;
      
      if (foundEmail) {
        // Verify email with SES
        isVerified = await verifyEmailWithSES(foundEmail, sesClient);
        
        // Determine email quality based on domain
        const domain = foundEmail.split('@')[1];
        if (domain) {
          if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'].includes(domain)) {
            emailQuality = 'personal';
          } else {
            emailQuality = 'business';
          }
        }
      }
      
      return {
        ...record,
        foundEmail,
        personalEmails: record.personalEmails || [],
        isVerified: foundEmail ? isVerified : null,
        emailQuality,
        processedAt: new Date().toISOString()
      };
    }));
    
    // Add rate limiting information to the response
    const rateLimitInfo = {
      dailyLimit: 1000,
      remainingToday: 1000 - records.length,
      resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    };

    // Store the results in S3
    try {
      // Calculate success metrics
      const totalRecords = paginatedRecords.length;
      const successCount = results.filter(email => email !== null).length;
      const verifiedCount = responseData.filter(item => item.isVerified === true).length;
      
      const metadata = {
        searchId: bulkRequestId,
        fileName: file.name,
        recordCount: totalRecords,
        successCount: successCount,
        verifiedCount: verifiedCount,
        totalRecordsInFile: records.length,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(records.length / pageSize),
        timestamp: new Date().toISOString()
      };
      
      const putObjectParams = {
        Bucket: s3BucketName,
        Key: s3Key,
        Body: JSON.stringify({
          ...metadata,
          rateLimitInfo,
          results: responseData
        }),
        ContentType: 'application/json',
      };
      
      await s3Client.send(new PutObjectCommand(putObjectParams));
      console.log(`Successfully stored bulk results in S3 for user ${userId}, request ${bulkRequestId}`);
      
      return NextResponse.json({
        ...metadata,
        rateLimitInfo,
        results: responseData,
        bulkRequestId: bulkRequestId
      });
      
    } catch (s3Error) {
      console.error('Error storing bulk result in S3:', s3Error);
      // Still return the data even if S3 storage fails
      return NextResponse.json({
        results: responseData,
        bulkRequestId: bulkRequestId,
        rateLimitInfo,
        warning: 'Results processed successfully but could not be stored for future reference.'
      });
    }
  } catch (error) {
    console.error('Error processing bulk email find request:', error);
    // Differentiate between file processing errors and Athena errors if needed
    if (error instanceof Error && (error.message.includes('parsing') || error.message.includes('column'))) {
        return NextResponse.json({ error: `File processing error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred during bulk processing.' }, { status: 500 });
  }
}