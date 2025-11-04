CREATE INDEX "agents_user_idx" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agents_visibility_idx" ON "agents" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "agents_created_at_idx" ON "agents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_threads_user_idx" ON "chat_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_threads_agent_idx" ON "chat_threads" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "chat_threads_updated_at_idx" ON "chat_threads" USING btree ("updated_at");