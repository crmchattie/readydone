import {
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  getChatsByUserId,
  getChatParticipants,
  shouldCreateNewSummary,
  saveChatSummary,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage, summarizeMessages } from '../../actions';
import { retrieveMemory, storeMemory } from '@/lib/ai/tools/with-memory';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { searchWeb } from '@/lib/ai/tools/search-web';
import { getSpecificPlaceTool, searchPlacesTool } from '@/lib/ai/tools/search-places';
import { scrapeWebsite } from '@/lib/ai/tools/scrape-website';
import { planTask } from '@/lib/ai/tools/plan-task';
import { findEmail } from '@/lib/ai/tools/find-email';
import { sendEmail } from '@/lib/ai/tools/send-email';
import { findPhone } from '@/lib/ai/tools/find-phone';
import { callPhone } from '@/lib/ai/tools/call-phone';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

export const maxDuration = 60;

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Chat Route] ${message}`, data ? data : '');
};

export async function POST(request: Request) {
  debug('Starting POST request');
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    debug('Request payload', { id, selectedChatModel, messageCount: messages.length });

    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      debug('Authentication failed');
      return new Response('Unauthorized', { status: 401 });
    }
    debug('User authenticated', { userId: session.user.id });

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      debug('No user message found in request');
      return new Response('No user message found', { status: 400 });
    }
    debug('Found user message', { messageId: userMessage.id });

    const chat = await getChatById({ id });
    debug('Chat lookup result', { chatExists: !!chat });

    if (!chat) {
      debug('Creating new chat');
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await saveChat({ id, userId: session.user.id, title });
      debug('New chat created', { id, title });
    } else {
      debug('Verifying chat access');
      const participants = await getChatParticipants({ chatId: id });
      const userAccess = participants.find(p => p.participant.id === session.user?.id);
      
      if (!userAccess) {
        debug('User access denied', { userId: session.user.id, chatId: id });
        return new Response('Unauthorized', { status: 401 });
      }
      debug('User access verified');
    }

    debug('Saving user message');
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });
    debug('User message saved');

    return createDataStreamResponse({
      execute: async (dataStream) => {
        debug('Starting stream execution');
        if (!session.user?.id) {
          throw new Error('User ID is required');
        }

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: await systemPrompt({ 
            selectedChatModel, 
            chatId: id, 
            userId: session.user.id 
          }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'planTask',
                  'retrieveMemory',
                  'storeMemory',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                  'searchWeb',
                  'getSpecificPlace',
                  'searchPlaces',
                  'scrapeWebsite',
                  'findEmail',
                  'sendEmail',
                  'findPhone',
                  'callPhone'
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            planTask: planTask,
            retrieveMemory: retrieveMemory({ chatId: id, messages, userId: session.user!.id! }),
            storeMemory: storeMemory({ chatId: id, messages, userId: session.user!.id! }),
            createDocument: createDocument({ session, dataStream, chatId: id }),
            updateDocument: updateDocument({ session, dataStream, chatId: id }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            searchWeb: searchWeb,
            getSpecificPlace: getSpecificPlaceTool,
            searchPlaces: searchPlacesTool,
            scrapeWebsite: scrapeWebsite,
            findEmail: findEmail,
            sendEmail: sendEmail({ chatId: id, messages, userId: session.user!.id! }),
            findPhone: findPhone,
            callPhone: callPhone({ chatId: id, messages})
          },
          onFinish: async ({ response }) => {
            debug('Stream finished, processing response');
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  debug('No assistant message found in response');
                  throw new Error('No assistant message found!');
                }
                debug('Found assistant message', { assistantId });

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                debug('Saving assistant message');
                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments: assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
                debug('Assistant message saved');

                // Check if we need a new summary
                debug('Checking if new summary is needed');
                if (await shouldCreateNewSummary(id)) {
                  debug('Generating new summary');
                  const summary = await summarizeMessages(
                    id,
                    'Summarize the conversation focusing on key topics, decisions, and important details that would be relevant for future interactions:'
                  );

                  await saveChatSummary({
                    chatId: id,
                    summary,
                    lastMessageId: assistantId,
                  });
                  debug('New summary saved');
                }
              } catch (error) {
                console.error('Failed to save chat:', error);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        debug('Consuming stream');
        result.consumeStream();

        debug('Merging into data stream');
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error('Stream error:', error);
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    console.error('POST request error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  debug('Starting DELETE request');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    debug('No chat ID provided');
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();
  if (!session || !session.user) {
    debug('Authentication failed');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    debug('Checking chat ownership', { chatId: id });
    const participants = await getChatParticipants({ chatId: id });
    const userAccess = participants.find(p => 
      p.participant.id === session.user?.id && 
      p.role === 'owner'
    );

    if (!userAccess) {
      debug('User not authorized to delete chat', { userId: session.user.id, chatId: id });
      return new Response('Unauthorized', { status: 401 });
    }

    debug('Deleting chat', { chatId: id });
    await deleteChatById({ id });
    debug('Chat deleted successfully');

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Failed to delete chat:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  debug('Starting GET request');
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    debug('Missing userId parameter');
    return new Response('Missing userId parameter', { status: 400 });
  }

  const session = await auth();
  if (!session || !session.user || session.user.id !== userId) {
    debug('Authentication failed or user ID mismatch');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const limit = parseInt(searchParams.get('limit') || '50');
    const startingAfter = searchParams.get('starting_after');
    const endingBefore = searchParams.get('ending_before');

    debug('Fetching chats', { userId, limit, startingAfter, endingBefore });
    const chats = await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: startingAfter || null,
      endingBefore: endingBefore || null
    });
    debug('Chats fetched successfully', { count: chats.chats.length });

    return new Response(JSON.stringify(chats), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    return new Response('Failed to fetch chats', { status: 500 });
  }
}
