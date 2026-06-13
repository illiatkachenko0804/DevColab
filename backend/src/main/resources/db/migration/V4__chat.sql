-- DM participants. Text channels are open to all workspace members; DM channels
-- (type = 'DM') restrict visibility to the two listed participants.

create table channel_participants (
    id         uuid primary key default gen_random_uuid(),
    channel_id uuid not null references channels(id) on delete cascade,
    user_id    uuid not null references users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (channel_id, user_id)
);
create index idx_channel_participants_user on channel_participants(user_id);
create index idx_channel_participants_channel on channel_participants(channel_id);

-- Widen channel name to fit deterministic DM keys ("dm:<uuid>_<uuid>").
alter table channels alter column name type varchar(120);
