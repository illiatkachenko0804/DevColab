-- Shared project files (pdf, images, docs, …). Bytes live in object storage
-- (local dir in dev; pluggable to Supabase Storage); metadata lives here.
create table files (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    uploader_id  uuid references users(id) on delete set null,
    name         varchar(255) not null,
    content_type varchar(150),
    size_bytes   bigint not null,
    storage_key  varchar(255) not null,
    created_at   timestamptz not null default now()
);
create index idx_files_workspace on files(workspace_id, created_at desc);
