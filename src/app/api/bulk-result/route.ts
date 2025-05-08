// app/api/bulk-result/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { fileName, recordCount, successCount, results } = data;

    if (!fileName || !results) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
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
      prefix = `${basePrefix}user-data/${userId}/bulk-find-email/`;
    } else {
      prefix = `user-data/${userId}/bulk-find-email/`;
    }

    // Create a unique ID for this search
    const searchId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const key = `${prefix}${searchId}.json`;

    // Prepare the data to be stored
    const searchData = {
      searchId,
      fileName,
      recordCount,
      successCount,
      results,
      timestamp: new Date().toISOString(),
    };

    // Store the search data in S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3BucketName,
        Key: key,
        Body: JSON.stringify(searchData),
        ContentType: 'application/json',
      })
    );

    return NextResponse.json({ success: true, searchId });
  } catch (error) {
    console.error('Error saving bulk search result:', error);
    return NextResponse.json(
      { error: 'Failed to save bulk search result.' },
      { status: 500 }
    );
  }
}