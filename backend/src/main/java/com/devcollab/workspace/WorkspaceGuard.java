package com.devcollab.workspace;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.devcollab.common.error.ApiException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Authorization helper: ensures a user belongs to a workspace. */
@Component
public class WorkspaceGuard {

    private final MembershipRepository memberships;
    private final WorkspaceRoleRepository roles;
    private final ObjectMapper mapper;

    public WorkspaceGuard(MembershipRepository memberships, WorkspaceRoleRepository roles, ObjectMapper mapper) {
        this.memberships = memberships;
        this.roles = roles;
        this.mapper = mapper;
    }

    public void requireMember(UUID workspaceId, UUID userId) {
        requireMembership(workspaceId, userId);
    }

    public Membership requireMembership(UUID workspaceId, UUID userId) {
        return memberships.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "You are not a member of this project"));
    }

    public void requireAdmin(UUID workspaceId, UUID userId) {
        Membership membership = requireMembership(workspaceId, userId);
        if (!"ADMIN".equalsIgnoreCase(membership.getRole())) {
            throw ApiException.forbidden("Only project admins can do this");
        }
    }

    public void requirePermission(UUID workspaceId, UUID userId, String permission) {
        if (!hasPermission(workspaceId, userId, permission)) {
            throw ApiException.forbidden("You do not have permission to " + permission);
        }
    }

    public boolean hasPermission(UUID workspaceId, UUID userId, String permission) {
        Map<String, Boolean> perms = getPermissions(workspaceId, requireMembership(workspaceId, userId).getRole());
        if (perms == null) return false;
        return Boolean.TRUE.equals(perms.get(permission));
    }

    public Map<String, Boolean> getPermissions(UUID workspaceId, String roleKey) {
        if ("ADMIN".equalsIgnoreCase(roleKey)) {
            WorkspaceRole admin = resolveRole(workspaceId, "ADMIN");
            if (admin != null) return readPermissions(admin.getPermissions());
        }
        WorkspaceRole role = resolveRole(workspaceId, roleKey);
        if (role == null) return Map.of();
        return readPermissions(role.getPermissions());
    }

    private WorkspaceRole resolveRole(UUID workspaceId, String roleKey) {
        String normalized = roleKey == null || roleKey.isBlank() ? "VIEWER" : roleKey.trim();
        
        WorkspaceRole systemRole = roles.findByWorkspaceIdAndSystemKey(workspaceId, normalized.toUpperCase()).orElse(null);
        if (systemRole != null) return systemRole;
        
        String finalNormalized = normalizeRoleKey(normalized);
        WorkspaceRole customRole = roles.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).stream()
                .filter(r -> r.getName() != null && normalizeRoleKey(r.getName()).equals(finalNormalized))
                .findFirst()
                .orElse(null);
        if (customRole != null) return customRole;
        
        if ("MEMBER".equalsIgnoreCase(normalized)) {
            return roles.findByWorkspaceIdAndSystemKey(workspaceId, "VIEWER").orElse(null);
        }
        
        return null;
    }

    private static String normalizeRoleKey(String value) {
        return value == null ? "" : value.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_").replaceAll("(^_|_$)", "");
    }

    private Map<String, Boolean> readPermissions(String raw) {
        try {
            return mapper.readValue(raw, new TypeReference<Map<String, Boolean>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    public boolean isMember(UUID workspaceId, UUID userId) {
        if (!memberships.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            return false;
        }
        return true;
    }
}
