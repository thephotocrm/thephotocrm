CREATE TABLE "add_ons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_activity_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"target_photographer_id" varchar,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_business_triggers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" varchar NOT NULL,
	"trigger_type" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"min_amount_cents" integer,
	"project_type" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "automation_business_triggers_unique" UNIQUE("automation_id","trigger_type")
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"automation_id" varchar NOT NULL,
	"automation_type" text NOT NULL,
	"automation_step_id" varchar,
	"trigger_type" text,
	"event_date" timestamp,
	"days_before" integer,
	"executed_at" timestamp DEFAULT now(),
	"channel" text,
	"status" text DEFAULT 'SUCCESS' NOT NULL,
	CONSTRAINT "automation_executions_communication_unique" UNIQUE("project_id","automation_step_id"),
	CONSTRAINT "automation_executions_stage_change_unique" UNIQUE("project_id","automation_id","trigger_type"),
	CONSTRAINT "automation_executions_countdown_unique" UNIQUE("project_id","automation_id","event_date","days_before")
);
--> statement-breakpoint
CREATE TABLE "automation_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" varchar NOT NULL,
	"step_index" integer NOT NULL,
	"delay_minutes" integer NOT NULL,
	"template_id" varchar,
	"enabled" boolean DEFAULT true,
	"quiet_hours_start" integer,
	"quiet_hours_end" integer
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_type" text DEFAULT 'WEDDING' NOT NULL,
	"name" text NOT NULL,
	"automation_type" text DEFAULT 'COMMUNICATION' NOT NULL,
	"stage_id" varchar,
	"channel" text,
	"trigger_type" text,
	"target_stage_id" varchar,
	"days_before" integer,
	"trigger_timing" text DEFAULT 'BEFORE',
	"trigger_hour" integer DEFAULT 9,
	"trigger_minute" integer DEFAULT 0,
	"event_type" text,
	"stage_condition" varchar,
	"template_id" varchar,
	"questionnaire_template_id" varchar,
	"event_date_condition" text,
	"effective_from" timestamp DEFAULT now(),
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"is_booked" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"source_template_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"status" text DEFAULT 'PENDING',
	"booking_type" text DEFAULT 'CONSULTATION',
	"is_first_booking" boolean DEFAULT false,
	"google_calendar_event_id" text,
	"google_meet_link" text,
	"booking_token" varchar DEFAULT gen_random_uuid(),
	"client_email" text,
	"client_phone" text,
	"client_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_template_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"title" text NOT NULL,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_portal_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "client_portal_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"event_date" timestamp,
	"has_event_date" boolean DEFAULT false NOT NULL,
	"notes" text,
	"stage_id" varchar,
	"stage_entered_at" timestamp,
	"sms_opt_in" boolean DEFAULT false,
	"email_opt_in" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"project_type" text DEFAULT 'WEDDING' NOT NULL,
	"lead_source" text DEFAULT 'MANUAL'
);
--> statement-breakpoint
CREATE TABLE "daily_availability_breaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_availability_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"date" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"breaks" json,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_availability_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drip_campaign_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"sequence_index" integer NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"text_body" text,
	"weeks_after_start" integer NOT NULL,
	"days_after_start" integer,
	"approval_status" text DEFAULT 'PENDING' NOT NULL,
	"approved_at" timestamp,
	"approved_by" varchar,
	"rejection_reason" text,
	"original_subject" text,
	"original_html_body" text,
	"original_text_body" text,
	"has_manual_edits" boolean DEFAULT false,
	"last_edited_at" timestamp,
	"last_edited_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drip_campaign_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"next_email_index" integer DEFAULT 0 NOT NULL,
	"next_email_at" timestamp,
	"completed_at" timestamp,
	"unsubscribed_at" timestamp,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "drip_subscription_project_campaign_unique" UNIQUE("project_id","campaign_id")
);
--> statement-breakpoint
CREATE TABLE "drip_campaign_version_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"version" integer NOT NULL,
	"change_type" text NOT NULL,
	"change_description" text NOT NULL,
	"changed_by" varchar NOT NULL,
	"affected_email_id" varchar,
	"previous_data" text,
	"new_data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drip_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_type" text DEFAULT 'WEDDING' NOT NULL,
	"name" text NOT NULL,
	"target_stage_id" varchar NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"max_duration_months" integer DEFAULT 12 NOT NULL,
	"email_frequency_weeks" integer DEFAULT 2 NOT NULL,
	"email_frequency_days" integer,
	"generated_by_ai" boolean DEFAULT false,
	"is_static_template" boolean DEFAULT false,
	"static_template_type" text,
	"ai_prompt" text,
	"business_context" text,
	"approved_at" timestamp,
	"approved_by" varchar,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_campaign_id" varchar,
	"is_current_version" boolean DEFAULT true,
	"version_notes" text,
	"use_custom_styling" boolean DEFAULT false,
	"primary_brand_color" text,
	"secondary_brand_color" text,
	"font_family" text DEFAULT 'Arial, sans-serif',
	"created_at" timestamp DEFAULT now(),
	"enabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "drip_email_deliveries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" varchar NOT NULL,
	"email_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"status" text NOT NULL,
	"provider_id" text,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "drip_delivery_subscription_email_unique" UNIQUE("subscription_id","email_id")
);
--> statement-breakpoint
CREATE TABLE "email_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"client_id" varchar,
	"project_id" varchar,
	"automation_step_id" varchar,
	"direction" text DEFAULT 'OUTBOUND' NOT NULL,
	"from_email" text NOT NULL,
	"to_emails" text[] NOT NULL,
	"cc_emails" text[],
	"bcc_emails" text[],
	"subject" text,
	"html_body" text,
	"text_body" text,
	"gmail_message_id" text,
	"gmail_thread_id" text,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"status" text DEFAULT 'SENT' NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"project_id" varchar,
	"automation_step_id" varchar,
	"status" text NOT NULL,
	"provider_id" text,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_forms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"public_token" varchar DEFAULT gen_random_uuid() NOT NULL,
	"project_type" text NOT NULL,
	"config" json NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"submission_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lead_forms_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"photographer_id" varchar NOT NULL,
	"content" text NOT NULL,
	"sent_by_photographer" boolean NOT NULL,
	"channel" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"qty" integer DEFAULT 1,
	"unit_cents" integer DEFAULT 0,
	"line_total_cents" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"base_price_cents" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photographer_earnings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"payment_intent_id" text,
	"transfer_id" text,
	"total_amount_cents" integer NOT NULL,
	"platform_fee_cents" integer NOT NULL,
	"photographer_earnings_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transferred_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "photographer_earnings_payment_intent_id_unique" UNIQUE("payment_intent_id"),
	CONSTRAINT "photographer_earnings_transfer_id_unique" UNIQUE("transfer_id")
);
--> statement-breakpoint
CREATE TABLE "photographer_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photographer_payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"stripe_payout_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_instant" boolean DEFAULT false,
	"fee_cents" integer DEFAULT 0,
	"method" text DEFAULT 'standard',
	"stripe_created_at" timestamp,
	"arrival_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "photographer_payouts_stripe_payout_id_unique" UNIQUE("stripe_payout_id")
);
--> statement-breakpoint
CREATE TABLE "photographers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"logo_url" text,
	"brand_primary" text,
	"brand_secondary" text,
	"email_from_name" text,
	"email_from_addr" text,
	"phone" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"public_token" varchar DEFAULT gen_random_uuid(),
	"google_calendar_access_token" text,
	"google_calendar_refresh_token" text,
	"google_calendar_token_expiry" timestamp,
	"google_calendar_scope" text,
	"google_calendar_connected_at" timestamp,
	"google_calendar_id" text,
	"default_email_opt_in" boolean DEFAULT true,
	"default_sms_opt_in" boolean DEFAULT false,
	"stripe_connect_account_id" text,
	"stripe_account_status" text,
	"payout_enabled" boolean DEFAULT false,
	"onboarding_completed" boolean DEFAULT false,
	"stripe_onboarding_completed_at" timestamp,
	"platform_fee_percent" integer DEFAULT 500,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text,
	"trial_ends_at" timestamp,
	"subscription_current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "photographers_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "project_activity_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"action" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" json,
	"related_id" varchar,
	"related_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"title" text NOT NULL,
	"order_index" integer DEFAULT 0,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"added_by" text NOT NULL,
	"invite_sent" boolean DEFAULT false,
	"invite_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_participants_project_client_unique" UNIQUE("project_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "project_questionnaires" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"questionnaire_template_id" varchar NOT NULL,
	"answers" json,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_smart_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"smart_file_id" varchar NOT NULL,
	"photographer_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"smart_file_name" text NOT NULL,
	"pages_snapshot" json NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"accepted_at" timestamp,
	"paid_at" timestamp,
	"selected_packages" json,
	"selected_add_ons" json,
	"form_answers" json,
	"subtotal_cents" integer DEFAULT 0,
	"tax_cents" integer DEFAULT 0,
	"fees_cents" integer DEFAULT 0,
	"tip_cents" integer DEFAULT 0,
	"total_cents" integer DEFAULT 0,
	"deposit_percent" integer,
	"deposit_cents" integer,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"payment_type" text,
	"amount_paid_cents" integer DEFAULT 0,
	"balance_due_cents" integer DEFAULT 0,
	"client_signature_url" text,
	"photographer_signature_url" text,
	"client_signed_at" timestamp,
	"photographer_signed_at" timestamp,
	"client_signed_ip" text,
	"client_signed_user_agent" text,
	"contract_snapshot_html" text,
	"contract_pdf_url" text,
	"token" varchar DEFAULT gen_random_uuid(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_type" text DEFAULT 'WEDDING' NOT NULL,
	"title" text NOT NULL,
	"lead_source" text DEFAULT 'MANUAL',
	"event_date" timestamp,
	"has_event_date" boolean DEFAULT false NOT NULL,
	"notes" text,
	"stage_id" varchar,
	"stage_entered_at" timestamp,
	"status" text DEFAULT 'ACTIVE',
	"sms_opt_in" boolean DEFAULT true,
	"email_opt_in" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questionnaire_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"options" text,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "short_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"short_code" text NOT NULL,
	"target_url" text NOT NULL,
	"link_type" text DEFAULT 'BOOKING' NOT NULL,
	"clicks" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "short_links_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "smart_file_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"smart_file_id" varchar NOT NULL,
	"page_type" text NOT NULL,
	"page_order" integer NOT NULL,
	"display_title" text NOT NULL,
	"content" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "smart_file_pages_unique_order" UNIQUE("smart_file_id","page_order")
);
--> statement-breakpoint
CREATE TABLE "smart_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_type" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"default_deposit_percent" integer DEFAULT 50,
	"allow_full_payment" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"project_id" varchar,
	"automation_step_id" varchar,
	"status" text NOT NULL,
	"provider_id" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"direction" text DEFAULT 'OUTBOUND' NOT NULL,
	"from_phone" text,
	"to_phone" text,
	"message_body" text,
	"is_forwarded" boolean DEFAULT false,
	"related_sms_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_type" text DEFAULT 'WEDDING' NOT NULL,
	"name" text NOT NULL,
	"order_index" integer NOT NULL,
	"color" text DEFAULT '#64748b',
	"is_default" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "static_campaign_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"project_type" text NOT NULL,
	"campaign_enabled" boolean DEFAULT false,
	"email_toggles" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "static_campaign_settings_photographer_project_type_unique" UNIQUE("photographer_id","project_type")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"html_body" text,
	"text_body" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"photographer_id" varchar,
	"client_id" varchar,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"reset_token_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity_log" ADD CONSTRAINT "admin_activity_log_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity_log" ADD CONSTRAINT "admin_activity_log_target_photographer_id_photographers_id_fk" FOREIGN KEY ("target_photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_business_triggers" ADD CONSTRAINT "automation_business_triggers_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automation_step_id_automation_steps_id_fk" FOREIGN KEY ("automation_step_id") REFERENCES "public"."automation_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_steps" ADD CONSTRAINT "automation_steps_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_target_stage_id_stages_id_fk" FOREIGN KEY ("target_stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_stage_condition_stages_id_fk" FOREIGN KEY ("stage_condition") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_questionnaire_template_id_questionnaire_templates_id_fk" FOREIGN KEY ("questionnaire_template_id") REFERENCES "public"."questionnaire_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_tokens" ADD CONSTRAINT "client_portal_tokens_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_availability_breaks" ADD CONSTRAINT "daily_availability_breaks_template_id_daily_availability_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."daily_availability_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_availability_overrides" ADD CONSTRAINT "daily_availability_overrides_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_availability_templates" ADD CONSTRAINT "daily_availability_templates_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_emails" ADD CONSTRAINT "drip_campaign_emails_campaign_id_drip_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."drip_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_emails" ADD CONSTRAINT "drip_campaign_emails_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_emails" ADD CONSTRAINT "drip_campaign_emails_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_subscriptions" ADD CONSTRAINT "drip_campaign_subscriptions_campaign_id_drip_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."drip_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_subscriptions" ADD CONSTRAINT "drip_campaign_subscriptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_subscriptions" ADD CONSTRAINT "drip_campaign_subscriptions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_version_history" ADD CONSTRAINT "drip_campaign_version_history_campaign_id_drip_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."drip_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_version_history" ADD CONSTRAINT "drip_campaign_version_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaign_version_history" ADD CONSTRAINT "drip_campaign_version_history_affected_email_id_drip_campaign_emails_id_fk" FOREIGN KEY ("affected_email_id") REFERENCES "public"."drip_campaign_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaigns" ADD CONSTRAINT "drip_campaigns_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaigns" ADD CONSTRAINT "drip_campaigns_target_stage_id_stages_id_fk" FOREIGN KEY ("target_stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaigns" ADD CONSTRAINT "drip_campaigns_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_campaigns" ADD CONSTRAINT "drip_campaigns_parent_campaign_id_drip_campaigns_id_fk" FOREIGN KEY ("parent_campaign_id") REFERENCES "public"."drip_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_email_deliveries" ADD CONSTRAINT "drip_email_deliveries_subscription_id_drip_campaign_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."drip_campaign_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_email_deliveries" ADD CONSTRAINT "drip_email_deliveries_email_id_drip_campaign_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."drip_campaign_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_email_deliveries" ADD CONSTRAINT "drip_email_deliveries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drip_email_deliveries" ADD CONSTRAINT "drip_email_deliveries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_history" ADD CONSTRAINT "email_history_automation_step_id_automation_steps_id_fk" FOREIGN KEY ("automation_step_id") REFERENCES "public"."automation_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_automation_step_id_automation_steps_id_fk" FOREIGN KEY ("automation_step_id") REFERENCES "public"."automation_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_earnings" ADD CONSTRAINT "photographer_earnings_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_earnings" ADD CONSTRAINT "photographer_earnings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_links" ADD CONSTRAINT "photographer_links_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_payouts" ADD CONSTRAINT "photographer_payouts_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_log" ADD CONSTRAINT "project_activity_log_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_checklist_items" ADD CONSTRAINT "project_checklist_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_questionnaires" ADD CONSTRAINT "project_questionnaires_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_questionnaires" ADD CONSTRAINT "project_questionnaires_questionnaire_template_id_questionnaire_templates_id_fk" FOREIGN KEY ("questionnaire_template_id") REFERENCES "public"."questionnaire_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_smart_files" ADD CONSTRAINT "project_smart_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_smart_files" ADD CONSTRAINT "project_smart_files_smart_file_id_smart_files_id_fk" FOREIGN KEY ("smart_file_id") REFERENCES "public"."smart_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_smart_files" ADD CONSTRAINT "project_smart_files_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_smart_files" ADD CONSTRAINT "project_smart_files_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_template_id_questionnaire_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."questionnaire_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_templates" ADD CONSTRAINT "questionnaire_templates_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_file_pages" ADD CONSTRAINT "smart_file_pages_smart_file_id_smart_files_id_fk" FOREIGN KEY ("smart_file_id") REFERENCES "public"."smart_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_files" ADD CONSTRAINT "smart_files_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_automation_step_id_automation_steps_id_fk" FOREIGN KEY ("automation_step_id") REFERENCES "public"."automation_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_related_sms_id_sms_logs_id_fk" FOREIGN KEY ("related_sms_id") REFERENCES "public"."sms_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "static_campaign_settings" ADD CONSTRAINT "static_campaign_settings_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_activity_log_admin_user_idx" ON "admin_activity_log" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_activity_log_target_photographer_idx" ON "admin_activity_log" USING btree ("target_photographer_id");--> statement-breakpoint
CREATE INDEX "admin_activity_log_created_at_idx" ON "admin_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automation_business_triggers_automation_id_idx" ON "automation_business_triggers" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "drip_campaign_version_history_campaign_version_idx" ON "drip_campaign_version_history" USING btree ("campaign_id","version");--> statement-breakpoint
CREATE INDEX "email_history_client_id_idx" ON "email_history" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "email_history_gmail_thread_id_idx" ON "email_history" USING btree ("gmail_thread_id");--> statement-breakpoint
CREATE INDEX "lead_forms_photographer_idx" ON "lead_forms" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "lead_forms_public_token_idx" ON "lead_forms" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "photographer_earnings_photographer_status_idx" ON "photographer_earnings" USING btree ("photographer_id","status");--> statement-breakpoint
CREATE INDEX "photographer_payouts_photographer_status_idx" ON "photographer_payouts" USING btree ("photographer_id","status");--> statement-breakpoint
CREATE INDEX "project_participants_project_id_idx" ON "project_participants" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_participants_client_id_idx" ON "project_participants" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "project_smart_files_project_idx" ON "project_smart_files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_smart_files_smart_file_idx" ON "project_smart_files" USING btree ("smart_file_id");--> statement-breakpoint
CREATE INDEX "project_smart_files_photographer_idx" ON "project_smart_files" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "project_smart_files_status_idx" ON "project_smart_files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_smart_files_token_idx" ON "project_smart_files" USING btree ("token");--> statement-breakpoint
CREATE INDEX "short_links_short_code_idx" ON "short_links" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "short_links_photographer_idx" ON "short_links" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "smart_file_pages_smart_file_idx" ON "smart_file_pages" USING btree ("smart_file_id");--> statement-breakpoint
CREATE INDEX "smart_file_pages_order_idx" ON "smart_file_pages" USING btree ("smart_file_id","page_order");--> statement-breakpoint
CREATE INDEX "smart_files_photographer_idx" ON "smart_files" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "smart_files_project_type_idx" ON "smart_files" USING btree ("project_type");