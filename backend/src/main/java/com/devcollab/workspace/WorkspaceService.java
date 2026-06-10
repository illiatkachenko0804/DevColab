package com.devcollab.workspace;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.dto.CreateWorkspaceRequest;
import com.devcollab.workspace.dto.WorkspaceResponse;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaces;
    private final MembershipRepository memberships;

    public WorkspaceService(WorkspaceRepository workspaces, MembershipRepository memberships) {
        this.workspaces = workspaces;
        this.memberships = memberships;
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

        return WorkspaceResponse.from(w, "ADMIN");
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> listMine(UUID userId) {
        return memberships.findByUserIdOrderByJoinedAtAsc(userId).stream()
                .map(m -> workspaces.findById(m.getWorkspaceId())
                        .map(w -> WorkspaceResponse.from(w, m.getRole()))
                        .orElse(null))
                .filter(r -> r != null)
                .toList();
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
}
