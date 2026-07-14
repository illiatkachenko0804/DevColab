package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.devcollab.snippet.dto.CollectionResponse;
import com.devcollab.snippet.dto.CreateCollectionRequest;
import com.devcollab.snippet.dto.UpdateCollectionRequest;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class SnippetCollectionService {
    private final SnippetCollectionRepository collections;
    private final SnippetRepository snippets;
    private final SimpMessagingTemplate broker;
    private final WorkspaceGuard guard;

    public SnippetCollectionService(SnippetCollectionRepository collections, SnippetRepository snippets, SimpMessagingTemplate broker, WorkspaceGuard guard) {
        this.collections = collections;
        this.snippets = snippets;
        this.broker = broker;
        this.guard = guard;
    }

    public List<CollectionResponse> listCollections(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "viewApps");
        return collections.findByWorkspaceIdOrderByPositionAsc(workspaceId).stream().map(c -> {
            long count = snippets.countByWorkspaceIdAndCollectionId(workspaceId, c.getId());
            return new CollectionResponse(
                    c.getId().toString(), c.getName(), c.getColor(), c.getIcon(), count);
        }).toList();
    }

    @Transactional
    public CollectionResponse createCollection(UUID workspaceId, UUID userId, CreateCollectionRequest req) {
        guard.requirePermission(workspaceId, userId, "manageSnippets");
        SnippetCollection c = new SnippetCollection();
        c.setWorkspaceId(workspaceId);
        c.setName(req.name());
        if (req.color() != null) c.setColor(req.color());
        if (req.icon() != null) c.setIcon(req.icon());
        c.setCreatedBy(userId);

        double max = collections.findByWorkspaceIdOrderByPositionAsc(workspaceId).stream()
                .mapToDouble(SnippetCollection::getPosition).max().orElse(0);
        c.setPosition(max + 1000);

        c = collections.save(c);
        notifySnippets(workspaceId);
        return new CollectionResponse(c.getId().toString(), c.getName(), c.getColor(), c.getIcon(), 0);
    }

    @Transactional
    public CollectionResponse updateCollection(UUID id, UUID workspaceId, UUID userId, UpdateCollectionRequest req) {
        guard.requirePermission(workspaceId, userId, "manageSnippets");
        SnippetCollection c = collections.findById(id).orElseThrow();
        if (!c.getWorkspaceId().equals(workspaceId)) throw new RuntimeException("Unauthorized");

        c.setName(req.name());
        if (req.color() != null) c.setColor(req.color());
        if (req.icon() != null) c.setIcon(req.icon());
        if (req.position() != null) c.setPosition(req.position());

        c = collections.save(c);
        long count = snippets.countByWorkspaceIdAndCollectionId(workspaceId, c.getId());
        notifySnippets(workspaceId);
        return new CollectionResponse(c.getId().toString(), c.getName(), c.getColor(), c.getIcon(), count);
    }

    @Transactional
    public void deleteCollection(UUID id, UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "manageSnippets");
        SnippetCollection c = collections.findById(id).orElseThrow();
        if (!c.getWorkspaceId().equals(workspaceId)) throw new RuntimeException("Unauthorized");
        collections.delete(c);
        notifySnippets(workspaceId);
    }

    private void notifySnippets(UUID workspaceId) {
        broker.convertAndSend("/topic/workspace." + workspaceId + ".snippets", "{\"type\":\"SNIPPETS_UPDATE\"}");
    }
}
