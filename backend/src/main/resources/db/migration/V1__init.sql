-- DevCollab core schema (Phase 0).
-- Schema is owned by Flyway; Hibernate runs in `validate` mode only.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table users (
    id            uuid primary key default gen_random_uuid(),
    email         varchar(255) not null unique,
    password_hash varchar(255),                 -- null for OAuth-only accounts
    display_name  varchar(100) not null,
    avatar_url    text,
    github_id     varchar(64) unique,
    bio           text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workspaces & membership
-- ---------------------------------------------------------------------------
create table workspaces (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(120) not null,
    slug        varchar(140) not null unique,
    description text,
    owner_id    uuid not null references users(id) on delete restrict,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table memberships (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    user_id      uuid not null references users(id) on delete cascade,
    role         varchar(20) not null default 'MEMBER',   -- ADMIN | MEMBER
    joined_at    timestamptz not null default now(),
    unique (workspace_id, user_id)
);
create index idx_memberships_user on memberships(user_id);
create index idx_memberships_workspace on memberships(workspace_id);

create table invites (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    email        varchar(255) not null,
    role         varchar(20) not null default 'MEMBER',
    token        varchar(120) not null unique,
    status       varchar(20) not null default 'PENDING',  -- PENDING | ACCEPTED | EXPIRED | REVOKED
    invited_by   uuid references users(id) on delete set null,
    expires_at   timestamptz not null,
    created_at   timestamptz not null default now()
);
create index idx_invites_workspace on invites(workspace_id);

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
create table channels (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    name         varchar(80) not null,
    type         varchar(20) not null default 'TEXT',
    created_at   timestamptz not null default now(),
    unique (workspace_id, name)
);

create table messages (
    id            uuid primary key default gen_random_uuid(),
    channel_id    uuid not null references channels(id) on delete cascade,
    user_id       uuid not null references users(id) on delete cascade,
    content       text not null,
    created_at    timestamptz not null default now(),
    edited_at     timestamptz,
    search_vector tsvector generated always as (to_tsvector('english', content)) stored
);
create index idx_messages_channel_created on messages(channel_id, created_at desc);
create index idx_messages_search on messages using gin(search_vector);

-- ---------------------------------------------------------------------------
-- Kanban
-- ---------------------------------------------------------------------------
create table boards (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    name         varchar(120) not null,
    created_at   timestamptz not null default now()
);

create table board_columns (
    id         uuid primary key default gen_random_uuid(),
    board_id   uuid not null references boards(id) on delete cascade,
    name       varchar(80) not null,
    position   double precision not null default 1000,   -- fractional ordering
    created_at timestamptz not null default now()
);
create index idx_columns_board on board_columns(board_id);

create table tasks (
    id          uuid primary key default gen_random_uuid(),
    column_id   uuid not null references board_columns(id) on delete cascade,
    title       varchar(200) not null,
    description text,
    assignee_id uuid references users(id) on delete set null,
    due_date    date,
    position    double precision not null default 1000,
    created_by  uuid references users(id) on delete set null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create index idx_tasks_column_position on tasks(column_id, position);

-- ---------------------------------------------------------------------------
-- Snippets
-- ---------------------------------------------------------------------------
create table snippets (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    user_id      uuid not null references users(id) on delete cascade,
    title        varchar(200) not null,
    language     varchar(40) not null default 'plaintext',
    code         text not null,
    created_at   timestamptz not null default now()
);
create index idx_snippets_workspace on snippets(workspace_id);

create table snippet_comments (
    id         uuid primary key default gen_random_uuid(),
    snippet_id uuid not null references snippets(id) on delete cascade,
    user_id    uuid not null references users(id) on delete cascade,
    content    text not null,
    created_at timestamptz not null default now()
);
create index idx_snippet_comments_snippet on snippet_comments(snippet_id);

-- ---------------------------------------------------------------------------
-- Activity feed & notifications
-- ---------------------------------------------------------------------------
create table activities (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    actor_id     uuid references users(id) on delete set null,
    type         varchar(60) not null,
    payload      jsonb not null default '{}'::jsonb,
    created_at   timestamptz not null default now()
);
create index idx_activities_workspace_created on activities(workspace_id, created_at desc);

create table notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users(id) on delete cascade,
    type       varchar(60) not null,
    payload    jsonb not null default '{}'::jsonb,
    read_at    timestamptz,
    created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on notifications(user_id, read_at);
