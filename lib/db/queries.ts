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
  sql
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
  gmailWatches,
  type GmailWatches,
  externalParty,
  type ExternalParty,
  stripePrices,
  type StripePrices,
  stripeProducts,
  type StripeProducts,
  stripeCustomers,
  type StripeCustomers,
  stripePayments,
  type StripePayments,
  resources,
  type Resource,
  embeddings,
  type Embedding,
  chatSummaries
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID, executeWithRetry } from '../utils';
import { generateEmbeddings, generateEmbedding } from '../ai/embedding';

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

export async function getUserById({ id }: { id: string }): Promise<User | undefined> {
  try {
    const [dbUser] = await db.select().from(user).where(eq(user.id, id));
    return dbUser;
  } catch (error) {
    console.error('Failed to get user by id from database');
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
  externalPartyId,
  name,
  externalSystemId,
  status = 'awaiting_reply',
  lastMessagePreview,
}: {
  id: string;
  chatId: string;
  externalPartyId: string;
  name: string;
  externalSystemId?: string;
  status?: 'awaiting_reply' | 'replied' | 'closed';
  lastMessagePreview?: string;
}) {
  try {
    return await db.insert(thread)
      .values({
        id,
        chatId,
        externalPartyId,
        name,
        externalSystemId,
        status,
        lastMessagePreview,
        createdAt: new Date(),
      })
      .returning();
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
  messages: Array<Omit<ThreadMessage, 'id' | 'createdAt'>>;
}) {
  try {
    return await db.insert(threadMessage).values(
      messages.map(message => ({
        ...message,
        id: generateUUID(),
        createdAt: new Date(),
      }))
    );
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
    console.error('Failed to update thread status in database');
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

export async function updateUser({
  id,
  firstName,
  lastName,
  email,
  onboardingCompletedAt,
  gmailConnected,
  usageType,
  referralSource,
}: {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  onboardingCompletedAt?: Date;
  gmailConnected?: boolean;
  usageType?: 'personal' | 'business' | 'both';
  referralSource?: string;
}) {
  try {
    const values: Record<string, any> = {};
    if (firstName !== undefined) values.firstName = firstName;
    if (lastName !== undefined) values.lastName = lastName;
    if (email !== undefined) values.email = email;
    if (onboardingCompletedAt !== undefined) values.onboardingCompletedAt = onboardingCompletedAt;
    if (gmailConnected !== undefined) values.gmailConnected = gmailConnected;
    if (usageType !== undefined) values.usageType = usageType;
    if (referralSource !== undefined) values.referralSource = referralSource;

    await db.update(user).set(values).where(eq(user.id, id));
  } catch (error) {
    console.error('Failed to update user in database');
    throw error;
  }
}

export async function saveGmailWatch({
  userId,
  historyId,
  topicName,
  expiresAt,
  labels,
}: Omit<GmailWatches, 'id' | 'createdAt' | 'active'> & { active?: boolean }) {
  try {
    return await db.insert(gmailWatches).values({
      userId,
      historyId,
      topicName,
      expiresAt,
      labels,
      active: true,
    });
  } catch (error) {
    console.error('Failed to save Gmail watch in database');
    throw error;
  }
}

export async function updateGmailWatchStatus({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  try {
    return await db
      .update(gmailWatches)
      .set({
        active,
        updatedAt: new Date(),
      })
      .where(eq(gmailWatches.id, id));
  } catch (error) {
    console.error('Failed to update Gmail watch status in database');
    throw error;
  }
}

export async function getGmailWatchByUserId({ userId }: { userId: string }) {
  try {
    const result = await db
      .select()
      .from(gmailWatches)
      .where(eq(gmailWatches.userId, userId))
      .orderBy(desc(gmailWatches.createdAt))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get Gmail watch by user id from database');
    throw error;
  }
}

export async function getExpiredGmailWatches() {
  try {
    const now = new Date();
    return await db
      .select()
      .from(gmailWatches)
      .where(
        and(
          eq(gmailWatches.active, true),
          lt(gmailWatches.expiresAt, now)
        )
      );
  } catch (error) {
    console.error('Failed to get expired Gmail watches from database');
    throw error;
  }
}

export async function getAllActiveGmailWatches() {
  try {
    return await db
      .select()
      .from(gmailWatches)
      .where(eq(gmailWatches.active, true))
      .innerJoin(user, eq(gmailWatches.userId, user.id));
  } catch (error) {
    console.error('Failed to get all active Gmail watches from database');
    throw error;
  }
}

// External Party queries
export async function saveExternalParty({
  name,
  email,
  phone,
  type,
  address,
  latitude,
  longitude,
  website,
}: Omit<ExternalParty, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    return await db.insert(externalParty).values({
      name,
      email,
      phone,
      type,
      address,
      latitude,
      longitude,
      website,
    });
  } catch (error) {
    console.error('Failed to save external party in database');
    throw error;
  }
}

export async function getExternalPartyByEmail({ email }: { email: string }) {
  try {
    const result = await db
      .select()
      .from(externalParty)
      .where(eq(externalParty.email, email))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get external party by email from database');
    throw error;
  }
}

export async function getExternalPartyById({ id }: { id: string }) {
  try {
    const result = await db
      .select()
      .from(externalParty)
      .where(eq(externalParty.id, id))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get external party by id from database');
    throw error;
  }
}

export async function getThreadWithExternalParty({ threadId }: { threadId: string }) {
  try {
    const result = await db
      .select({
        thread: thread,
        externalParty: externalParty,
      })
      .from(thread)
      .innerJoin(externalParty, eq(thread.externalPartyId, externalParty.id))
      .where(eq(thread.id, threadId))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get thread with external party from database');
    throw error;
  }
}

export async function getThreadByExternalId({ externalSystemId }: { externalSystemId: string }) {
  try {
    const result = await db
      .select()
      .from(thread)
      .where(eq(thread.externalSystemId, externalSystemId))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get thread by external id from database');
    throw error;
  }
}

export async function getThread({ id }: { id: string }) {
  try {
    const result = await db
      .select()
      .from(thread)
      .where(eq(thread.id, id))
      .limit(1);
    
    return result[0];
  } catch (error) {
    console.error('Failed to get thread by id from database');
    throw error;
  }
}

export async function getActiveStripeProducts() {
  try {
    const productsWithPrices = await db
      .select({
        id: stripeProducts.id,
        name: stripeProducts.name,
        description: stripeProducts.description,
        priceId: stripePrices.stripePriceId,
        amount: stripePrices.unitAmount,
        currency: stripePrices.currency,
      })
      .from(stripeProducts)
      .innerJoin(stripePrices, eq(stripeProducts.id, stripePrices.productId))
      .where(and(
        eq(stripeProducts.active, true),
        eq(stripePrices.active, true)
      ));
      
    return productsWithPrices;
  } catch (error) {
    console.error('Failed to get active Stripe products with prices from database');
    throw error;
  }
}

export async function updateStripePrice({
  stripePriceId,
  unitAmount,
  currency,
  active,
}: {
  stripePriceId: string;
  unitAmount: number;
  currency: string;
  active: boolean;
}) {
  try {
    await db
      .update(stripePrices)
      .set({
        unitAmount,
        currency,
        active,
        updatedAt: new Date(),
      })
      .where(eq(stripePrices.stripePriceId, stripePriceId));
  } catch (error) {
    console.error('Failed to update Stripe price in database');
    throw error;
  }
}

export async function createStripeProduct({
  stripeProductId,
  name,
  description,
  active,
  metadata,
}: Omit<StripeProducts, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const [product] = await db
      .insert(stripeProducts)
      .values({
        stripeProductId,
        name,
        description,
        active,
        metadata,
      })
      .returning();
    return product;
  } catch (error) {
    console.error('Failed to create Stripe product in database');
    throw error;
  }
}

export async function createStripePrice({
  stripePriceId,
  productId,
  type,
  currency,
  unitAmount,
  recurring,
  active,
  metadata,
}: Omit<StripePrices, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const [price] = await db
      .insert(stripePrices)
      .values({
        stripePriceId,
        productId,
        type,
        currency,
        unitAmount,
        recurring,
        active,
        metadata,
      })
      .returning();
    return price;
  } catch (error) {
    console.error('Failed to create Stripe price in database');
    throw error;
  }
}

