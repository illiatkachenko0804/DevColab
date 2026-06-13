package com.devcollab.workspace;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.devcollab.common.error.ApiException;

/** Authorization helper: ensures a user belongs to a workspace. */
@Component
public class WorkspaceGuard {

    private final MembershipRepository memberships;

    public WorkspaceGuard(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    public void requireMember(UUID workspaceId, UUID userId) {
        if (!memberships.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not a member of this project");
        }
    }
}
