CREATE TABLE "magic_link_rate_limits" (
	"identifier" text PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_magic_link_rate_limits_updated_at" ON "magic_link_rate_limits" USING btree ("updated_at");