export async function getStripeProductByStripeId({ stripeProductId }: { stripeProductId: string }) {
  try {
    const [product] = await db
      .select()
      .from(stripeProducts)
      .where(eq(stripeProducts.stripeProductId, stripeProductId));
    return product;
  } catch (error) {
    console.error('Failed to get Stripe product by Stripe ID from database');
    throw error;
  }
}

export async function saveStripeCustomer({
  userId,
  stripeCustomerId,
  email,
  name,
  metadata,
}: Omit<StripeCustomers, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    return await db.insert(stripeCustomers).values({
      userId,
      stripeCustomerId,
      email,
      name,
      metadata,
    });
  } catch (error) {
    console.error('Failed to save Stripe customer in database');
    throw error;
  }
}

export async function saveStripePayment({
  userId,
  stripePaymentIntentId,
  stripePriceId,
  amount,
  currency,
  status,
  paymentMethod,
  metadata,
}: Omit<StripePayments, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    return await db.insert(stripePayments).values({
      userId,
      stripePaymentIntentId,
      stripePriceId,
      amount,
      currency,
      status,
      paymentMethod,
      metadata,
    });
  } catch (error) {
    console.error('Failed to save Stripe payment in database');
    throw error;
  }
}

export async function getStripePriceById({ id }: { id: number }) {
  try {
    const [price] = await db.select().from(stripePrices).where(eq(stripePrices.id, id));
    return price;
  } catch (error) {
    console.error('Failed to get Stripe price by id from database');
    throw error;
  }
}

