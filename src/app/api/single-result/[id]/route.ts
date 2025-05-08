// src/app/api/single-result/[id]/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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

// The RouteContext type is expected by Next.js type checks
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    // Await the params as required by the type
    const { id } = await context.params;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing search ID parameter.' },
        { status: 400 }
      );
    }

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

    // Construct the key for the specific search result
    const key = `${prefix}${id}.json`;

    // Get the object from S3
    const getObjectParams = { Bucket: s3BucketName, Key: key };
    const data = await s3Client.send(new GetObjectCommand(getObjectParams));

    if (!data.Body) {
      return NextResponse.json(
        { error: 'Search result not found.' },
        { status: 404 }
      );
    }

    // Convert the stream to a string and parse the JSON
    const bodyContents = await streamToString(data.Body as Readable);
    const searchData = JSON.parse(bodyContents);

    return NextResponse.json({
      searchId: searchData.searchId,
      firstName: searchData.firstName,
      lastName: searchData.lastName,
      companyName: searchData.companyName,
      linkedin: searchData.linkedin,
      email: searchData.email,
      personalEmails: searchData.personalEmails || [],
      timestamp: searchData.timestamp
    });
  } catch (error) {
    console.error('Error retrieving single search result:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve search result.' },
      { status: 500 }
    );
  }
}
