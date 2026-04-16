CREATE TABLE `analyst_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`content` text NOT NULL,
	`anchor_type` text DEFAULT 'general' NOT NULL,
	`anchor_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `quick_summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `executive_summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `financial_data` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `sentiment_analysis_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `qa_highlights_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `follow_up_items` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `risks_opportunities` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `vs_last_meeting` text;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `confidence` integer DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `analysis_warnings` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `meeting_analyses` ADD `phase` text DEFAULT 'quick' NOT NULL;