CREATE TYPE "public"."member_type" AS ENUM('mahasiswa', 'dosen');--> statement-breakpoint
CREATE TABLE "campus_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_type" "member_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"identifier" varchar(30) NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_user_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campus_members" ADD CONSTRAINT "campus_members_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus_members" ADD CONSTRAINT "campus_members_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campus_members_type_identifier_idx" ON "campus_members" USING btree ("member_type","identifier");--> statement-breakpoint
CREATE INDEX "campus_members_name_idx" ON "campus_members" USING btree ("name");