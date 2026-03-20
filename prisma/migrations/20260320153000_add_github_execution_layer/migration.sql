-- AlterTable
ALTER TABLE "users" ADD COLUMN "github_access_token" TEXT;
ALTER TABLE "users" ADD COLUMN "github_avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "github_connected_at" DATETIME;
ALTER TABLE "users" ADD COLUMN "github_id" TEXT;
ALTER TABLE "users" ADD COLUMN "github_login" TEXT;
ALTER TABLE "users" ADD COLUMN "github_name" TEXT;
ALTER TABLE "users" ADD COLUMN "github_refresh_token" TEXT;
ALTER TABLE "users" ADD COLUMN "github_token_expires_at" DATETIME;

-- CreateTable
CREATE TABLE "project_github_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "github_event_id" TEXT,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "number" INTEGER,
    "status" TEXT,
    "author_login" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_github_activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_lifecycle_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "delivery_stage" TEXT,
    "agent_github_status" TEXT,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_lifecycle_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "github_repo_id" TEXT,
    "github_repo_owner" TEXT,
    "github_repo_name" TEXT,
    "github_repo_full_name" TEXT,
    "github_default_branch" TEXT,
    "github_installation_type" TEXT,
    "github_connected_at" DATETIME,
    "github_last_synced_at" DATETIME,
    "github_sync_status" TEXT NOT NULL DEFAULT 'idle',
    "github_workflow_status" TEXT NOT NULL DEFAULT 'not_started',
    "github_primary_issue_number" INTEGER,
    "github_primary_pr_number" INTEGER,
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
INSERT INTO "new_projects" ("agent_github_notes", "agent_github_status", "agent_github_url", "agent_team", "created_at", "delivery_stage", "description", "github_url", "handoff_completed_at", "handoff_requested_at", "id", "idea_id", "owner_name", "status", "title", "updated_at", "user_id") SELECT "agent_github_notes", "agent_github_status", "agent_github_url", "agent_team", "created_at", "delivery_stage", "description", "github_url", "handoff_completed_at", "handoff_requested_at", "id", "idea_id", "owner_name", "status", "title", "updated_at", "user_id" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE UNIQUE INDEX "projects_idea_id_key" ON "projects"("idea_id");
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
CREATE INDEX "projects_github_repo_full_name_idx" ON "projects"("github_repo_full_name");
CREATE INDEX "projects_github_workflow_status_idx" ON "projects"("github_workflow_status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "project_github_activities_project_id_created_at_idx" ON "project_github_activities"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_github_activities_github_event_id_idx" ON "project_github_activities"("github_event_id");

-- CreateIndex
CREATE INDEX "project_github_activities_event_type_idx" ON "project_github_activities"("event_type");

-- CreateIndex
CREATE INDEX "project_lifecycle_events_project_id_created_at_idx" ON "project_lifecycle_events"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_lifecycle_events_event_type_idx" ON "project_lifecycle_events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");
