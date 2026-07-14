package com.devcollab.snippet;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.devcollab.common.error.ApiException;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class SnippetStarService {
    private final SnippetStarRepository stars;
    private final SnippetRepository snippets;
    private final SimpMessagingTemplate broker;
    private final WorkspaceGuard guard;

    public SnippetStarService(SnippetStarRepository stars, SnippetRepository snippets, SimpMessagingTemplate broker, WorkspaceGuard guard) {
        this.stars = stars;
        this.snippets = snippets;
        this.broker = broker;
        this.guard = guard;
    }

    @Transactional
    public void toggleStar(UUID snippetId, UUID userId) {
        Snippet snippet = snippets.findById(snippetId).orElseThrow(() -> ApiException.badRequest("Snippet not found"));
        guard.requireMember(snippet.getWorkspaceId(), userId);
        if ("PRIVATE".equals(snippet.getVisibility()) && !snippet.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This snippet is private");
        }
        if (stars.existsBySnippetIdAndUserId(snippetId, userId)) {
            stars.deleteById(new SnippetStarId(snippetId, userId));
        } else {
            SnippetStar star = new SnippetStar();
            star.setSnippetId(snippetId);
            star.setUserId(userId);
            stars.save(star);
        }
        broker.convertAndSend("/topic/workspace." + snippet.getWorkspaceId() + ".snippets", "{\"type\":\"SNIPPETS_UPDATE\"}");
    }
}
