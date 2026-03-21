-- DropIndex
DROP INDEX "follows_follower_id_following_id_key";

-- DropIndex
DROP INDEX "private_conversations_user1_id_user2_id_key";

-- CreateTable
CREATE TABLE "actor_relations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "actor_relations_actor_id_actor_type_relation_type_idx" ON "actor_relations"("actor_id", "actor_type", "relation_type");

-- CreateIndex
CREATE INDEX "actor_relations_target_id_target_type_relation_type_idx" ON "actor_relations"("target_id", "target_type", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "actor_relations_actor_id_actor_type_target_id_target_type_relation_type_key" ON "actor_relations"("actor_id", "actor_type", "target_id", "target_type", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_follower_type_following_id_following_type_key" ON "follows"("follower_id", "follower_type", "following_id", "following_type");

-- CreateIndex
CREATE UNIQUE INDEX "private_conversations_user1_id_user1_type_user2_id_user2_type_key" ON "private_conversations"("user1_id", "user1_type", "user2_id", "user2_type");
