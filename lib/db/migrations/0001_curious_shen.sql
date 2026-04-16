CREATE TABLE `upload_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`filename` text NOT NULL,
	`filesize` integer NOT NULL,
	`mimetype` text NOT NULL,
	`ext` text NOT NULL,
	`total_chunks` integer NOT NULL,
	`uploaded_chunks` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `meetings` ADD `source` text DEFAULT 'recording' NOT NULL;