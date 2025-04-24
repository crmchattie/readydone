import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  thread,
  threadMessage,
  type Thread,
  type ThreadMessage,
  userOAuthCredentials,
  type UserOAuthCredentials,
  chatParticipant,
  type ChatParticipant,
  documentAccess,
  type DocumentAccess,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
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

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    await db.insert(chat).values({
      id,
      createdAt: new Date(),
      title,
    });

    // Add the creator as an owner
    return await addChatParticipant({
      chatId: id,
      userId,
      role: 'owner',
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select({
          chat: chat,
          role: chatParticipant.role,
        })
        .from(chat)
        .innerJoin(
          chatParticipant,
          and(
            eq(chat.id, chatParticipant.chatId),
            eq(chatParticipant.userId, id),
          ),
        )
        .where(whereCondition)
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<{ chat: Chat; role: string }> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  chatId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  chatId?: string;
}) {
  try {
    const doc = await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        chatId,
        createdAt: new Date(),
      })
      .returning();

    // Add the creator as an owner
    await addDocumentAccess({
      documentId: doc[0].id,
      documentCreatedAt: doc[0].createdAt,
      userId,
      role: 'owner',
    });

    return doc;
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
  userId,
}: {
  suggestions: Array<Omit<Suggestion, 'id' | 'createdAt'>>;
  userId: string;
}) {
  try {
    // Verify user has access to the documents
    const documentIds = [...new Set(suggestions.map(s => s.documentId))];
    const documentCreatedAts = [...new Set(suggestions.map(s => s.documentCreatedAt))];
    
    const access = await Promise.all(
      documentIds.map((docId, index) =>
        db
          .select()
          .from(documentAccess)
          .where(
            and(
              eq(documentAccess.documentId, docId),
              eq(documentAccess.documentCreatedAt, documentCreatedAts[index]),
              eq(documentAccess.userId, userId),
              inArray(documentAccess.role, ['owner', 'editor']),
            ),
          )
          .limit(1),
      ),
    );

    // Check if user has access to all documents
    if (access.some(result => result.length === 0)) {
      throw new Error('User does not have permission to create suggestions for some documents');
    }

    // Save suggestions
    return await db.insert(suggestion).values(
      suggestions.map(s => ({
        ...s,
        id: generateUUID(),
        userId,
        createdAt: new Date(),
      })),
    );
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
  documentCreatedAt,
  userId,
}: {
  documentId: string;
  documentCreatedAt: Date;
  userId: string;
}) {
  try {
    // Check if user has access to the document
    const [access] = await db
      .select()
      .from(documentAccess)
      .where(
        and(
          eq(documentAccess.documentId, documentId),
          eq(documentAccess.documentCreatedAt, documentCreatedAt),
          eq(documentAccess.userId, userId),
        ),
      )
      .limit(1);

    if (!access) {
      throw new Error('User does not have permission to view suggestions for this document');
    }

    return await db
      .select()
      .from(suggestion)
      .where(
        and(
          eq(suggestion.documentId, documentId),
          eq(suggestion.documentCreatedAt, documentCreatedAt),
        ),
      );
  } catch (error) {
    console.error('Failed to get suggestions by document from database');
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function saveThread({
  id,
  chatId,
  name,
  participantEmail,
  status = 'awaiting_reply',
  lastMessagePreview,
}: {
  id: string;
  chatId: string;
  name: string;
  participantEmail?: string;
  status?: 'awaiting_reply' | 'replied' | 'closed';
  lastMessagePreview?: string;
}) {
  try {
    return await db.insert(thread).values({
      id,
      chatId,
      name,
      participantEmail,
      status,
      lastMessagePreview,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save thread in database');
    throw error;
  }
}

export async function getThreadsByChatId({ chatId }: { chatId: string }) {
  try {
    return await db
      .select()
      .from(thread)
      .where(eq(thread.chatId, chatId))
      .orderBy(desc(thread.createdAt));
  } catch (error) {
    console.error('Failed to get threads by chat id');
    throw error;
  }
}

export async function saveThreadMessages({
  messages,
}: {
  messages: Array<ThreadMessage>;
}) {
  try {
    return await db.insert(threadMessage).values(messages);
  } catch (error) {
    console.error('Failed to save thread messages in database');
    throw error;
  }
}

export async function getMessagesByThreadId({ threadId }: { threadId: string }) {
  try {
    return await db
      .select()
      .from(threadMessage)
      .where(eq(threadMessage.threadId, threadId))
      .orderBy(asc(threadMessage.createdAt));
  } catch (error) {
    console.error('Failed to get thread messages by thread id from database');
    throw error;
  }
}

export async function updateThreadStatus({
  threadId,
  status,
  lastMessagePreview,
}: {
  threadId: string;
  status?: 'awaiting_reply' | 'replied' | 'closed';
  lastMessagePreview?: string;
}) {
  try {
    return await db
      .update(thread)
      .set({
        ...(status && { status }),
        ...(lastMessagePreview && { lastMessagePreview }),
      })
      .where(eq(thread.id, threadId));
  } catch (error) {
    console.error('Failed to update thread');
    throw error;
  }
}

// UserOAuthCredentials queries
export async function saveUserOAuthCredentials({
  userId,
  providerName,
  accessToken,
  refreshToken,
  scopes,
  expiresAt,
}: Omit<UserOAuthCredentials, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    return await db.insert(userOAuthCredentials).values({
      userId,
      providerName,
      accessToken,
      refreshToken,
      scopes,
      expiresAt,
    });
  } catch (error) {
    console.error('Failed to save OAuth credentials in database');
    throw error;
  }
}

export async function updateUserOAuthCredentials({
  id,
  accessToken,
  refreshToken,
  scopes,
  expiresAt,
}: Pick<UserOAuthCredentials, 'id' | 'accessToken'> & 
  Partial<Pick<UserOAuthCredentials, 'refreshToken' | 'scopes' | 'expiresAt'>>
) {
  try {
    return await db
      .update(userOAuthCredentials)
      .set({
        accessToken,
        refreshToken,
        scopes,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userOAuthCredentials.id, id));
  } catch (error) {
    console.error('Failed to update OAuth credentials in database');
    throw error;
  }
}

export async function getUserOAuthCredentialsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(userOAuthCredentials)
      .where(eq(userOAuthCredentials.userId, userId));
  } catch (error) {
    console.error('Failed to get OAuth credentials by user id from database');
    throw error;
  }
}

export async function deleteUserOAuthCredentialsById({ id }: { id: string }) {
  try {
    return await db
      .delete(userOAuthCredentials)
      .where(eq(userOAuthCredentials.id, id));
  } catch (error) {
    console.error('Failed to delete OAuth credentials by id from database');
    throw error;
  }
}

export async function getUserOAuthCredentials({
  userId,
  providerName,
}: {
  userId: string;
  providerName: string;
}) {
  try {
    const result = await db
      .select()
      .from(userOAuthCredentials)
      .where(
        and(
          eq(userOAuthCredentials.userId, userId),
          eq(userOAuthCredentials.providerName, providerName)
        )
      )
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get OAuth credentials from database');
    throw error;
  }
}

// New functions for chat participants
export async function addChatParticipant({
  chatId,
  userId,
  role = 'viewer',
}: {
  chatId: string;
  userId: string;
  role?: 'owner' | 'editor' | 'viewer';
}) {
  try {
    return await db.insert(chatParticipant).values({
      chatId,
      userId,
      role,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to add chat participant to database');
    throw error;
  }
}

export async function getChatParticipants({ chatId }: { chatId: string }) {
  try {
    return await db
      .select({
        participant: user,
        role: chatParticipant.role,
        joinedAt: chatParticipant.createdAt,
      })
      .from(chatParticipant)
      .innerJoin(user, eq(chatParticipant.userId, user.id))
      .where(eq(chatParticipant.chatId, chatId))
      .orderBy(asc(chatParticipant.createdAt));
  } catch (error) {
    console.error('Failed to get chat participants from database');
    throw error;
  }
}

export async function updateChatParticipantRole({
  chatId,
  userId,
  role,
}: {
  chatId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
}) {
  try {
    return await db
      .update(chatParticipant)
      .set({ role })
      .where(
        and(
          eq(chatParticipant.chatId, chatId),
          eq(chatParticipant.userId, userId),
        ),
      );
  } catch (error) {
    console.error('Failed to update chat participant role in database');
    throw error;
  }
}

export async function removeChatParticipant({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  try {
    return await db
      .delete(chatParticipant)
      .where(
        and(
          eq(chatParticipant.chatId, chatId),
          eq(chatParticipant.userId, userId),
        ),
      );
  } catch (error) {
    console.error('Failed to remove chat participant from database');
    throw error;
  }
}

// New functions for document access
export async function addDocumentAccess({
  documentId,
  documentCreatedAt,
  userId,
  role = 'viewer',
}: {
  documentId: string;
  documentCreatedAt: Date;
  userId: string;
  role?: 'owner' | 'editor' | 'viewer';
}) {
  try {
    return await db.insert(documentAccess).values({
      documentId,
      documentCreatedAt,
      userId,
      role,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to add document access to database');
    throw error;
  }
}

export async function getDocumentAccess({
  documentId,
  documentCreatedAt,
}: {
  documentId: string;
  documentCreatedAt: Date;
}) {
  try {
    return await db
      .select({
        user: user,
        role: documentAccess.role,
        grantedAt: documentAccess.createdAt,
      })
      .from(documentAccess)
      .innerJoin(user, eq(documentAccess.userId, user.id))
      .where(
        and(
          eq(documentAccess.documentId, documentId),
          eq(documentAccess.documentCreatedAt, documentCreatedAt),
        ),
      )
      .orderBy(asc(documentAccess.createdAt));
  } catch (error) {
    console.error('Failed to get document access from database');
    throw error;
  }
}

export async function updateDocumentAccessRole({
  documentId,
  documentCreatedAt,
  userId,
  role,
}: {
  documentId: string;
  documentCreatedAt: Date;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
}) {
  try {
    return await db
      .update(documentAccess)
      .set({ role })
      .where(
        and(
          eq(documentAccess.documentId, documentId),
          eq(documentAccess.documentCreatedAt, documentCreatedAt),
          eq(documentAccess.userId, userId),
        ),
      );
  } catch (error) {
    console.error('Failed to update document access role in database');
    throw error;
  }
}

export async function removeDocumentAccess({
  documentId,
  documentCreatedAt,
  userId,
}: {
  documentId: string;
  documentCreatedAt: Date;
  userId: string;
}) {
  try {
    return await db
      .delete(documentAccess)
      .where(
        and(
          eq(documentAccess.documentId, documentId),
          eq(documentAccess.documentCreatedAt, documentCreatedAt),
          eq(documentAccess.userId, userId),
        ),
      );
  } catch (error) {
    console.error('Failed to remove document access from database');
    throw error;
  }
}