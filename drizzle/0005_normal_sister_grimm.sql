CREATE TABLE "performance_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"skill_tag" text NOT NULL,
	"task_type" text NOT NULL,
	"success" boolean NOT NULL,
	"fail_reason" text,
	"notes" text,
	"timestamp" timestamp DEFAULT now()
);
