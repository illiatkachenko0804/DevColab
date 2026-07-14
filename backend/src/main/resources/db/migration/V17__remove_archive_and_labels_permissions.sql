UPDATE workspace_roles
SET permissions = replace(replace(replace(replace(permissions, '"archiveProject":true,', ''), '"archiveProject":false,', ''), '"manageLabels":true,', ''), '"manageLabels":false,', '');
