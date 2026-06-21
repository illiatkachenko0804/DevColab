package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.devcollab.snippet.dto.TagResponse;

@Service
public class SnippetTagService {
    private final SnippetTagRepository tags;

    public SnippetTagService(SnippetTagRepository tags) {
        this.tags = tags;
    }

    public List<TagResponse> listTags(UUID workspaceId) {
        return tags.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
                .map(t -> new TagResponse(t.getId().toString(), t.getName(), 0)) // Note: count would need a query
                .toList();
    }

    @Transactional
    public SnippetTag getOrCreateTag(UUID workspaceId, String name) {
        String normalized = name.trim().toLowerCase();
        return tags.findByWorkspaceIdAndName(workspaceId, normalized)
                .orElseGet(() -> {
                    SnippetTag t = new SnippetTag();
                    t.setWorkspaceId(workspaceId);
                    t.setName(normalized);
                    return tags.save(t);
                });
    }

    @Transactional
    public void deleteTag(UUID id, UUID workspaceId) {
        SnippetTag t = tags.findById(id).orElseThrow();
        if (!t.getWorkspaceId().equals(workspaceId)) throw new RuntimeException("Unauthorized");
        tags.delete(t);
    }
}
