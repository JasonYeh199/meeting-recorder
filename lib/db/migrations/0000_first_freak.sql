CREATE TABLE `meeting_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`key_numbers` text DEFAULT '' NOT NULL,
	`sentiment` text DEFAULT '' NOT NULL,
	`qa_highlights` text DEFAULT '' NOT NULL,
	`follow_ups` text DEFAULT '' NOT NULL,
	`generated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meeting_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`segments` text DEFAULT '[]' NOT NULL,
	`full_text` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'zh' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'other' NOT NULL,
	`recorded_at` text DEFAULT (datetime('now')) NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`audio_path` text DEFAULT '' NOT NULL,
	`audio_size` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`error_message` text,
	`user_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
