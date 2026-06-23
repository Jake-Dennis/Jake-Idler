CREATE TABLE "friends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_friends_player_friend" UNIQUE("player_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "heroes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" bigint DEFAULT 0 NOT NULL,
	"gold" bigint DEFAULT 0 NOT NULL,
	"current_floor" integer DEFAULT 1 NOT NULL,
	"shards" jsonb DEFAULT '{"common":0,"uncommon":0,"rare":0,"epic":0,"legendary":0}'::jsonb NOT NULL,
	"equipped" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inventory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stats" jsonb DEFAULT '{"atk":5,"def":0,"hp":100,"spd":10}'::jsonb NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"floor_bracket" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"is_guest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_players_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heroes" ADD CONSTRAINT "heroes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;