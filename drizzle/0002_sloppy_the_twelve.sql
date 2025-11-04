CREATE TABLE "user_wallets" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_wallets_user_idx" ON "user_wallets" USING btree ("user_id");