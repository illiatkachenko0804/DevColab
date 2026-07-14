package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.devcollab.common.error.ApiException;
import com.devcollab.snippet.dto.RevisionResponse;
import com.devcollab.snippet.dto.SnippetResponse;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class SnippetRevisionService {
    private final SnippetRevisionRepository revisions;
    private final UserRepository users;
    private final SnippetRepository snippets;
    private final WorkspaceGuard guard;

    public SnippetRevisionService(SnippetRevisionRepository revisions, UserRepository users, SnippetRepository snippets, WorkspaceGuard guard) {
        this.revisions = revisions;
        this.users = users;
        this.snippets = snippets;
        this.guard = guard;
    }

    public List<RevisionResponse> listRevisions(UUID snippetId, UUID userId) {
        Snippet snippet = snippets.findById(snippetId).orElseThrow(() -> ApiException.badRequest("Snippet not found"));
        guard.requirePermission(snippet.getWorkspaceId(), userId, "viewApps");
        return revisions.findBySnippetIdOrderByCreatedAtDesc(snippetId).stream().map(r -> {
            User u = r.getUserId() != null ? users.findById(r.getUserId()).orElse(null) : null;
            SnippetResponse.Author author = u != null ? new SnippetResponse.Author(
                    u.getId().toString(), u.getDisplayName(), u.getDevTag(), u.getAvatarUrl()
            ) : null;
            return new RevisionResponse(
                    r.getId().toString(), r.getCode(), r.getLanguage(), r.getMessage(),
                    author, r.getCreatedAt().toString()
            );
        }).toList();
    }

    @Transactional
    public void createRevision(UUID snippetId, String code, String language, String message, UUID userId) {
        SnippetRevision r = new SnippetRevision();
        r.setSnippetId(snippetId);
        r.setCode(code);
        r.setLanguage(language);
        r.setMessage(message);
        r.setUserId(userId);
        revisions.save(r);
    }
}
