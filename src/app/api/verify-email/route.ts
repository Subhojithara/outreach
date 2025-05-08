// app/api/verify-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SESClient, VerifyEmailAddressCommand } from '@aws-sdk/client-ses';

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
  } catch (error) {
    console.error('Error verifying email with SES:', error);
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get email from request body
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Initialize SES client for email verification
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Verify email with SES
    const isVerified = await verifyEmailWithSES(email, sesClient);

    // Determine email quality based on domain
    let emailQuality = null;
    const domain = email.split('@')[1];
    if (domain) {
      if (['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'].includes(domain)) {
        emailQuality = 'personal';
      } else {
        emailQuality = 'business';
      }
    }

    return NextResponse.json({
      email,
      isVerified,
      emailQuality,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying the email' },
      { status: 500 }
    );
  }
}