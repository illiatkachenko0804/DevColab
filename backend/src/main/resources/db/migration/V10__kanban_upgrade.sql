-- =========================================================================
-- Labels (colored tags, workspace-scoped)
-- =========================================================================
CREATE TABLE labels (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(50) NOT NULL,
    color        VARCHAR(7) NOT NULL DEFAULT '#6e6e73',  -- hex color
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

CREATE TABLE task_labels (
    task_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

-- =========================================================================
-- Task comments
-- =========================================================================
CREATE TABLE task_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at  TIMESTAMPTZ
);
CREATE INDEX idx_task_comments_task ON task_comments(task_id, created_at);

-- =========================================================================
-- Sprints (workspace-scoped, time-boxed iterations)
-- =========================================================================
CREATE TABLE sprints (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    goal         TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'PLANNING',  -- PLANNING | ACTIVE | COMPLETED
    start_date   DATE,
    end_date     DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sprints_workspace ON sprints(workspace_id);

-- =========================================================================
-- Expand tasks table
-- =========================================================================
ALTER TABLE tasks
    ADD COLUMN task_key      VARCHAR(20),              -- e.g. "DC-42" (workspace prefix + sequence)
    ADD COLUMN type          VARCHAR(20) NOT NULL DEFAULT 'TASK',  -- TASK | BUG | STORY | EPIC
    ADD COLUMN priority      VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- CRITICAL | HIGH | MEDIUM | LOW | NONE
    ADD COLUMN story_points  SMALLINT,                 -- Fibonacci: 1,2,3,5,8,13,21
    ADD COLUMN sprint_id     UUID REFERENCES sprints(id) ON DELETE SET NULL,
    ADD COLUMN parent_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- subtask hierarchy
    ADD COLUMN reporter_id   UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);

-- Generate task keys for existing tasks
CREATE SEQUENCE IF NOT EXISTS task_key_seq START WITH 1;
