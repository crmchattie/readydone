import { config } from 'dotenv';
import { DataStreamWriter } from 'ai';
import * as readline from 'readline';
import { Session } from 'next-auth';
import { getUser, getChatById, saveChat, saveMessages } from '../lib/db/queries';
import { generateUUID } from '../lib/utils';

// Define test session type
type TestSession = {
  user: NonNullable<Session['user']>;
  expires: string;
};

// Parse command line arguments
const args = process.argv.slice(2);
const email = args[0];
const chatId = args[1];
const testTask = args[2];

if (!email) {
  console.error('Usage: ts-node scripts/test-tool.ts <email> [chatId] [testTask]');
  process.exit(1);
}

// Import all tools
import { searchWeb } from '../lib/ai/tools/search-web';
import { findEmail } from '../lib/ai/tools/find-email';
import { findPhone } from '../lib/ai/tools/find-phone';
import { searchPlacesTool, getSpecificPlaceTool } from '../lib/ai/tools/search-places';
import { sendEmail } from '../lib/ai/tools/send-email';
import { callPhone } from '../lib/ai/tools/call-phone';
import { useBrowser } from '../lib/ai/tools/use-browser';
import { retrieveMemory, storeMemory } from '../lib/ai/tools/with-memory';
import { planTask } from '../lib/ai/tools/plan-task';
import { scrapeWebsite } from '../lib/ai/tools/scrape-website';

// Load environment variables
config();

// Simple stream implementation for testing
class TestStream implements DataStreamWriter {
  async write(data: string | Uint8Array): Promise<void> {
    if (typeof data === 'string') {
      console.log(data);
    } else {
      console.log(new TextDecoder().decode(data));
    }
  }

  async writeData(data: any): Promise<void> {
    console.log(JSON.stringify(data, null, 2));
  }

  async writeMessageAnnotation(value: any): Promise<void> {
    console.log('Annotation:', JSON.stringify(value, null, 2));
  }

  async writeSource(source: any): Promise<void> {
    console.log('Source:', JSON.stringify(source, null, 2));
  }

  async merge(stream: ReadableStream<any>): Promise<void> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await this.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  onError(error: any): string {
    console.error('Error:', error);
    return error?.toString() || 'Unknown error';
  }

  async close(): Promise<void> {}
}

async function getTestTask(): Promise<{ task: string; messages: any[] }> {
  const task = testTask || await question('\nEnter the task/context for testing (e.g., "Schedule a call with John about project updates"): ');
  
  // Create test messages to establish context
  const messages = [
    {
      id: generateUUID(),
      role: 'user',
      content: task,
      parts: [{ type: 'text', text: task }],
      createdAt: new Date(),
      metadata: {}
    }
  ];

  if (testTask) {
    console.log(`\nUsing test task: "${task}"`);
  }

  return { task, messages };
}

