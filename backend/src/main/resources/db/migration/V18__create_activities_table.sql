DROP TABLE IF EXISTS activities;

CREATE TABLE activities (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_name VARCHAR(255) NOT NULL,
    app VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    target_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_workspace_id ON activities(workspace_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
