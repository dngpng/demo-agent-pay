ALTER TABLE "CreditPurchase" DROP CONSTRAINT "CreditPurchase_chatId_Chat_id_fk";
--> statement-breakpoint
ALTER TABLE "CreditPurchase" DROP CONSTRAINT "CreditPurchase_messageId_Message_v2_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