async function setupTestEnvironment() {
  // Look up the user
  const [dbUser] = await getUser(email);
  if (!dbUser) {
    console.error(`User with email ${email} not found`);
    process.exit(1);
  }

  // Create test session with actual user data
  const testSession: TestSession = {
    user: {
      id: dbUser.id,
      name: dbUser.firstName ? `${dbUser.firstName} ${dbUser.lastName || ''}`.trim() : 'Test User',
      email: dbUser.email
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  // Handle chat
  let testChatId = chatId;
  if (!testChatId) {
    // Create a new test chat
    testChatId = generateUUID();
    await saveChat({
      id: testChatId,
      userId: dbUser.id,
      title: 'Test Chat'
    });
    console.log(`Created new test chat with ID: ${testChatId}`);
  } else {
    // Verify chat exists
    const chat = await getChatById({ id: testChatId });
    if (!chat) {
      console.error(`Chat with ID ${testChatId} not found`);
      process.exit(1);
    }
    console.log(`Using existing chat with ID: ${testChatId}`);
  }

  // Get test task and create context
  const { task, messages } = await getTestTask();
  
  // Save test messages to the chat
  await saveMessages({
    messages: messages.map(msg => ({
      ...msg,
      chatId: testChatId
    }))
  });
  
  console.log(`\nSet up test context with task: "${task}"`);

  // Create test context
  const testContext = {
    chatId: testChatId,
    messages,
    userId: dbUser.id
  };

  // Create test stream instance
  const testStream = new TestStream();

  // Create test execution options
  const testExecutionOptions = {
    toolCallId: 'test-call',
    messages,
    dataStream: testStream
  };

  // Tool definitions with metadata
  const tools = {
    // Direct tools
    'search-web': {
      tool: searchWeb,
      params: {
        query: task // Use the task as the default search query
      }
    },
    'find-email': {
      tool: findEmail,
      params: {} // Requires website parameter from user
    },
    'find-phone': {
      tool: findPhone,
      params: {} // Requires website parameter from user
    },
    'search-places': {
      tool: searchPlacesTool,
      params: {} // Requires query parameter from user
    },
    'get-specific-place': {
      tool: getSpecificPlaceTool,
      params: {} // Requires placeId parameter from user
    },
    'plan-task': {
      tool: planTask,
      params: {
        task,
        messages,
        chatId: testChatId
      }
    },
    'scrape-website': {
      tool: scrapeWebsite,
      params: {} // Requires url parameter from user
    },
    
    // Factory tools that need context
    'send-email': {
      tool: sendEmail,
      params: {
        userId: dbUser.id,
        messages,
        chatId: testChatId
      }
    },
    'call-phone': {
      tool: callPhone,
      params: {
        messages,
        chatId: testChatId
      }
    },
    'use-browser': {
      tool: useBrowser,
      params: {
        session: testSession,
        dataStream: testStream
      }
    },
    'retrieve-memory': {
      tool: retrieveMemory(testContext),
      params: {}
    },
    'store-memory': {
      tool: storeMemory(testContext),
      params: {
        key: 'test-memory', // Default key for testing
        value: task // Store the task as the test value
      }
    }
  } as const;

  return { tools, testExecutionOptions };
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user input
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Helper to print tool parameters
function printToolParameters(toolName: keyof typeof tools, tools: any) {
  const toolDef = tools[toolName];
  const tool = 'params' in toolDef ? toolDef.tool : toolDef;

  if (tool?.parameters) {
    console.log('\nTool parameters:');
    console.log('Required parameters that must be provided:');
    const params = tool.parameters.shape;
    Object.entries(params).forEach(([key, value]: [string, any]) => {
      const isOptional = value._def.typeName === 'ZodOptional';
      const type = isOptional ? value._def.innerType._def.typeName : value._def.typeName;
      const description = value.description || '';
      if (!isOptional && !toolDef.params[key]) {
        console.log(`- ${key}: ${type}\n  ${description}`);
      }
    });

    console.log('\nOptional parameters:');
    Object.entries(params).forEach(([key, value]: [string, any]) => {
      const isOptional = value._def.typeName === 'ZodOptional';
      const type = isOptional ? value._def.innerType._def.typeName : value._def.typeName;
      const description = value.description || '';
      if (isOptional) {
        console.log(`- ${key}: ${type}\n  ${description}`);
      }
    });

    console.log('\nPre-filled parameters:');
    Object.entries(toolDef.params).forEach(([key, value]) => {
      console.log(`- ${key}: ${JSON.stringify(value)}`);
    });
  }
}

// Add type definition for params
type ToolParams = Record<string, unknown>;

async function main() {
  try {
    const { tools, testExecutionOptions } = await setupTestEnvironment();

    // List available tools
    console.log('\nAvailable tools:');
    Object.keys(tools).forEach((tool) => console.log(`- ${tool}`));

    // Get tool selection
    const toolName = await question('\nEnter tool name to test: ');
    const toolDef = tools[toolName as keyof typeof tools];
    
    if (!toolDef) {
      console.error(`Tool '${toolName}' not found!`);
      return;
    }

    // Print tool parameters
    printToolParameters(toolName as keyof typeof tools, tools);

    // Get tool parameters
    console.log('\nEnter required parameters as JSON:');
    const paramsStr = await question('> ');
    const userParams = paramsStr ? JSON.parse(paramsStr) : {};

    // Validate required parameters are provided
    const tool = toolDef.tool;
    const requiredParams = Object.entries(tool.parameters.shape)
      .filter(([_, value]: [string, any]) => value._def.typeName !== 'ZodOptional')
      .map(([key]) => key);

    const baseParams = toolDef.params as ToolParams;
    const missingParams = requiredParams.filter(
      param => !(param in userParams) && !(param in baseParams)
    );

    if (missingParams.length > 0) {
      console.error(`Missing required parameters: ${missingParams.join(', ')}`);
      return;
    }

    console.log('\nExecuting tool...\n');
    
    // Execute the tool
    const result = await tool.execute({
      ...baseParams,
      ...userParams
    }, testExecutionOptions);

    if (result) {
      console.log('\nTool result:', result);
    }

    console.log('\nTool execution completed!\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

main(); 