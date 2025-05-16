'use server';

import { generateText, Message } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  getLatestChatSummary,
  getMessagesByChatId,
  findRelevantTypedContent,
  createTypedResource,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import type { ArtifactKind } from '@/components/artifact';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function summarizeMessages(
  chatId: string,
  prompt: string
): Promise<string> {
  // Get the latest summary if it exists
  const latestSummary = await getLatestChatSummary({ chatId });
  
  // Get all messages since the last summary
  const messages = await getMessagesByChatId({ id: chatId });
  const unsummarizedMessages = latestSummary 
    ? messages.filter(msg => msg.id !== latestSummary.lastMessageId && 
        msg.createdAt > latestSummary.createdAt)
    : messages;

  if (unsummarizedMessages.length === 0) {
    return latestSummary?.summary || '';
  }

  const context = latestSummary 
    ? `Previous summary:\n${latestSummary.summary}\n\nNew messages to incorporate:`
    : 'Summarize these messages:';

  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a conversation summarizer. Create concise but informative summaries that capture key points, decisions, and context.',
    prompt: `${context}\n\n${unsummarizedMessages
      .map(msg => `${msg.role}: ${JSON.stringify(msg.parts)}`)
      .join('\n')}\n\n${prompt}`,
  });

  return text;
}

export async function generateDocumentSummary(content: string, kind: ArtifactKind): Promise<string> {
  const prompt = kind === 'code' 
    ? 'Summarize this code snippet focusing on its main functionality and purpose:'
    : kind === 'sheet'
    ? 'Summarize this spreadsheet data focusing on its structure and key information:'
    : 'Summarize this text focusing on its main points and key information:';

  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a document summarization assistant. Create concise, informative summaries that capture the essence of the content.',
    prompt: `${prompt}\n\n${content}`,
  });

  return text;
}

export async function storeUserMemories(
  userId: string,
  messages: Message[]
): Promise<string> {
  // Summarize user messages internally
  const userMessages = messages.filter(msg => msg.role === 'user');
  
  const { text: newMemory } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a memory extraction assistant. Extract important, factual information about the user from these messages.',
    prompt: `Extract new, important information from these user messages:\n\n${
      userMessages.map(msg => JSON.stringify(msg.parts)).join('\n')
    }`,
  });

  // Find similar existing memories
  const similarMemories = await findRelevantTypedContent(newMemory, 'user', userId, 5);
  
  if (similarMemories.length > 0) {
    // Sort memories by similarity to ensure most relevant ones are considered first
    const relevantMemories = similarMemories
      .filter(memory => memory.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity);

    if (relevantMemories.length > 0) {
      // Merge with existing memories, prioritizing newer information
      const { text: mergedMemory } = await generateText({
        model: myProvider.languageModel('chat-model-small'),
        system: `You are a memory consolidation assistant. Merge multiple pieces of information while:
- Avoiding redundancy
- Preserving all important details
- Prioritizing newer information over older information
- Maintaining factual accuracy
- Resolving any conflicts in favor of newer information`,
        prompt: `Merge these pieces of information about the user. The newest information is listed first and should take precedence:

New memory:
${newMemory}

Existing memories (from most to least similar):
${relevantMemories.map(m => m.content).join('\n\n')}

Merged memory:`,
      });

      // Store the merged memory
      await createTypedResource({
        content: mergedMemory,
        url: 'memory',
        title: 'User Memory',
        userId,
        type: 'user',
      });

      return mergedMemory;
    }
  }

  // Store new memory if no similar ones exist
  await createTypedResource({
    content: newMemory,
    url: 'memory',
    title: 'User Memory',
    userId,
    type: 'user',
  });

  return newMemory;
}

export async function retrieveRelevantUserMemories(
  messages: Message[],
  userId: string
): Promise<string> {
  // Summarize the conversation context internally
  const summary = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a memory retrieval assistant. Summarize the following messages to find relevant memories.',
    prompt: messages.map(msg => JSON.stringify(msg.parts)).join('\n'),
  });

  // Use the summary to find relevant memories
  const relevantContent = await findRelevantTypedContent(summary.text, 'user', userId);

  if (relevantContent.length === 0) {
    return '';
  }

  return relevantContent.map(content => content.content).join('\n\n');
}

