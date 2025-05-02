import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  serial
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  firstName: varchar('firstName', { length: 64 }),
  lastName: varchar('lastName', { length: 64 }),
  usageType: varchar('usageType', { enum: ['personal', 'business', 'both'] }),
  gmailConnected: boolean('gmailConnected').notNull().default(false),
  referralSource: text('referralSource'),
  onboardingCompletedAt: timestamp('onboardingCompletedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

export const chatParticipant = pgTable('ChatParticipant', {
  chatId: uuid('chatId').notNull().references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { enum: ['owner', 'editor', 'viewer'] }).notNull().default('viewer'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.userId] }),
}));

export type ChatParticipant = InferSelectModel<typeof chatParticipant>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable('Document', {
  id: uuid('id').notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  kind: varchar('kind', { enum: ['text', 'code', 'image', 'sheet'] }).notNull().default('text'),
  chatId: uuid('chatId').references(() => chat.id, { onDelete: 'set null' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.createdAt] }),
}));

export type Document = InferSelectModel<typeof document>;

export const documentAccess = pgTable('DocumentAccess', {
  documentId: uuid('documentId').notNull(),
  documentCreatedAt: timestamp('documentCreatedAt').notNull(),
  userId: uuid('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: varchar('role', { enum: ['owner', 'editor', 'viewer'] }).notNull().default('viewer'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.documentId, table.documentCreatedAt, table.userId] }),
  documentFk: foreignKey({
    columns: [table.documentId, table.documentCreatedAt],
    foreignColumns: [document.id, document.createdAt],
  }).onDelete('cascade'),
}));

export type DocumentAccess = InferSelectModel<typeof documentAccess>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const externalParty = pgTable('ExternalParty', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  type: text('type').notNull(),
  address: varchar('address', { length: 255 }),
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  website: varchar('website', { length: 255 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type ExternalParty = InferSelectModel<typeof externalParty>;

export const thread = pgTable('Thread', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId').notNull().references(() => chat.id),
  externalPartyId: uuid('externalPartyId').notNull().references(() => externalParty.id),
  name: varchar('name', { length: 128 }).notNull(),
  externalSystemId: varchar('externalSystemId', { length: 255 }),
  status: varchar('status', { enum: ['awaiting_reply', 'replied', 'closed'] })
    .notNull()
    .default('awaiting_reply'),
  lastMessagePreview: text('lastMessagePreview'),
  createdAt: timestamp('createdAt').notNull(),
});

export type Thread = InferSelectModel<typeof thread>;

export const threadMessage = pgTable('ThreadMessage', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  threadId: uuid('threadId').notNull().references(() => thread.id),
  externalMessageId: varchar('externalMessageId', { length: 255 }),
  role: varchar('role', { enum: ['user', 'ai', 'external'] }).notNull(),
  subject: varchar('subject', { length: 255 }),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type ThreadMessage = InferSelectModel<typeof threadMessage>;

export const userOAuthCredentials = pgTable('UserOAuthCredentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  providerName: varchar('providerName', { length: 50 }).notNull(),
  accessToken: text('accessToken').notNull(),
  refreshToken: text('refreshToken'),
  scopes: text('scopes'),
  expiresAt: timestamp('expiresAt'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type UserOAuthCredentials = InferSelectModel<typeof userOAuthCredentials>;

export const gmailWatches = pgTable('GmailWatches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  historyId: varchar('historyId', { length: 255 }),
  topicName: varchar('topicName', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  expiresAt: timestamp('expiresAt').notNull(),
  active: boolean('active').notNull().default(true),
  labels: text('labels'),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type GmailWatches = InferSelectModel<typeof gmailWatches>;

// Stripe related tables
export const stripeProducts = pgTable('StripeProducts', {
  id: serial('id').primaryKey(),
  stripeProductId: varchar('stripeProductId', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type StripeProducts = InferSelectModel<typeof stripeProducts>;

export const stripePrices = pgTable('StripePrices', {
  id: serial('id').primaryKey(),
  stripePriceId: varchar('stripePriceId', { length: 255 }).notNull().unique(),
  productId: integer('productId').references(() => stripeProducts.id),
  type: varchar('type', { length: 50 }).notNull(), // 'one_time' or 'recurring'
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  unitAmount: integer('unitAmount').notNull(), // in cents
  recurring: json('recurring'), // null for one-time, contains interval, etc. for subscriptions
  active: boolean('active').notNull().default(true),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type StripePrices = InferSelectModel<typeof stripePrices>;

export const stripeCustomers = pgTable('StripeCustomers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id)
    .unique(),
  stripeCustomerId: varchar('stripeCustomerId', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type StripeCustomers = InferSelectModel<typeof stripeCustomers>;

export const stripeSubscriptions = pgTable('StripeSubscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 255 }).notNull().unique(),
  stripePriceId: varchar('stripePriceId', { length: 255 })
    .notNull()
    .references(() => stripePrices.stripePriceId),
  status: varchar('status', { length: 50 }).notNull(), // 'active', 'canceled', 'past_due', etc.
  currentPeriodStart: timestamp('currentPeriodStart'),
  currentPeriodEnd: timestamp('currentPeriodEnd'),
  cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').default(false),
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type StripeSubscriptions = InferSelectModel<typeof stripeSubscriptions>;

export const stripePayments = pgTable('StripePayments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  stripePaymentIntentId: varchar('stripePaymentIntentId', { length: 255 }).unique(),
  stripePriceId: varchar('stripePriceId', { length: 255 })
    .notNull()
    .references(() => stripePrices.stripePriceId),
  amount: integer('amount').notNull(), // in cents
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  status: varchar('status', { length: 50 }).notNull(), // 'succeeded', 'processing', 'canceled', etc.
  paymentMethod: varchar('paymentMethod', { length: 50 }), // 'card', 'sepa', etc.
  metadata: json('metadata'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export type StripePayments = InferSelectModel<typeof stripePayments>;

export const resources = pgTable('Resource', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Resource = InferSelectModel<typeof resources>;

export const embeddings = pgTable('Embedding', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  resourceId: uuid('resourceId')
    .notNull()
    .references(() => resources.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: json('embedding').notNull(), // Store embeddings as JSON array
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Embedding = InferSelectModel<typeof embeddings>;

export const chatSummaries = pgTable('ChatSummary', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  lastMessageId: uuid('lastMessageId')
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type ChatSummary = typeof chatSummaries.$inferSelect;
export type NewChatSummary = typeof chatSummaries.$inferInsert;