export async function getStripePriceByStripeId({ stripePriceId }: { stripePriceId: string }) {
  try {
    const [price] = await db
      .select()
      .from(stripePrices)
      .where(eq(stripePrices.stripePriceId, stripePriceId));
    return price;
  } catch (error) {
    console.error('Failed to get Stripe price by Stripe ID from database');
    throw error;
  }
}

export async function getStripeCustomerByUserId({ userId }: { userId: string }) {
  try {
    const [customer] = await db
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.userId, userId));
    return customer;
  } catch (error) {
    console.error('Failed to get Stripe customer by user id from database');
    throw error;
  }
}

export async function getStripePaymentsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(stripePayments)
      .where(eq(stripePayments.userId, userId))
      .orderBy(desc(stripePayments.createdAt));
  } catch (error) {
    console.error('Failed to get Stripe payments by user id from database');
    throw error;
  }
}

export async function updateStripePaymentStatus({
  stripePaymentIntentId,
  status,
}: {
  stripePaymentIntentId: string;
  status: string;
}) {
  try {
    return await db
      .update(stripePayments)
      .set({ status, updatedAt: new Date() })
      .where(eq(stripePayments.stripePaymentIntentId, stripePaymentIntentId));
  } catch (error) {
    console.error('Failed to update Stripe payment status in database');
    throw error;
  }
}

