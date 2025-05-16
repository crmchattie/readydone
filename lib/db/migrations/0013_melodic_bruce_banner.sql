DROP TABLE "DocumentAccess";--> statement-breakpoint
ALTER TABLE "Embedding" ADD COLUMN "type" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN "type" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "gmailConnected";