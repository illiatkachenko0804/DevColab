-- =========================================================================
-- Snippet collections (folders / categories)
-- =========================================================================
CREATE TABLE snippet_collections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    color        VARCHAR(7) NOT NULL DEFAULT '#8e8e93',   -- hex for sidebar dot
    icon         VARCHAR(30) DEFAULT 'folder',            -- lucide icon name
    position     DOUBLE PRECISION NOT NULL DEFAULT 1000,  -- ordering
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);
CREATE INDEX idx_snippet_collections_ws ON snippet_collections(workspace_id);

-- =========================================================================
-- Snippet tags (lightweight labels, workspace-scoped)
-- =========================================================================
CREATE TABLE snippet_tags (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(40) NOT NULL,
    UNIQUE (workspace_id, name)
);

CREATE TABLE snippet_tag_map (
    snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES snippet_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (snippet_id, tag_id)
);

-- =========================================================================
-- Snippet revisions (version history)
-- =========================================================================
CREATE TABLE snippet_revisions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
    code       TEXT NOT NULL,
    language   VARCHAR(40) NOT NULL,
    message    VARCHAR(200),                              -- optional commit message
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snippet_revisions ON snippet_revisions(snippet_id, created_at DESC);

-- =========================================================================
-- Snippet stars (bookmarks / favorites)
-- =========================================================================
CREATE TABLE snippet_stars (
    snippet_id UUID NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (snippet_id, user_id)
);

-- =========================================================================
-- Expand snippets table
-- =========================================================================
ALTER TABLE snippets
    ADD COLUMN collection_id UUID REFERENCES snippet_collections(id) ON DELETE SET NULL,
    ADD COLUMN description   TEXT,                     -- markdown description / notes
    ADD COLUMN forked_from   UUID REFERENCES snippets(id) ON DELETE SET NULL,
    ADD COLUMN pinned        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN visibility    VARCHAR(20) NOT NULL DEFAULT 'WORKSPACE',  -- WORKSPACE | PRIVATE
    ADD COLUMN updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX idx_snippets_collection ON snippets(collection_id);
CREATE INDEX idx_snippets_forked ON snippets(forked_from);
