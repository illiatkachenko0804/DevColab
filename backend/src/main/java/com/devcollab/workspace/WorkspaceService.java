package com.devcollab.workspace;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.board.BoardService;
import com.devcollab.chat.Channel;
import com.devcollab.chat.ChannelParticipant;
import com.devcollab.chat.ChannelParticipantRepository;
import com.devcollab.chat.ChannelRepository;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.dto.CreateWorkspaceRequest;
import com.devcollab.workspace.dto.CreateRoleRequest;
import com.devcollab.workspace.dto.RoleResponse;
import com.devcollab.workspace.dto.UpdateRoleRequest;
import com.devcollab.workspace.dto.UpdateWorkspaceSettingsRequest;
import com.devcollab.workspace.dto.WorkspaceResponse;
import com.devcollab.workspace.dto.WorkspaceSettingsResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaces;
    private final MembershipRepository memberships;
    private final ChannelRepository channels;
    private final ChannelParticipantRepository channelParticipants;
    private final BoardService boards;
    private final WorkspaceRoleRepository roles;
    private final ObjectMapper mapper;
    private final WorkspaceGuard guard;
    private final SimpMessagingTemplate broker;

    public WorkspaceService(
            WorkspaceRepository workspaces,
            MembershipRepository memberships,
            ChannelRepository channels,
            ChannelParticipantRepository channelParticipants,
            BoardService boards,
            WorkspaceRoleRepository roles,
            ObjectMapper mapper,
            WorkspaceGuard guard,
            SimpMessagingTemplate broker) {
        this.workspaces = workspaces;
        this.memberships = memberships;
        this.channels = channels;
        this.channelParticipants = channelParticipants;
        this.boards = boards;
        this.roles = roles;
        this.mapper = mapper;
        this.guard = guard;
        this.broker = broker;
    }

    @Transactional
    public WorkspaceResponse create(UUID ownerId, CreateWorkspaceRequest req) {
        Workspace w = new Workspace();
        w.setName(req.name().trim());
        w.setSlug(uniqueSlug(req.name()));
        w.setDescription(req.description() == null || req.description().isBlank()
                ? null : req.description().trim());
        w.setOwnerId(ownerId);
        workspaces.save(w);

        Membership m = new Membership();
        m.setWorkspaceId(w.getId());
        m.setUserId(ownerId);
        m.setRole("ADMIN");
        memberships.save(m);

        // Seed a default #general channel so the project isn't empty.
        Channel general = new Channel();
        general.setWorkspaceId(w.getId());
        general.setName("general");
        general.setType("TEXT");
        channels.save(general);

        ChannelParticipant p = new ChannelParticipant();
        p.setChannelId(general.getId());
        p.setUserId(ownerId);
        channelParticipants.save(p);

        // Seed a default Kanban board (Todo / In Progress / Done).
        boards.createDefaultBoard(w.getId());
        ensureDefaultRoles(w.getId());

        return WorkspaceResponse.from(w, "ADMIN", guard.getPermissions(w.getId(), "ADMIN"));
    }

    public List<WorkspaceResponse> listMine(UUID userId) {
        return memberships.findByUserIdOrderByJoinedAtAsc(userId).stream()
                .map(m -> workspaces.findById(m.getWorkspaceId())
                        .map(w -> WorkspaceResponse.from(w, m.getRole(), guard.getPermissions(w.getId(), m.getRole())))
                        .orElse(null))
                .filter(r -> r != null)
                .toList();
    }

    @Transactional
    public WorkspaceSettingsResponse settings(UUID workspaceId, UUID userId) {
        memberships.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> ApiException.forbidden("You are not a member of this project"));
        Workspace w = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));
        ensureDefaultRoles(workspaceId);
        return toSettings(w);
    }

    @Transactional
    public WorkspaceSettingsResponse updateSettings(UUID workspaceId, UUID userId, UpdateWorkspaceSettingsRequest req) {
        guard.requirePermission(workspaceId, userId, "manageProject");
        Workspace w = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));

        if (req.name() != null && !req.name().isBlank()) w.setName(req.name().trim());
        if (req.slug() != null && !req.slug().isBlank()) {
            String slug = slugify(req.slug());
            if (slug.isBlank()) throw ApiException.badRequest("Invalid slug");
            Workspace existing = workspaces.findBySlug(slug).orElse(null);
            if (existing != null && !existing.getId().equals(workspaceId)) {
                throw ApiException.conflict("That project slug is already taken");
            }
            w.setSlug(slug);
        }
        if (req.description() != null) w.setDescription(blankToNull(req.description()));
        if (req.avatarUrl() != null) w.setAvatarUrl(blankToNull(req.avatarUrl()));
        if (req.color() != null) w.setColor(blankToNull(req.color()));
        if (req.taskKeyPrefix() != null) w.setTaskKeyPrefix(cleanPrefix(req.taskKeyPrefix()));
        if (req.defaultTaskType() != null) w.setDefaultTaskType(oneOf(req.defaultTaskType(), "TASK", "BUG", "STORY", "EPIC"));
        if (req.defaultTaskPriority() != null) w.setDefaultTaskPriority(oneOf(req.defaultTaskPriority(), "LOW", "MEDIUM", "HIGH", "URGENT"));
        if (req.defaultSprintDays() != null) w.setDefaultSprintDays(req.defaultSprintDays());
        if (req.invitePolicy() != null) w.setInvitePolicy(oneOf(req.invitePolicy(), "ADMINS", "MAINTAINERS"));
        if (req.defaultRole() != null && !req.defaultRole().isBlank()) w.setDefaultRole(req.defaultRole().trim());

        workspaces.save(w);
        broker.convertAndSend("/topic/workspace." + workspaceId + ".members",
                Map.of("type", "SETTINGS_UPDATED"));
        return toSettings(w);
    }

    @Transactional
    public RoleResponse createRole(UUID workspaceId, UUID userId, CreateRoleRequest req) {
        guard.requirePermission(workspaceId, userId, "manageRoles");
        ensureDefaultRoles(workspaceId);
        String name = req.name().trim();
        if (roles.existsByWorkspaceIdAndNameIgnoreCase(workspaceId, name)) {
            throw ApiException.conflict("A role named " + name + " already exists");
        }
        WorkspaceRole role = new WorkspaceRole();
        role.setWorkspaceId(workspaceId);
        role.setName(name);
        role.setDescription(blankToNull(req.description()));
        role.setPermissions(writePermissions(req.permissions() == null ? viewerPermissions() : req.permissions()));
        roles.save(role);
        return toRole(role);
    }

    @Transactional
    public RoleResponse updateRole(UUID workspaceId, UUID userId, UUID roleId, UpdateRoleRequest req) {
        guard.requirePermission(workspaceId, userId, "manageRoles");
        WorkspaceRole role = roles.findById(roleId)
                .orElseThrow(() -> ApiException.badRequest("Role not found"));
        if (!role.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.badRequest("Role not found");
        }
        if ("ADMIN".equalsIgnoreCase(role.getSystemKey())) {
            throw ApiException.forbidden("Admin role cannot be edited");
        }
        if (req.name() != null && !req.name().isBlank()) {
            String name = req.name().trim();
            if (roles.existsByWorkspaceIdAndNameIgnoreCaseAndIdNot(workspaceId, name, roleId)) {
                throw ApiException.conflict("A role named " + name + " already exists");
            }
            role.setName(name);
        }
        if (req.description() != null) role.setDescription(blankToNull(req.description()));
        if (req.permissions() != null) role.setPermissions(writePermissions(req.permissions()));
        roles.save(role);
        broker.convertAndSend("/topic/workspace." + workspaceId + ".members",
                Map.of("type", "SETTINGS_UPDATED"));
        return toRole(role);
    }

    public String defaultRoleFor(UUID workspaceId) {
        return workspaces.findById(workspaceId).map(Workspace::getDefaultRole).orElse("VIEWER");
    }

    @Transactional
    public WorkspaceSettingsResponse archive(UUID workspaceId, UUID userId) {
        guard.requireAdmin(workspaceId, userId);
        Workspace w = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));
        w.setArchivedAt(Instant.now());
        workspaces.save(w);
        return toSettings(w);
    }

    @Transactional
    public void delete(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "manageProject");
        Workspace w = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));
        workspaces.delete(w);
    }

    private String uniqueSlug(String name) {
        String base = slugify(name);
        if (base.isEmpty()) base = "workspace";
        String slug = base;
        int n = 0;
        while (workspaces.existsBySlug(slug)) {
            n++;
            slug = base + "-" + Integer.toString((int) (Math.random() * 9000) + 1000);
            if (n > 5) throw ApiException.conflict("Could not generate a unique slug");
        }
        return slug;
    }

    private static String slugify(String input) {
        return input.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    public WorkspaceSettingsResponse export(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "exportData");
        Workspace w = workspaces.findById(workspaceId)
                .orElseThrow(() -> ApiException.badRequest("Project not found"));
        return toSettings(w);
    }

    private WorkspaceSettingsResponse toSettings(Workspace w) {
        return new WorkspaceSettingsResponse(
                w.getId().toString(),
                w.getName(),
                w.getSlug(),
                w.getDescription(),
                w.getAvatarUrl(),
                w.getColor(),
                w.getTaskKeyPrefix(),
                w.getDefaultTaskType(),
                w.getDefaultTaskPriority(),
                w.getDefaultSprintDays(),
                w.getInvitePolicy(),
                w.getDefaultRole(),
                w.getArchivedAt() != null,
                roles.findByWorkspaceIdOrderByCreatedAtAsc(w.getId()).stream()
                        .map(this::toRole)
                        .toList());
    }

    private RoleResponse toRole(WorkspaceRole role) {
        return new RoleResponse(
                role.getId().toString(),
                role.getName(),
                role.getDescription(),
                role.getSystemKey(),
                readPermissions(role.getPermissions()));
    }

    private void ensureDefaultRoles(UUID workspaceId) {
        if (roles.findByWorkspaceIdAndSystemKey(workspaceId, "ADMIN").isEmpty()) {
            WorkspaceRole admin = new WorkspaceRole();
            admin.setWorkspaceId(workspaceId);
            admin.setName("Admin");
            admin.setSystemKey("ADMIN");
            admin.setDescription("Full access to project settings, members, content and destructive actions.");
            admin.setPermissions(writePermissions(adminPermissions()));
            roles.save(admin);
        }
        if (roles.findByWorkspaceIdAndSystemKey(workspaceId, "VIEWER").isEmpty()) {
            WorkspaceRole viewer = new WorkspaceRole();
            viewer.setWorkspaceId(workspaceId);
            viewer.setName("Viewer");
            viewer.setSystemKey("VIEWER");
            viewer.setDescription("Can view apps and answer in channels or chats they were added to. No comments or management actions.");
            viewer.setPermissions(writePermissions(viewerPermissions()));
            roles.save(viewer);
        }
    }

    private Map<String, Boolean> readPermissions(String raw) {
        try {
            return mapper.readValue(raw, new TypeReference<Map<String, Boolean>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String writePermissions(Map<String, Boolean> permissions) {
        try {
            return mapper.writeValueAsString(permissions);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Boolean> adminPermissions() {
        Map<String, Boolean> p = new LinkedHashMap<>();
        permissionKeys().forEach(k -> p.put(k, true));
        return p;
    }

    private Map<String, Boolean> viewerPermissions() {
        Map<String, Boolean> p = new LinkedHashMap<>();
        permissionKeys().forEach(k -> p.put(k, false));
        p.put("viewApps", true);
        p.put("answerChannels", true);
        return p;
    }

    private List<String> permissionKeys() {
        return List.of(
                "viewApps", "answerChannels", "comment", "manageProject", "manageRoles",
                "inviteMembers", "removeMembers", "manageTasks", "manageSprints",
                "manageSnippets", "manageFiles",
                "exportData");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String cleanPrefix(String value) {
        String cleaned = value.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        return cleaned.isBlank() ? null : cleaned;
    }

    private static String oneOf(String value, String... allowed) {
        for (String option : allowed) {
            if (option.equalsIgnoreCase(value)) return option;
        }
        throw ApiException.badRequest("Invalid value: " + value);
    }
}