export async function getTotalStripeCustomerCount(): Promise<number> {
  try {
    console.log('Starting getTotalStripeCustomerCount query...');
    
    // Log the query we're about to execute
    const query = db.select({ count: sql<number>`count(*)` }).from(stripeCustomers);
    console.log('Query:', query.toSQL());
    
    const result = await query;
    console.log('Query result:', result);
    
    if (!result || !result[0]) {
      console.error('Unexpected query result structure:', result);
      throw new Error('Invalid query result structure');
    }
    
    console.log('Final count value:', result[0].count);
    return result[0].count;
  } catch (error: unknown) {
    console.error('Error in getTotalStripeCustomerCount:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    throw error;
  }
}

export async function createResource({
  content,
  url,
  title,
  userId,
}: {
  content: string;
  url: string;
  title: string;
  userId: string;
}): Promise<Resource> {
  try {
    const [resource] = await db
      .insert(resources)
      .values({ content, userId })
      .returning();

    console.log("Processing resource:", { url, title });

    const embeddingData = await generateEmbeddings(content, { url, title });
    await Promise.all(
      embeddingData.map((embedding: { content: string; embedding: number[] }) =>
        db.insert(embeddings).values({
          resourceId: resource.id,
          userId,
          content: embedding.content,
          embedding: embedding.embedding,
        })
      )
    );

    return resource;
  } catch (error) {
    console.error('Failed to create resource in database');
    throw error;
  }
}

export async function deleteAllResources({ userId }: { userId: string }): Promise<void> {
  try {
    // Delete from embeddings table first due to foreign key constraints
    await db.delete(embeddings).where(eq(embeddings.userId, userId));

    // Then delete from resources table
    await db.delete(resources).where(eq(resources.userId, userId));
  } catch (error) {
    console.error('Failed to delete all resources from database');
    throw error;
  }
}

export const findRelevantContent = async (
  userQuery: string,
  userId: string,
  limit: number = 5
): Promise<Array<{ content: string; similarity: number }>> => {
  return executeWithRetry(async () => {
    // Generate embedding for the user's query
    const userQueryEmbedding = await generateEmbedding(userQuery);

    // Calculate similarity using cosine distance
    const similarity = sql<number>`1 - (${sql`${embeddings.embedding} <-> ${userQueryEmbedding}`})`;

    // Fetch relevant content from the database, filtering by userId
    const similarContent = await db
      .select({
        content: embeddings.content,
        similarity
      })
      .from(embeddings)
      .where(
        and(
          eq(embeddings.userId, userId),
          gt(similarity, 0.5) // Only consider results with similarity > 0.5
        )
      )
      .orderBy(desc(similarity))
      .limit(limit);

    // Transform the results into a structured format
    return similarContent.map(item => ({
      content: item.content.trim(),
      similarity: parseFloat(item.similarity.toFixed(2))
    }));
  });
};

export async function shouldCreateNewSummary(chatId: string): Promise<boolean> {
  const lastSummary = await db
    .select()
    .from(chatSummaries)
    .where(eq(chatSummaries.chatId, chatId))
    .orderBy(desc(chatSummaries.createdAt))
    .limit(1);

  if (lastSummary.length === 0) return true;

  // Get messages since last summary
  const newMessages = await db
    .select()
    .from(message)
    .where(
      and(
        eq(message.chatId, chatId),
        gt(message.createdAt, lastSummary[0].createdAt)
      )
    );

  // Calculate total character count of new messages
  const totalChars = newMessages.reduce((sum, msg) => {
    return sum + JSON.stringify(msg.parts).length;
  }, 0);

  // Create new summary when we have 5000+ new characters
  return totalChars >= 5000;
}

export async function getDocumentsByKind({
  kind,
  userId,
}: {
  kind: ArtifactKind;
  userId: string;
}) {
  const documents = await db
    .select({
      id: document.id,
      title: document.title,
      content: document.content,
      kind: document.kind,
      chatId: document.chatId,
      createdAt: document.createdAt,
    })
    .from(document)
    .innerJoin(
      documentAccess,
      and(
        eq(documentAccess.documentId, document.id),
        eq(documentAccess.documentCreatedAt, document.createdAt),
        eq(documentAccess.userId, userId)
      )
    )
    .where(eq(document.kind, kind))
    .orderBy(desc(document.createdAt));

  return documents;
}

export async function getDocumentsByChatId({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  try {
    // Get all documents associated with the chat where the user has access
    const documents = await db
      .select({
        document: document,
        access: documentAccess,
      })
      .from(document)
      .innerJoin(
        documentAccess,
        and(
          eq(documentAccess.documentId, document.id),
          eq(documentAccess.documentCreatedAt, document.createdAt),
          eq(documentAccess.userId, userId)
        )
      )
      .where(eq(document.chatId, chatId))
      .orderBy(desc(document.createdAt));

    // Group documents by ID and only return the latest version
    const latestDocuments = documents.reduce((acc, { document: doc }) => {
      if (!acc[doc.id] || doc.createdAt > acc[doc.id].createdAt) {
        acc[doc.id] = doc;
      }
      return acc;
    }, {} as Record<string, typeof document.$inferSelect>);

    return Object.values(latestDocuments);
  } catch (error) {
    console.error('Failed to get documents by chat id from database');
    throw error;
  }
}