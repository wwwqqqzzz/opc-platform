-- CreateTable
CREATE TABLE "channel_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" DATETIME,
    CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "channel_members_channel_id_idx" ON "channel_members"("channel_id");

-- CreateIndex
CREATE INDEX "channel_members_actor_id_actor_type_idx" ON "channel_members"("actor_id", "actor_type");

-- CreateIndex
CREATE INDEX "channel_members_joined_at_idx" ON "channel_members"("joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "channel_members_channel_id_actor_id_actor_type_key" ON "channel_members"("channel_id", "actor_id", "actor_type");
