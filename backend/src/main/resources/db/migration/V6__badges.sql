-- Per-channel read state (for unread badges).
create table channel_reads (
    id           uuid primary key default gen_random_uuid(),
    channel_id   uuid not null references channels(id) on delete cascade,
    user_id      uuid not null references users(id) on delete cascade,
    last_read_at timestamptz not null default now(),
    unique (channel_id, user_id)
);
create index idx_channel_reads_user on channel_reads(user_id);

-- Scope notifications to a workspace + an app, for grouped badges.
alter table notifications add column workspace_id uuid references workspaces(id) on delete cascade;
alter table notifications add column app varchar(20);
create index idx_notifications_user_unread2 on notifications(user_id, read_at);
