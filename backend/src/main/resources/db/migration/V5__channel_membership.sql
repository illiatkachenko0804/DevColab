-- Channels become participant-based (like DMs): you only see channels you're in.
-- Backfill existing text channels with all current workspace members so the
-- existing data stays visible.

insert into channel_participants (channel_id, user_id)
select c.id, m.user_id
from channels c
join memberships m on m.workspace_id = c.workspace_id
where c.type = 'TEXT'
on conflict (channel_id, user_id) do nothing;
