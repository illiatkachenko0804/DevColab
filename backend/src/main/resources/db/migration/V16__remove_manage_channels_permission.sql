UPDATE workspace_roles
SET permissions = replace(replace(permissions, '"manageChannels":true,', ''), '"manageChannels":false,', '');
