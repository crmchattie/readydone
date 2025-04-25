CREATE TABLE IF NOT EXISTS "GmailWatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"historyId" varchar(255),
	"topicName" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"expiresAt" timestamp NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"labels" text,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "fullName" varchar(128);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "usageType" varchar;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "gmailConnected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "referralSource" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "GmailWatches" ADD CONSTRAINT "GmailWatches_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
