CREATE TYPE "public"."domain1_variant" AS ENUM('itt', 'per-protocol');--> statement-breakpoint
CREATE TYPE "public"."domain_id" AS ENUM('1a', '1b', '2', '3', '4', '5', '6');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'low-except', 'moderate', 'serious', 'critical');--> statement-breakpoint
CREATE TABLE "studies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"domain1_variant" "domain1_variant" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"study_id" integer NOT NULL,
	"domain_id" "domain_id" NOT NULL,
	"answers" jsonb NOT NULL,
	"outcome" "risk_level" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_study_domain" UNIQUE("study_id","domain_id")
);
--> statement-breakpoint
ALTER TABLE "domain_assessments" ADD CONSTRAINT "domain_assessments_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;