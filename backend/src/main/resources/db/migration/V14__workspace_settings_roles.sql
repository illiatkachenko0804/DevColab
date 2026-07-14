alter table workspaces
    add column avatar_url text,
    add column color varchar(32),
    add column task_key_prefix varchar(16),
    add column default_task_type varchar(20) not null default 'TASK',
    add column default_task_priority varchar(20) not null default 'MEDIUM',
    add column default_sprint_days integer not null default 14,
    add column invite_policy varchar(40) not null default 'ADMINS',
    add column default_role varchar(80) not null default 'VIEWER',
    add column archived_at timestamptz;

create table workspace_roles (
    id          uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references workspaces(id) on delete cascade,
    name        varchar(80) not null,
    description text,
    permissions text not null default '{}',
    system_key  varchar(40),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (workspace_id, name)
);
create index idx_workspace_roles_workspace on workspace_roles(workspace_id);

insert into workspace_roles (workspace_id, name, description, system_key, permissions)
select id, 'Admin', 'Full access to project settings, members, content and destructive actions.', 'ADMIN',
       '{"viewApps":true,"answerChannels":true,"comment":true,"manageProject":true,"manageRoles":true,"inviteMembers":true,"removeMembers":true,"manageTasks":true,"manageSprints":true,"manageSnippets":true,"manageFiles":true,"exportData":true}'
from workspaces;

insert into workspace_roles (workspace_id, name, description, system_key, permissions)
select id, 'Viewer', 'Can view apps and answer in channels or chats they were added to. No comments or management actions.', 'VIEWER',
       '{"viewApps":true,"answerChannels":true,"comment":false,"manageProject":false,"manageRoles":false,"inviteMembers":false,"removeMembers":false,"manageTasks":false,"manageSprints":false,"manageSnippets":false,"manageFiles":false,"exportData":false}'
from workspaces;
