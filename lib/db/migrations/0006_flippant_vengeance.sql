CREATE TABLE IF NOT EXISTS "CreditPurchase" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"status" varchar NOT NULL,
	"provider" varchar(64) NOT NULL,
	"providerReference" varchar(128),
	"description" text,
	"createdAt" timestamp NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "CreditPurchase_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"type" varchar NOT NULL,
	"description" text,
	"referenceId" uuid,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "CreditTransaction_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserCredit" (
	"userId" uuid NOT NULL,
	"balance" numeric(20, 2) DEFAULT '0' NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "UserCredit_userId_pk" PRIMARY KEY("userId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserCredit" ADD CONSTRAINT "UserCredit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
