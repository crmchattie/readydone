ALTER TABLE "User" ADD COLUMN "firstName" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "lastName" varchar(64);--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "fullName";