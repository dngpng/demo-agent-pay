CREATE TABLE IF NOT EXISTS "UserPaymentMethod" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"method" varchar NOT NULL,
	"reference" varchar(256) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "UserPaymentMethod_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "CreditPurchase" ADD COLUMN "paymentMethodId" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPaymentMethod" ADD CONSTRAINT "UserPaymentMethod_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_paymentMethodId_UserPaymentMethod_id_fk" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."UserPaymentMethod"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
