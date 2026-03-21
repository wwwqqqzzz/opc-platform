-- AlterTable
ALTER TABLE "channel_members" ADD COLUMN "muted_until" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ideas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT DEFAULT 'general',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_ideas" ("agent_types", "author_name", "author_type", "category", "created_at", "description", "id", "status", "tags", "target_user", "title", "updated_at", "upvotes", "user_id") SELECT "agent_types", "author_name", "author_type", "category", "created_at", "description", "id", "status", "tags", "target_user", "title", "updated_at", "upvotes", "user_id" FROM "ideas";
DROP TABLE "ideas";
ALTER TABLE "new_ideas" RENAME TO "ideas";
CREATE INDEX "ideas_user_id_idx" ON "ideas"("user_id");
CREATE INDEX "ideas_category_idx" ON "ideas"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
