// app/api/list-single-results/route.ts

// Remove unused request parameter
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Helper function to convert stream to string
async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    const listObjectsParams = {
      Bucket: s3BucketName,
      Prefix: prefix,
    };

    const listedObjects = await s3Client.send(new ListObjectsV2Command(listObjectsParams));

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      return NextResponse.json({ results: [] }); // No results found for this user
    }

    // Process the results to extract metadata and fetch complete data
    // const getObjectCommand = new GetObjectCommand({});
    
    // Fetch complete data for each search result
    const resultsPromises = listedObjects.Contents.map(async (item) => {
      try {
        // Get the full object data
        const getObjectParams = { Bucket: s3BucketName, Key: item.Key };
        const data = await s3Client.send(new GetObjectCommand(getObjectParams));
        
        if (data.Body) {
          // Convert stream to string and parse JSON
          const bodyContents = await streamToString(data.Body as Readable);
          const searchData = JSON.parse(bodyContents);
          
          return {
            key: item.Key,
            lastModified: item.LastModified,
            searchId: searchData.searchId || 'unknown',
            firstName: searchData.firstName || 'unknown',
            lastName: searchData.lastName || 'unknown',
            companyName: searchData.companyName || 'unknown',
            linkedin: searchData.linkedin,
            email: searchData.email,
            personalEmails: searchData.personalEmails || [],
            timestamp: searchData.timestamp
          };
        }
      } catch (error) {
        console.error(`Error fetching data for ${item.Key}:`, error);
        // Return basic metadata if full data fetch fails
        const keyParts = item.Key?.split('/');
        const fileName = keyParts?.[keyParts.length - 1];
        const searchId = fileName?.replace('.json', '');
        
        return {
          key: item.Key,
          lastModified: item.LastModified,
          searchId: searchId || 'unknown',
          firstName: 'unknown',
          lastName: 'unknown',
          companyName: 'unknown'
        };
      }
    });
    
    // Resolve all promises and sort by date
    const resultsMetadata = (await Promise.all(resultsPromises))
      .filter(Boolean)
      .sort((a, b) => ((b?.lastModified?.getTime() || 0) - (a?.lastModified?.getTime() || 0))); // Sort by date descending

    return NextResponse.json({ results: resultsMetadata });
  } catch (error) {
    console.error('Error listing single email results:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve search history.' },
      { status: 500 }
    );
  }
}