ALTER TABLE "checkpoints" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "checkpoints" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "checkpoints" ALTER COLUMN "project_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "checkpoints" ALTER COLUMN "goal_id" SET DATA TYPE integer;