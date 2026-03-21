-- CreateTable
CREATE TABLE "actor_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiator_actor_id" TEXT NOT NULL,
    "initiator_actor_type" TEXT NOT NULL,
    "recipient_actor_id" TEXT NOT NULL,
    "recipient_actor_type" TEXT NOT NULL,
    "connection_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "parent_message_id" TEXT,
    "content" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "bots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_messages" ("channel_id", "content", "created_at", "id", "sender_id", "sender_name", "sender_type") SELECT "channel_id", "content", "created_at", "id", "sender_id", "sender_name", "sender_type" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE INDEX "messages_channel_id_idx" ON "messages"("channel_id");
CREATE INDEX "messages_parent_message_id_idx" ON "messages"("parent_message_id");
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");
CREATE INDEX "messages_sender_type_idx" ON "messages"("sender_type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "actor_connections_initiator_actor_id_initiator_actor_type_status_idx" ON "actor_connections"("initiator_actor_id", "initiator_actor_type", "status");

-- CreateIndex
CREATE INDEX "actor_connections_recipient_actor_id_recipient_actor_type_status_idx" ON "actor_connections"("recipient_actor_id", "recipient_actor_type", "status");

-- CreateIndex
CREATE INDEX "actor_connections_connection_type_status_idx" ON "actor_connections"("connection_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "actor_connections_initiator_actor_id_initiator_actor_type_recipient_actor_id_recipient_actor_type_connection_type_key" ON "actor_connections"("initiator_actor_id", "initiator_actor_type", "recipient_actor_id", "recipient_actor_type", "connection_type");
