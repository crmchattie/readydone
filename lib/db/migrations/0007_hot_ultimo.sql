CREATE TABLE IF NOT EXISTS "ChatParticipant" (
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar DEFAULT 'viewer' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ChatParticipant_chatId_userId_pk" PRIMARY KEY("chatId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "DocumentAccess" (
	"documentId" uuid NOT NULL,
	"documentCreatedAt" timestamp NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar DEFAULT 'viewer' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DocumentAccess_documentId_documentCreatedAt_userId_pk" PRIMARY KEY("documentId","documentCreatedAt","userId")
);
--> statement-breakpoint
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Document" DROP CONSTRAINT "Document_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "Document" ALTER COLUMN "content" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "kind" varchar DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "chatId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_documentId_documentCreatedAt_Document_id_createdAt_fk" FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "userId";--> statement-breakpoint
ALTER TABLE "Document" DROP COLUMN IF EXISTS "text";--> statement-breakpoint
ALTER TABLE "Document" DROP COLUMN IF EXISTS "userId";