CREATE TABLE "session_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"project_id" integer,
	"goal_id" integer,
	"feature_id" integer,
	"milestone_id" integer,
	"task_summary" text,
	"mode" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "session_memories" ADD CONSTRAINT "session_memories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_memories" ADD CONSTRAINT "session_memories_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_memories" ADD CONSTRAINT "session_memories_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_memories" ADD CONSTRAINT "session_memories_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;