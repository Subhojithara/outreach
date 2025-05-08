# AWS Setup Summary

## Issues Identified

Based on the error messages in your application logs, we've identified two main issues:

1. **DynamoDB Table Missing**: 
   ```
   ResourceNotFoundException: Requested resource not found
   ```
   The application is trying to use a DynamoDB table called `email-lookup-cache` that doesn't exist.

2. **SES Permissions Missing**:
   ```
   AccessDenied: User: arn:aws:iam::182399682246:user/SubhajitHara is not authorized to perform: ses:VerifyEmailAddress
   ```
   Your IAM user lacks the necessary permissions to use Amazon SES for email verification.

## Solutions

### 1. DynamoDB Table Creation

We've attempted to create the missing DynamoDB table with the setup script. If you're still seeing the `ResourceNotFoundException` error:

- The table might still be in the process of being created (it can take a few minutes)
- Or you may need to create it manually:
  1. Go to the [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodb/)
  2. Click "Create table"
  3. Table name: `email-lookup-cache`
  4. Partition key: `cacheKey` (String)
  5. Use default settings and click "Create table"

### 2. SES Permissions

To fix the SES permissions issue:

1. Log in to the [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to Users → SubhajitHara
3. Click "Add permissions" → "Attach policies directly"
4. Search for and attach the `AmazonSESFullAccess` policy

### 3. SES Email Verification

Before you can use SES to verify email addresses, you need to verify at least one email identity:

1. Go to the [SES Console](https://console.aws.amazon.com/ses/)
2. Click "Verified identities" → "Create identity"
3. Choose "Email address" and enter an email you control
4. Click "Create identity" and check your email for a verification link

## Next Steps

After completing these steps:

1. Restart your Next.js development server with `bun dev`
2. Try the email finder functionality again

The application should now be able to create and access the DynamoDB cache table and verify email addresses using SES.

## Additional Information

If you continue to experience issues, check the following:

- Ensure your AWS credentials in `.env` and `.env.local` files are correct
- Verify that your IAM user has the necessary permissions for DynamoDB and S3 as well
- Check if your AWS region settings are consistent across all services

Refer to the `AWS-SETUP-README.md` file for more detailed instructions.