async function findTaskStartMessage(messages: Message[]): Promise<number> {
  const { text } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a task detection assistant. Find the index of the message that initiates a new task or workflow.',
    prompt: `Analyze these messages and return the index (0-based) of the message that initiates a new task or workflow. Return -1 if no task is found.\n\n${
      messages.map((msg, i) => `[${i}] ${msg.role}: ${JSON.stringify(msg.parts)}`).join('\n')
    }`,
  });
  
  return parseInt(text, 10);
}

export async function storeWorkflowMemory(
  userId: string,
  messages: Message[]
): Promise<string> {
  // Find the task-initiating message
  const taskStartIndex = await findTaskStartMessage(messages);
  if (taskStartIndex === -1 || taskStartIndex >= messages.length) return '';

  // Get all messages from task start to end
  const workflowMessages = messages.slice(taskStartIndex);
  const taskMessage = workflowMessages[0];
  
  if (!taskMessage || !taskMessage.parts) return '';

  const toolCalls = workflowMessages
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.parts)
    .flat()
    .join('\n');

  const recentMessages = workflowMessages.slice(-5);
  
  // Generate workflow memory analysis
  const { text: analysis } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: `You are a workflow analysis assistant. Analyze the following messages and extract workflow information.
Focus on:
- The specific task or goal
- Steps taken to accomplish it
- Tools and approaches used
- Outcome and success indicators
- Any issues encountered and how they were resolved`,
    prompt: `Initial task: ${JSON.stringify(taskMessage.parts)}

Complete workflow:
${workflowMessages.map(msg => `${msg.role}: ${JSON.stringify(msg.parts)}`).join('\n')}

Tool usage:
${toolCalls}

Recent messages for outcome assessment:
${recentMessages.map(msg => `${msg.role}: ${JSON.stringify(msg.parts)}`).join('\n')}`,
  });

  // Store the workflow memory
  await createTypedResource({
    content: analysis,
    url: 'workflow',
    title: `${taskMessage.parts.join(' ').slice(0, 50)}`,
    userId,
    type: 'workflow',
  });

  return analysis;
}

export async function retrieveRelevantWorkflowMemories(
  messages: Message[]
): Promise<string> {
  // Summarize the task context internally
  const summary = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: 'You are a workflow retrieval assistant. Summarize the following messages to find relevant workflows.',
    prompt: messages.map(msg => JSON.stringify(msg.parts)).join('\n'),
  });

  // Find similar workflows based on the summary
  const relevantWorkflows = await findRelevantTypedContent(summary.text, 'workflow');

  if (relevantWorkflows.length === 0) {
    return '';
  }

  // Analyze and summarize relevant workflows
  const { text: insights } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: `You are a workflow analysis assistant. Analyze these similar workflows and provide insights.`,
    prompt: `Current task context:\n${summary.text}\nSimilar workflows:\n${relevantWorkflows.map(w => w.content).join('\n\n')}`,
  });

  return insights;
}

export async function shouldStoreMemory(messages: Message[]): Promise<{
  storeUser: boolean;
  storeWorkflow: boolean;
}> {
  const { text: analysis } = await generateText({
    model: myProvider.languageModel('chat-model-small'),
    system: `You are a memory storage analyst. Determine if these messages contain:
1. User Memory: Important information about the user's preferences, context, or requirements (e.g., work preferences, technical requirements, project constraints)
2. Workflow Memory: A completed task or workflow with clear steps and outcome (e.g., code changes, document creation, complex problem-solving)

Return a JSON object with two boolean fields: { "storeUser": boolean, "storeWorkflow": boolean }

Do NOT store memories for:
- Small talk or greetings
- Simple questions and answers
- Incomplete tasks
- Non-actionable discussions`,
    prompt: `Analyze these messages and determine if they contain information worth storing:
${messages.map(msg => `${msg.role}: ${JSON.stringify(msg.parts)}`).join('\n')}

Return only a JSON object.`,
  });

  try {
    return JSON.parse(analysis);
  } catch (error) {
    console.error('Failed to parse memory analysis:', error);
    return { storeUser: false, storeWorkflow: false };
  }
} 
