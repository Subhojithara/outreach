// src/app/api/bulk-result/[id]/route.ts

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
    const { id: bulkRequestId } = await context.params;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!bulkRequestId) {
      return NextResponse.json({ error: 'Missing bulk request ID' }, { status: 400 });
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const s3BucketNameFull = process.env.S3_BUCKET_NAME!.replace('s3://', '');
    const s3BucketName = s3BucketNameFull.split('/')[0];
    
    let prefix = '';
    if (s3BucketNameFull.includes('/')) {
      const basePrefix = s3BucketNameFull.substring(s3BucketName.length + 1);
      prefix = `${basePrefix}user-data/${userId}/bulk-find-email/`;
    } else {
      prefix = `user-data/${userId}/bulk-find-email/`;
    }
    
    const s3Key = `${prefix}${bulkRequestId}.json`;

    const command = new GetObjectCommand({
      Bucket: s3BucketName,
      Key: s3Key,
    });
    const data = await s3Client.send(command);

    if (!data.Body) {
      throw new Error('S3 object body is empty');
    }

    const bodyContents = await streamToString(data.Body as Readable);
    const parsedData = JSON.parse(bodyContents);
    const results = Array.isArray(parsedData.results)
      ? parsedData.results
      : [parsedData.results];

    return NextResponse.json({
      searchId: parsedData.searchId,
      fileName: parsedData.fileName,
      recordCount: parsedData.recordCount,
      successCount: parsedData.successCount,
      results,
      timestamp: parsedData.timestamp,
    });

  } catch (error) {
    console.error('Error fetching bulk result from S3:', error);

    if (error instanceof Error && error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Result not found or access denied.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to retrieve bulk result.' }, { status: 500 });
  }
}
