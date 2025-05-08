// app/api/find-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server'; // Import Clerk's auth
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'; // Import S3 client
import { Readable } from 'stream';
import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-athena';

// Helper function to convert stream to string
async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth(); // Get user ID from Clerk

  if (!userId) {
    // Removed debugging log
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('--- userId found:', userId, 'Proceeding with request ---'); // Added log

  try {
    const { firstName, lastName, linkedin, companyName } = await request.json();
    
    // Helper function to extract LinkedIn username from URL
    const extractLinkedInUsername = (url: string): string => {
      // Try to extract username from various LinkedIn URL formats
      const match = url.match(/linkedin\.com\/in\/([\w-]+)/i);
      return match ? match[1] : url;
    };

    if (!firstName || !lastName || !linkedin || !companyName) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    // Build the SQL query.
    // NOTE: In production, sanitize inputs to prevent SQL injection.
    // Extract LinkedIn username for better matching
    const linkedinUsername = extractLinkedInUsername(linkedin);
    
    // First try with all criteria
    const query = `
      SELECT BUSINESS_EMAIL, PERSONAL_EMAILS
      FROM my_table
      WHERE
        (FIRST_NAME = '${firstName}' OR FIRST_NAME LIKE '${firstName}%')
        AND (LAST_NAME = '${lastName}' OR LAST_NAME LIKE '${lastName}%')
        AND (LINKEDIN_URL = '${linkedin}' 
             OR LINKEDIN_URL LIKE '%${linkedin}%' 
             OR LINKEDIN_URL LIKE '%${linkedinUsername}%')
        AND COMPANY_NAME LIKE '%${companyName}%'
      LIMIT 1
    `;
    
    // Function to try fallback queries if the main one doesn't return results
    const tryFallbackQueries = async (athenaClient: AthenaClient, mainQueryExecutionId: string): Promise<{email: string | null, personalEmails: string[] | null, errorMessage: string | null}> => {
      // Check if main query returned results
      const mainQueryResults = await athenaClient.send(
        new GetQueryResultsCommand({ QueryExecutionId: mainQueryExecutionId })
      );
      
      const mainRows = mainQueryResults.ResultSet?.Rows;
      if (mainRows && mainRows.length >= 2) {
        const dataRow = mainRows[1];
        const email = dataRow.Data?.[0]?.VarCharValue || null;
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
        
        if (email || (personalEmails && personalEmails.length > 0)) {
          return { email, personalEmails, errorMessage: null };
        }
      }
      
      // If no results, try with just name and company
      console.log('No results with full criteria, trying fallback query...');
      const fallbackQuery = `
        SELECT BUSINESS_EMAIL, PERSONAL_EMAILS
        FROM my_table
        WHERE
          (FIRST_NAME = '${firstName}' OR FIRST_NAME LIKE '${firstName}%')
          AND (LAST_NAME = '${lastName}' OR LAST_NAME LIKE '${lastName}%')
          AND COMPANY_NAME LIKE '%${companyName}%'
        LIMIT 1
      `;
      
      const fallbackQueryResponse = await athenaClient.send(
        new StartQueryExecutionCommand({
          QueryString: fallbackQuery,
          ResultConfiguration: {
            OutputLocation: process.env.ATHENA_OUTPUT_LOCATION,
          },
        })
      );
      
      const fallbackQueryId = fallbackQueryResponse.QueryExecutionId;
      if (!fallbackQueryId) {
        return { email: null, personalEmails: null, errorMessage: 'Fallback query failed to start.' };
      }
      
      // Poll until the fallback query completes
      let queryState = 'RUNNING';
      while (queryState === 'RUNNING' || queryState === 'QUEUED') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const queryExecutionResponse = await athenaClient.send(
          new GetQueryExecutionCommand({ QueryExecutionId: fallbackQueryId })
        );
        queryState =
          queryExecutionResponse.QueryExecution?.Status?.State || 'FAILED';
      }
      
      if (queryState !== 'SUCCEEDED') {
        return { email: null, personalEmails: null, errorMessage: 'Fallback query did not succeed.' };
      }
      
      // Get fallback query results
      const fallbackResults = await athenaClient.send(
        new GetQueryResultsCommand({ QueryExecutionId: fallbackQueryId })
      );
      
      const fallbackRows = fallbackResults.ResultSet?.Rows;
      if (!fallbackRows || fallbackRows.length < 2) {
        return { 
          email: null,
          personalEmails: null,
          errorMessage: 'No matching email found. We searched for records matching the following criteria:\n' +
                      `- Name: ${firstName} ${lastName}\n` +
                      `- Company: ${companyName}\n` +
                      `- LinkedIn: ${linkedin}\n` +
                      'Please verify your information and try again with different variations.'
        };
      }
      
      // The first row contains column names; the second row contains data
      const dataRow = fallbackRows[1];
      const email = dataRow.Data?.[0]?.VarCharValue || null;
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
      
      if (!email && (!personalEmails || personalEmails.length === 0)) {
        return { email: null, personalEmails: null, errorMessage: 'No email returned by query. The record was found but no email was available.' };
      }
      
      return { email, personalEmails, errorMessage: null };
    };
    

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
      prefix = `${basePrefix}user-data/${userId}/find-email/`;
    } else {
      prefix = `user-data/${userId}/find-email/`;
    }
    
    const searchId = `${firstName}-${lastName}-${companyName}`;
    const s3Key = `${prefix}${searchId}.json`; // Unique key per user and query

    // Optional: Check if data already exists in S3 for this user/query
    try {
      const getObjectParams = {
        Bucket: s3BucketName,
        Key: s3Key,
      };
      const data = await s3Client.send(new GetObjectCommand(getObjectParams));
      if (data.Body) {
        const existingData = JSON.parse(await streamToString(data.Body as Readable));
        console.log('Returning cached data from S3 for user:', userId);
        return NextResponse.json(existingData);
      }
    } catch (error: unknown) {
      if ((error as { name?: string }).name !== 'NoSuchKey') {
        console.error('Error checking S3:', error);
        // Decide if you want to proceed or return an error
      }
      // If NoSuchKey, proceed to query Athena
      console.log('No cached data found in S3 for user:', userId, 'Querying Athena...');
    }

    // Initialize the Athena client.
    const athenaClient = new AthenaClient({
      region: 'ap-south-1', // Update this if needed.
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Start the query execution.
    const startQueryResponse = await athenaClient.send(
      new StartQueryExecutionCommand({
        QueryString: query,
        ResultConfiguration: {
          // S3 location where Athena writes query results.
          OutputLocation: process.env.ATHENA_OUTPUT_LOCATION, // e.g., 's3://your-valid-bucket/athena-output/'
        },
      })
    );

    const queryExecutionId = startQueryResponse.QueryExecutionId;
    if (!queryExecutionId) {
      throw new Error('Query execution failed to start.');
    }

    // Poll until the query completes.
    let queryState = 'RUNNING';
    while (queryState === 'RUNNING' || queryState === 'QUEUED') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const queryExecutionResponse = await athenaClient.send(
        new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId })
      );
      queryState =
        queryExecutionResponse.QueryExecution?.Status?.State || 'FAILED';
    }

    if (queryState !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: 'Athena query did not succeed.' },
        { status: 500 }
      );
    }

    // Try the main query first, then fallback if needed
    const { email, personalEmails, errorMessage } = await tryFallbackQueries(athenaClient, queryExecutionId);

    

    // Prepare the result data with additional metadata
    const resultData: {
      firstName: string;
      lastName: string;
      linkedin: string;
      companyName: string;
      timestamp: string;
      searchId: string;
      userId: string;
      email?: string;
      personalEmails?: string[];
      error?: string;
    } = { 
      firstName,
      lastName,
      linkedin,
      companyName,
      timestamp: new Date().toISOString(),
      searchId: `${firstName}-${lastName}-${companyName}`,
      userId
    };
    
    // Add email, personal emails, or error to the result data
    if (email) {
      resultData.email = email;
    }
    if (personalEmails && personalEmails.length > 0) {
      resultData.personalEmails = personalEmails;
    }
    if (!email && (!personalEmails || personalEmails.length === 0) && errorMessage) {
      resultData.error = errorMessage;
    }

    // Store the result in S3
    try {
      const putObjectParams = {
        Bucket: s3BucketName,
        Key: s3Key,
        Body: JSON.stringify(resultData),
        ContentType: 'application/json',
      };
      await s3Client.send(new PutObjectCommand(putObjectParams));
      console.log('Successfully stored result in S3 for user:', userId);
    } catch (s3Error) {
      console.error('Error storing result in S3:', s3Error);
      // Log the error but continue to return the result
    }

    // Return the appropriate response to the client with complete result data
    return NextResponse.json(resultData);
  } catch (error) {
    console.error('Error executing Athena query:', error);
    
    // Get the request body data if possible
    let requestData;
    try {
      requestData = await request.clone().json();
    } catch (parseError) {
      requestData = {};
      console.error('Error parsing request data:', parseError);
    }
    
    const { firstName = '', lastName = '', linkedin = '', companyName = '' } = requestData;
    
    // Save the error to S3 for tracking purposes
    try {
      const errorData: {
        firstName: string;
        lastName: string;
        linkedin: string;
        companyName: string;
        timestamp: string;
        searchId: string;
        userId: string;
        error: string;
      } = {
        firstName,
        lastName,
        linkedin,
        companyName,
        timestamp: new Date().toISOString(),
        searchId: `${firstName}-${lastName}-${companyName}`,
        userId,
        error: 'Error executing Athena query.'
      };
      
      // Make sure s3BucketName and s3Key are defined
      const s3BucketNameFull = process.env.S3_BUCKET_NAME?.replace('s3://', '') || '';
      const s3BucketName = s3BucketNameFull.split('/')[0];
      let prefix = '';
      if (s3BucketNameFull.includes('/')) {
        const basePrefix = s3BucketNameFull.substring(s3BucketName.length + 1);
        prefix = `${basePrefix}user-data/${userId}/find-email/`;
      } else {
        prefix = `user-data/${userId}/find-email/`;
      }
      const s3Key = `${prefix}${errorData.searchId}.json`;
      
      // Initialize S3 client
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      
      const putObjectParams = {
        Bucket: s3BucketName,
        Key: s3Key,
        Body: JSON.stringify(errorData),
        ContentType: 'application/json',
      };
      await s3Client.send(new PutObjectCommand(putObjectParams));
      console.log('Stored error information in S3 for user:', userId);
    } catch (s3Error) {
      console.error('Error storing error information in S3:', s3Error);
    }
    
    return NextResponse.json(
      { error: 'Error executing Athena query.' },
      { status: 500 }
    );
  }
}
