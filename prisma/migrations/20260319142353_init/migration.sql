-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_user" TEXT,
    "agent_types" TEXT,
    "tags" TEXT,
    "author_type" TEXT NOT NULL,
    "author_name" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idea',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ideas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_name" TEXT,
    "agent_team" TEXT,
    "github_url" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "launches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT,
    "product_name" TEXT NOT NULL,
    "tagline" TEXT,
    "demo_url" TEXT,
    "github_url" TEXT,
    "owner_name" TEXT,
    "agent_team" TEXT,
    "source_idea_id" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "launched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "launches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT NOT NULL,
    "author_type" TEXT NOT NULL,
    "author_name" TEXT,
    "content" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "upvotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "upvotes_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,
    "owner_id" TEXT,
    "projects_count" INTEGER NOT NULL DEFAULT 0,
    "reputation_score" REAL NOT NULL DEFAULT 50.0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "successful_projects" INTEGER NOT NULL DEFAULT 0,
    "response_time" REAL,
    "last_active_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "agent_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agent_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "category" TEXT,
    "comment" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_reviews_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_achievements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agent_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "earned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "api_key" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "config" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" DATETIME,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_code" TEXT,
    "verification_code_expires_at" DATETIME,
    "verified_at" DATETIME,
    "verification_url" TEXT,
    "webhook_url" TEXT,
    "last_verification_check" DATETIME,
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "can_auto_verify" BOOLEAN NOT NULL DEFAULT true,
    "auto_publish_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bots_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "bots" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "private_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user1_id" TEXT NOT NULL,
    "user2_id" TEXT NOT NULL,
    "user1_type" TEXT NOT NULL,
    "user2_type" TEXT NOT NULL,
    "last_message_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "private_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "follower_id" TEXT NOT NULL,
    "follower_type" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "following_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ideas_user_id_idx" ON "ideas"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_idea_id_key" ON "projects"("idea_id");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "launches_project_id_key" ON "launches"("project_id");

-- CreateIndex
CREATE INDEX "comments_ip_address_idx" ON "comments"("ip_address");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at");

-- CreateIndex
CREATE INDEX "upvotes_ip_address_idx" ON "upvotes"("ip_address");

-- CreateIndex
CREATE INDEX "upvotes_created_at_idx" ON "upvotes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "upvotes_idea_id_user_id_key" ON "upvotes"("idea_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agents_name_key" ON "agents"("name");

-- CreateIndex
CREATE INDEX "agents_type_idx" ON "agents"("type");

-- CreateIndex
CREATE INDEX "agents_reputation_score_idx" ON "agents"("reputation_score");

-- CreateIndex
CREATE INDEX "agent_reviews_agent_id_idx" ON "agent_reviews"("agent_id");

-- CreateIndex
CREATE INDEX "agent_reviews_rating_idx" ON "agent_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "agent_reviews_agent_id_project_id_created_by_key" ON "agent_reviews"("agent_id", "project_id", "created_by");

-- CreateIndex
CREATE INDEX "agent_achievements_agent_id_idx" ON "agent_achievements"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bots_api_key_key" ON "bots"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "bots_verification_code_key" ON "bots"("verification_code");

-- CreateIndex
CREATE INDEX "bots_owner_id_idx" ON "bots"("owner_id");

-- CreateIndex
CREATE INDEX "bots_api_key_idx" ON "bots"("api_key");

-- CreateIndex
CREATE INDEX "bots_verification_code_idx" ON "bots"("verification_code");

-- CreateIndex
CREATE UNIQUE INDEX "channels_name_key" ON "channels"("name");

-- CreateIndex
CREATE INDEX "channels_type_idx" ON "channels"("type");

-- CreateIndex
CREATE INDEX "channels_order_idx" ON "channels"("order");

-- CreateIndex
CREATE INDEX "messages_channel_id_idx" ON "messages"("channel_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "messages_sender_type_idx" ON "messages"("sender_type");

-- CreateIndex
CREATE INDEX "private_conversations_user1_id_idx" ON "private_conversations"("user1_id");

-- CreateIndex
CREATE INDEX "private_conversations_user2_id_idx" ON "private_conversations"("user2_id");

-- CreateIndex
CREATE INDEX "private_conversations_last_message_at_idx" ON "private_conversations"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "private_conversations_user1_id_user2_id_key" ON "private_conversations"("user1_id", "user2_id");

-- CreateIndex
CREATE INDEX "private_messages_conversation_id_idx" ON "private_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "private_messages_created_at_idx" ON "private_messages"("created_at");

-- CreateIndex
CREATE INDEX "private_messages_sender_id_idx" ON "private_messages"("sender_id");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE INDEX "follows_created_at_idx" ON "follows"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");
