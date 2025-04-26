import 'dotenv/config';
import { config } from 'dotenv';
import { PubSub } from '@google-cloud/pubsub';

config({ path: '.env' });

async function testPubSubSubscription() {
  // Initialize PubSub client with credentials if provided directly
  const pubsub = new PubSub({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    // If GOOGLE_APPLICATION_CREDENTIALS is set, this will be ignored
    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? 
      JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : 
      undefined
  });

  const subscriptionName = process.env.GMAIL_PUBSUB_SUBSCRIPTIONS?.split(',')[0];
  
  if (!subscriptionName) {
    console.error('No subscription name found in GMAIL_PUBSUB_SUBSCRIPTIONS');
    return;
  }

  console.log(`Using subscription: ${subscriptionName}`);
  const subscription = pubsub.subscription(subscriptionName);

  // Create an event handler to handle messages
  const messageHandler = (message: any) => {
    console.log(`\nReceived message ${message.id}:`);
    
    // Try to decode and parse the message data
    try {
      const decodedData = Buffer.from(message.data.toString(), 'base64').toString();
      const parsedData = JSON.parse(decodedData);
      console.log('\tDecoded data:', JSON.stringify(parsedData, null, 2));
    } catch (error) {
      console.log('\tRaw data:', message.data.toString());
    }
    
    console.log('\tAttributes:', JSON.stringify(message.attributes, null, 2));
    
    // "Ack" (acknowledge receipt of) the message
    message.ack();
  };

  // Listen for new messages until timeout occurs
  subscription.on('message', messageHandler);

  console.log('\nListening for messages...');
  console.log('Press Ctrl+C to stop');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

testPubSubSubscription().catch((error) => {
  console.error('Error running test:', error);
  process.exit(1);
}); 