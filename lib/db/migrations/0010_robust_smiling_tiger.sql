CREATE TABLE IF NOT EXISTS "StripeCustomers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"stripeCustomerId" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"metadata" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "StripeCustomers_userId_unique" UNIQUE("userId"),
	CONSTRAINT "StripeCustomers_stripeCustomerId_unique" UNIQUE("stripeCustomerId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StripePayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"stripePriceId" varchar(255) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"status" varchar(50) NOT NULL,
	"paymentMethod" varchar(50),
	"metadata" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "StripePayments_stripePaymentIntentId_unique" UNIQUE("stripePaymentIntentId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StripePrices" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripePriceId" varchar(255) NOT NULL,
	"productId" integer,
	"type" varchar(50) NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"unitAmount" integer NOT NULL,
	"recurring" json,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "StripePrices_stripePriceId_unique" UNIQUE("stripePriceId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StripeProducts" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripeProductId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "StripeProducts_stripeProductId_unique" UNIQUE("stripeProductId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StripeSubscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"stripeSubscriptionId" varchar(255) NOT NULL,
	"stripePriceId" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"currentPeriodStart" timestamp,
	"currentPeriodEnd" timestamp,
	"cancelAtPeriodEnd" boolean DEFAULT false,
	"metadata" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "StripeSubscriptions_stripeSubscriptionId_unique" UNIQUE("stripeSubscriptionId")
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StripeCustomers" ADD CONSTRAINT "StripeCustomers_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StripePayments" ADD CONSTRAINT "StripePayments_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StripePayments" ADD CONSTRAINT "StripePayments_stripePriceId_StripePrices_stripePriceId_fk" FOREIGN KEY ("stripePriceId") REFERENCES "public"."StripePrices"("stripePriceId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StripePrices" ADD CONSTRAINT "StripePrices_productId_StripeProducts_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."StripeProducts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StripeSubscriptions" ADD CONSTRAINT "StripeSubscriptions_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StripeSubscriptions" ADD CONSTRAINT "StripeSubscriptions_stripePriceId_StripePrices_stripePriceId_fk" FOREIGN KEY ("stripePriceId") REFERENCES "public"."StripePrices"("stripePriceId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
