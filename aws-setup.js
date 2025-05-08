const { 
  DynamoDBClient, 
  CreateTableCommand,
  ListTablesCommand
} = require('@aws-sdk/client-dynamodb');

const {
  IAMClient,
  PutUserPolicyCommand
} = require('@aws-sdk/client-iam');

const {
  SESClient,
  ListIdentitiesCommand
} = require('@aws-sdk/client-ses');

// Initialize clients
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const iamClient = new IAMClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create DynamoDB table for email cache
async function createDynamoDBTable() {
  try {
    // First check if table already exists
    const listTablesResponse = await dynamoClient.send(new ListTablesCommand({}));
    if (listTablesResponse.TableNames.includes('email-lookup-cache')) {
      console.log('DynamoDB table "email-lookup-cache" already exists');
      return;
    }

    // Table doesn't exist, create it
    const params = {
      TableName: 'email-lookup-cache',
      KeySchema: [
        { AttributeName: 'cacheKey', KeyType: 'HASH' } // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'cacheKey', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      }
    };

    const response = await dynamoClient.send(new CreateTableCommand(params));
    console.log('Created DynamoDB table "email-lookup-cache":', response);
  } catch (error) {
    console.error('Error creating DynamoDB table:', error);
  }
}

// Add SES permissions to IAM user
async function addSESPermissions() {
  try {
    // Get the IAM username from the error message
    const username = 'SubhajitHara'; // Extracted from the error message

    // Create an inline policy for SES permissions
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'ses:VerifyEmailAddress',
            'ses:VerifyEmailIdentity',
            'ses:GetIdentityVerificationAttributes',
            'ses:SendEmail',
            'ses:SendRawEmail'
          ],
          Resource: '*'
        }
      ]
    };

    const params = {
      PolicyDocument: JSON.stringify(policyDocument),
      PolicyName: 'SESFullAccess',
      UserName: username
    };

    const response = await iamClient.send(new PutUserPolicyCommand(params));
    console.log('Added SES permissions to IAM user:', response);
  } catch (error) {
    console.error('Error adding SES permissions:', error);
    console.log('You may need to manually add SES permissions in the AWS IAM console.');
  }
}

// Check SES configuration
async function checkSESConfiguration() {
  try {
    const response = await sesClient.send(new ListIdentitiesCommand({
      IdentityType: 'EmailAddress',
      MaxItems: 10
    }));
    
    console.log('SES Verified Email Identities:', response.Identities);
    
    if (response.Identities.length === 0) {
      console.log('\nWARNING: No verified email identities found!');
      console.log('You need to verify at least one email address with SES before you can send emails.');
      console.log('To verify an email, go to the AWS SES console and add a new identity.');
    }
  } catch (error) {
    console.error('Error checking SES configuration:', error);
  }
}

// Run all setup functions
async function runSetup() {
  console.log('Starting AWS setup...');
  
  // Create DynamoDB table
  console.log('\n1. Setting up DynamoDB table...');
  await createDynamoDBTable();
  
  // Add SES permissions
  console.log('\n2. Adding SES permissions to IAM user...');
  await addSESPermissions();
  
  // Check SES configuration
  console.log('\n3. Checking SES configuration...');
  await checkSESConfiguration();
  
  console.log('\nSetup complete! If there were any errors, please check the logs above.');
  console.log('You may need to wait a few minutes for the DynamoDB table to be fully created.');
}

// Run the setup
runSetup();