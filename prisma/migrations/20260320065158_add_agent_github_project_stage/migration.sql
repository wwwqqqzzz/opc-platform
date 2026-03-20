-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_name" TEXT,
    "agent_team" TEXT,
    "github_url" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "delivery_stage" TEXT NOT NULL DEFAULT 'project',
    "agent_github_status" TEXT NOT NULL DEFAULT 'pending',
    "agent_github_url" TEXT,
    "agent_github_notes" TEXT,
    "handoff_requested_at" DATETIME,
    "handoff_completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("agent_team", "created_at", "description", "github_url", "id", "idea_id", "owner_name", "status", "title", "updated_at", "user_id") SELECT "agent_team", "created_at", "description", "github_url", "id", "idea_id", "owner_name", "status", "title", "updated_at", "user_id" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE UNIQUE INDEX "projects_idea_id_key" ON "projects"("idea_id");
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
