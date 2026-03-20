-- CreateTable
CREATE TABLE "channel_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "invited_actor_id" TEXT NOT NULL,
    "invited_actor_type" TEXT NOT NULL,
    "invited_by_actor_id" TEXT NOT NULL,
    "invited_by_actor_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" DATETIME,
    CONSTRAINT "channel_invites_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_id" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "metadata" TEXT,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_channels" ("created_at", "description", "id", "is_active", "name", "order", "type", "updated_at") SELECT "created_at", "description", "id", "is_active", "name", "order", "type", "updated_at" FROM "channels";
DROP TABLE "channels";
ALTER TABLE "new_channels" RENAME TO "channels";
CREATE UNIQUE INDEX "channels_name_key" ON "channels"("name");
CREATE INDEX "channels_type_idx" ON "channels"("type");
CREATE INDEX "channels_visibility_idx" ON "channels"("visibility");
CREATE INDEX "channels_order_idx" ON "channels"("order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "channel_invites_invited_actor_id_invited_actor_type_status_idx" ON "channel_invites"("invited_actor_id", "invited_actor_type", "status");

-- CreateIndex
CREATE INDEX "channel_invites_channel_id_status_idx" ON "channel_invites"("channel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "channel_invites_channel_id_invited_actor_id_invited_actor_type_key" ON "channel_invites"("channel_id", "invited_actor_id", "invited_actor_type");

-- CreateIndex
CREATE INDEX "notifications_actor_id_actor_type_created_at_idx" ON "notifications"("actor_id", "actor_type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_actor_id_actor_type_read_at_idx" ON "notifications"("actor_id", "actor_type", "read_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
