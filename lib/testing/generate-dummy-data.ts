import { v4 as uuidv4 } from 'uuid';
import type { Chat, Thread, ThreadMessage, User, DBMessage, ChatParticipant } from '@/lib/db/schema';

// Generate a random user
export function generateDummyUser(): User {
  return {
    id: uuidv4(),
    email: `user-${Math.floor(Math.random() * 1000)}@example.com`,
    password: null,
    createdAt: new Date(),
    firstName: null,
    lastName: null,
    usageType: null,
    referralSource: null,
    onboardingCompletedAt: null,
    stripeCustomerId: null
  };
}

// Generate a random chat
export function generateDummyChat(title?: string): Chat {
  return {
    id: uuidv4(),
    createdAt: new Date(),
    title: title || `Chat about ${['travel', 'work', 'technology', 'health'][Math.floor(Math.random() * 4)]}`,
    visibility: Math.random() > 0.3 ? 'private' : 'public',
  };
}

// Generate a chat participant
export function generateDummyChatParticipant(chatId: string, userId: string, role: 'owner' | 'editor' | 'viewer' = 'owner'): ChatParticipant {
  return {
    chatId,
    userId,
    role,
    createdAt: new Date(),
  };
}

// Generate a random message
export function generateDummyMessage(chatId: string, role: 'user' | 'assistant' = 'assistant'): DBMessage {
  const content = role === 'user' 
    ? ['Can you help me with this?', 'I have a question', 'What do you think about...', 'Let\'s discuss'][Math.floor(Math.random() * 4)]
    : ['I\'d be happy to help!', 'Let me explain...', 'Great question!', 'I can assist with that'][Math.floor(Math.random() * 4)];

  return {
    id: uuidv4(),
    chatId: chatId,
    role: role,
    parts: [{ type: 'text', text: content }],
    attachments: [],
    createdAt: new Date(),
  };
}

// Generate a random thread
export function generateDummyThread(chatId: string, name?: string): Thread {
  const statuses = ['awaiting_reply', 'replied', 'closed'] as const;
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    id: uuidv4(),
    chatId: chatId,
    name: name || `Thread about ${['customer service', 'pricing', 'support', 'information'][Math.floor(Math.random() * 4)]}`,
    externalPartyId: `contact-${Math.floor(Math.random() * 100)}@example.org`,
    externalSystemId: null,
    status: randomStatus,
    lastMessagePreview: 'This is the last message in the thread...',
    createdAt: new Date(),
  };
}

// Generate a random thread message
export function generateDummyThreadMessage(threadId: string, role: 'user' | 'ai' | 'external'): ThreadMessage {
  let content = '';
  
  switch (role) {
    case 'user':
      content = ['Could you follow up on this?', 'What\'s the status?', 'Let\'s check with them'][Math.floor(Math.random() * 3)];
      break;
    case 'ai':
      content = ['I\'ve drafted a response for you', 'Here\'s what I suggest', 'I can help with that'][Math.floor(Math.random() * 3)];
      break;
    case 'external':
      content = ['Thanks for reaching out', 'I\'ll get back to you', 'Here\'s the information you requested'][Math.floor(Math.random() * 3)];
      break;
  }

  return {
    id: uuidv4(),
    threadId: threadId,
    role: role,
    content: [{ type: 'text', text: content }],
    createdAt: new Date(),
    externalMessageId: null,
    subject: "Subject"
  };
}

// Generate complete testing scenario
export function generateTestingScenario(numThreads = 3, messagesPerThread = 2) {
  const user = generateDummyUser();
  const chat = generateDummyChat('Test Conversation');
  
  // Create chat participant relationship
  const chatParticipant = generateDummyChatParticipant(chat.id, user.id, 'owner');
  
  // Create some messages for the main chat
  const chatMessages = Array(4).fill(null).map((_, i) => 
    generateDummyMessage(chat.id, i % 2 === 0 ? 'user' : 'assistant')
  );
  
  // Create threads
  const threads = Array(numThreads).fill(null).map((_, i) => 
    generateDummyThread(chat.id, `Test Thread ${i + 1}`)
  );
  
  // Create messages for each thread
  const threadMessages = threads.flatMap(thread => {
    return Array(messagesPerThread).fill(null).map((_, i) => {
      const roles = ['user', 'ai', 'external'] as const;
      return generateDummyThreadMessage(thread.id, roles[i % roles.length]);
    });
  });
  
  // Helper function to transform ThreadType data structure for the navigation context
  const convertToThreadType = (thread: Thread) => ({
    id: thread.id,
    name: thread.name,
    status: thread.status === 'awaiting_reply' ? 'pending' : thread.status === 'replied' ? 'replied' : 'contacted',
    lastMessage: thread.lastMessagePreview || 'No message',
  });
  
  return {
    user,
    chat,
    chatParticipant,
    chatMessages,
    threads,
    threadMessages,
    // Return data structure ready for navigation context
    navigationThreads: threads.map(convertToThreadType),
  };
}

// Usage example:
// const testData = generateTestingScenario();
// console.log(testData); 