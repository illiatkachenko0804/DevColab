package com.devcollab.snippet;

import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SnippetStarService {
    private final SnippetStarRepository stars;
    private final SnippetRepository snippets;
    private final SimpMessagingTemplate broker;

    public SnippetStarService(SnippetStarRepository stars, SnippetRepository snippets, SimpMessagingTemplate broker) {
        this.stars = stars;
        this.snippets = snippets;
        this.broker = broker;
    }

    @Transactional
    public void toggleStar(UUID snippetId, UUID userId) {
        if (stars.existsBySnippetIdAndUserId(snippetId, userId)) {
            stars.deleteById(new SnippetStarId(snippetId, userId));
        } else {
            SnippetStar star = new SnippetStar();
            star.setSnippetId(snippetId);
            star.setUserId(userId);
            stars.save(star);
        }
        snippets.findById(snippetId).ifPresent(s ->
            broker.convertAndSend("/topic/workspace." + s.getWorkspaceId() + ".snippets", "{\"type\":\"SNIPPETS_UPDATE\"}"));
    }
}

