CREATE TABLE IF NOT EXISTS "ExternalParty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"type" text NOT NULL,
	"address" varchar(255),
	"latitude" varchar(20),
	"longitude" varchar(20),
	"website" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Thread" ADD COLUMN "externalPartyId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "Thread" ADD COLUMN "externalSystemId" varchar(255);--> statement-breakpoint
ALTER TABLE "ThreadMessage" ADD COLUMN "externalMessageId" varchar(255);--> statement-breakpoint
ALTER TABLE "ThreadMessage" ADD COLUMN "subject" varchar(255);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Thread" ADD CONSTRAINT "Thread_externalPartyId_ExternalParty_id_fk" FOREIGN KEY ("externalPartyId") REFERENCES "public"."ExternalParty"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Thread" DROP COLUMN IF EXISTS "participantEmail";