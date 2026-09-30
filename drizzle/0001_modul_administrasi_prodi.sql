CREATE TYPE "public"."archive_category" AS ENUM('sk_rektor', 'sk_mengajar', 'akreditasi', 'mou');--> statement-breakpoint
CREATE TYPE "public"."letter_status" AS ENUM('pending_staff', 'pending_kaprodi', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."letter_type" AS ENUM('active_student', 'research_introduction', 'internship_introduction');--> statement-breakpoint
CREATE TYPE "public"."seminar_type" AS ENUM('proposal', 'result', 'final');--> statement-breakpoint
CREATE TYPE "public"."thesis_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "archive_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "archive_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"academic_year" varchar(9),
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "letter_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"letter_type" "letter_type" NOT NULL,
	"purpose" text NOT NULL,
	"destination" text,
	"notes" text,
	"status" "letter_status" DEFAULT 'pending_staff' NOT NULL,
	"staff_verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"kaprodi_approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"document_number" varchar(60),
	"document_url" text,
	"qr_token" varchar(64),
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "letter_requests_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "seminar_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thesis_submission_id" uuid,
	"seminar_type" "seminar_type" NOT NULL,
	"held_at" timestamp with time zone NOT NULL,
	"location" text,
	"notes" text,
	"published_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thesis_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"status" "thesis_status" DEFAULT 'pending' NOT NULL,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"rejection_reason" text,
	"pembimbing1_id" uuid,
	"pembimbing2_id" uuid,
	"pembimbing_assigned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_documents" ADD CONSTRAINT "archive_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_staff_verified_by_id_users_id_fk" FOREIGN KEY ("staff_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "letter_requests" ADD CONSTRAINT "letter_requests_kaprodi_approved_by_id_users_id_fk" FOREIGN KEY ("kaprodi_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ADD CONSTRAINT "seminar_schedules_thesis_submission_id_thesis_submissions_id_fk" FOREIGN KEY ("thesis_submission_id") REFERENCES "public"."thesis_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ADD CONSTRAINT "seminar_schedules_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_submissions" ADD CONSTRAINT "thesis_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_submissions" ADD CONSTRAINT "thesis_submissions_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_submissions" ADD CONSTRAINT "thesis_submissions_pembimbing1_id_users_id_fk" FOREIGN KEY ("pembimbing1_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thesis_submissions" ADD CONSTRAINT "thesis_submissions_pembimbing2_id_users_id_fk" FOREIGN KEY ("pembimbing2_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "archive_documents_category_idx" ON "archive_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "archive_documents_year_idx" ON "archive_documents" USING btree ("academic_year");--> statement-breakpoint
CREATE INDEX "letter_requests_user_idx" ON "letter_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letter_requests_status_idx" ON "letter_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seminar_schedules_type_idx" ON "seminar_schedules" USING btree ("seminar_type");--> statement-breakpoint
CREATE INDEX "seminar_schedules_held_at_idx" ON "seminar_schedules" USING btree ("held_at");--> statement-breakpoint
CREATE INDEX "thesis_submissions_user_idx" ON "thesis_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "thesis_submissions_status_idx" ON "thesis_submissions" USING btree ("status");