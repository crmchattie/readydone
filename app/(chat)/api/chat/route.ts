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
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { retrieveMemory, storeMemory } from '@/lib/ai/tools/with-memory';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { searchWeb } from '@/lib/ai/tools/search-web';
import { searchPlacesTool } from '@/lib/ai/tools/search-places';
import { scrapeWebsite } from '@/lib/ai/tools/scrape-website';
import { planTask } from '@/lib/ai/tools/plan-task';
import { findEmail } from '@/lib/ai/tools/find-email';
import { findPhone } from '@/lib/ai/tools/find-phone';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';

export const maxDuration = 60;

export async function POST(request: Request) {
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

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      // Check if user has access to the chat
      const participants = await getChatParticipants({ chatId: id });
      const userAccess = participants.find(p => p.participant.id === session.user?.id);
      
      if (!userAccess) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

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

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
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
                  'searchPlaces',
                  'scrapeWebsite',
                  'findEmail',
                  'findPhone',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            planTask: planTask,
            retrieveMemory: retrieveMemory({ messages, userId: session.user!.id! }),
            storeMemory: storeMemory({ messages, userId: session.user!.id! }),
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            searchWeb: searchWeb,
            searchPlaces: searchPlacesTool,
            scrapeWebsite: scrapeWebsite,
            findEmail: findEmail,
            findPhone: findPhone,
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Check if user is owner of the chat
    const participants = await getChatParticipants({ chatId: id });
    const userAccess = participants.find(p => 
      p.participant.id === session.user?.id && 
      p.role === 'owner'
    );

    if (!userAccess) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId parameter', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || session.user.id !== userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const limit = parseInt(searchParams.get('limit') || '50');
    const startingAfter = searchParams.get('starting_after');
    const endingBefore = searchParams.get('ending_before');

    const chats = await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: startingAfter || null,
      endingBefore: endingBefore || null
    });
    return new Response(JSON.stringify(chats), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    return new Response('Failed to fetch chats', { status: 500 });
  }
}
