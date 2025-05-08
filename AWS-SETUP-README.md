# AWS Setup Instructions

This document provides instructions for setting up the required AWS resources for the email finder application. The application is currently encountering two main issues:

1. **DynamoDB Table Missing**: The `email-lookup-cache` table doesn't exist, causing `ResourceNotFoundException` errors.
2. **SES Permissions Missing**: Your IAM user lacks the `ses:VerifyEmailAddress` permission, causing `AccessDenied` errors.

## Prerequisites

- Node.js installed on your system
- AWS credentials configured in your `.env` and `.env.local` files

## Setup Instructions

### 1. Install Required AWS SDK Packages

First, install the necessary AWS SDK packages if they're not already installed:

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/client-iam @aws-sdk/client-ses
```

### 2. Run the AWS Setup Script

The `aws-setup.js` script will create the missing DynamoDB table and attempt to add the required SES permissions to your IAM user:

```bash
node aws-setup.js
```

### 3. Manual Steps (if needed)

If the script encounters permission issues when trying to modify IAM policies, you'll need to manually add the SES permissions:

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to IAM → Users → SubhajitHara (your username)
3. Click "Add permissions" → "Attach policies directly"
4. Search for and attach the `AmazonSESFullAccess` policy

### 4. Verify Email Identities in SES

Before you can use SES to verify email addresses, you need to verify at least one email identity:

1. Go to the [SES Console](https://console.aws.amazon.com/ses/)
2. Click "Verified identities" → "Create identity"
3. Choose "Email address" and enter an email you control
4. Click "Create identity" and check your email for a verification link

## Troubleshooting

### DynamoDB Table Creation

If the table creation fails, you can manually create it in the AWS Console:

1. Go to the [DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
2. Click "Create table"
3. Table name: `email-lookup-cache`
4. Partition key: `cacheKey` (String)
5. Use default settings and click "Create table"

### SES Permissions

If you continue to see SES permission errors after running the setup script, ensure your IAM user has the following permissions:

- `ses:VerifyEmailAddress`
- `ses:VerifyEmailIdentity`
- `ses:GetIdentityVerificationAttributes`
- `ses:SendEmail`
- `ses:SendRawEmail`

## Next Steps

After completing the setup:

1. Restart your Next.js development server
2. Try the email finder functionality again

The application should now be able to create and access the DynamoDB cache table and verify email addresses using SES.