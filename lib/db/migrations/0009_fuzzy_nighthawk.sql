ALTER TABLE "CreditPurchase" ADD COLUMN "chatId" uuid;--> statement-breakpoint
ALTER TABLE "CreditPurchase" ADD COLUMN "messageId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
