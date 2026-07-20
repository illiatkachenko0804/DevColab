CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    inviter_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
