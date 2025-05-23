import 'dotenv/config';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { user, type User, chat, thread, threadMessage, externalParty, chatParticipant, message } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Load .env.local
config({ path: '.env' });

// Initialize database client
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Check if user exists or create a test user
    const userResult = await getUser('crmchattie@gmail.com');
    let testUser = Array.isArray(userResult) ? userResult[0] : userResult;

    if (!testUser) {
      console.log('Creating test user...');
      const userId = uuidv4();
      await db.insert(user).values({
        id: userId,
        email: 'crmchattie@gmail.com',
        password: null, // No password for test user
      });
      
      testUser = {
        id: userId,
        email: 'crmchattie@gmail.com',
        password: null,
        firstName: 'Test',
        lastName: 'User',
        usageType: null,
        referralSource: null,
        onboardingCompletedAt: null,
        createdAt: new Date(),
        stripeCustomerId: null
      };
    }

    // Create a test chat
    console.log('Creating test chat...');
    const chatId = uuidv4();
    await db.insert(chat).values({
      id: chatId,
      createdAt: new Date(),
      title: 'Test Conversation',
      visibility: 'private',
    });

    // Create chat participant relationship
    await db.insert(chatParticipant).values({
      chatId: chatId,
      userId: testUser.id,
      role: 'owner',
      createdAt: new Date(),
    });

    // Create some messages in the chat
    console.log('Creating test messages...');
    const messageContents = [
      { role: 'user', text: 'Hello, can you help me with my email threads?' },
      { role: 'assistant', text: 'Of course! I can help you organize and manage your email threads. What specific aspect would you like assistance with?' },
      { role: 'user', text: 'I need to follow up with several clients' },
      { role: 'assistant', text: 'I can definitely help with that! Let me create some client threads for you to manage.' }
    ];

    for (const content of messageContents) {
      await db.insert(message).values({
        id: uuidv4(),
        chatId: chatId,
        role: content.role,
        parts: [{ type: 'text', text: content.text }],
        attachments: [],
        createdAt: new Date(),
      });
    }

    // Create threads
    console.log('Creating test threads...');
    const threadData = [
      { name: 'Acme Corp Contract', status: 'awaiting_reply' as const, preview: 'Need to follow up on contract terms' },
      { name: 'TechStart Support', status: 'replied' as const, preview: 'They requested more information about our services' },
      { name: 'Global Widgets Partnership', status: 'closed' as const, preview: 'Partnership agreement finalized last week' }
    ];

    // Create a test external party
    const externalPartyId = uuidv4();
    await db.insert(externalParty).values({
      id: externalPartyId,
      name: 'Test Company',
      email: 'contact@testcompany.com',
      type: 'business',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const threads = [];
    for (const threadInfo of threadData) {
      const threadId = uuidv4();
      await db.insert(thread).values({
        id: threadId,
        chatId: chatId,
        externalPartyId: externalPartyId,
        name: threadInfo.name,
        status: threadInfo.status,
        lastMessagePreview: threadInfo.preview,
        createdAt: new Date()
      });
      threads.push({ id: threadId, name: threadInfo.name });
    }

    // Create thread messages
    console.log('Creating thread messages...');
    for (const thread of threads) {
      const threadMessages = [
        { role: 'user', text: `I need to follow up with ${thread.name}` },
        { role: 'ai', text: `I've drafted a message to ${thread.name} for your review` },
        { role: 'external', text: "Thanks for reaching out. I'll get back to you soon." }
      ];

      for (const message of threadMessages) {
        await db.insert(threadMessage).values({
          id: uuidv4(),
          threadId: thread.id,
          role: message.role as any,
          content: [{ type: 'text', text: message.text }],
          createdAt: new Date(),
        });
      }
    }

    console.log('✅ Test data seeded successfully!');
    console.log('');
    console.log('Test User:');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  ID: ${testUser.id}`);
    console.log('');
    console.log('Test Chat:');
    console.log(`  ID: ${chatId}`);
    console.log(`  Title: Test Conversation`);
    console.log('');
    console.log('Created 3 threads with 3 messages each');
    console.log('You can now use this data to test your application');

  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedTestData(); 