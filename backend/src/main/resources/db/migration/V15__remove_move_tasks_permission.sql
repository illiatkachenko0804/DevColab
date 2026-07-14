UPDATE workspace_roles
SET permissions = replace(replace(permissions, '"moveTasks":true,', ''), '"moveTasks":false,', '');
