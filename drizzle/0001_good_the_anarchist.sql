CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"credentials" json NOT NULL,
	"strategy" text,
	"schedule" text,
	"created_at" timestamp DEFAULT now()
);
