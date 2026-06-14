package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;
import com.devcollab.snippet.dto.CreateSnippetRequest;
import com.devcollab.snippet.dto.SnippetCommentResponse;
import com.devcollab.snippet.dto.SnippetDetailResponse;
import com.devcollab.snippet.dto.SnippetResponse;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class SnippetService {

    private final SnippetRepository snippets;
    private final SnippetCommentRepository comments;
    private final UserRepository users;
    private final WorkspaceGuard guard;

    public SnippetService(
            SnippetRepository snippets, SnippetCommentRepository comments,
            UserRepository users, WorkspaceGuard guard) {
        this.snippets = snippets;
        this.comments = comments;
        this.users = users;
        this.guard = guard;
    }

    @Transactional(readOnly = true)
    public List<SnippetResponse> list(UUID workspaceId, UUID userId) {
        guard.requireMember(workspaceId, userId);
        return snippets.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(s -> SnippetResponse.of(s, author(s.getUserId()), comments.countBySnippetId(s.getId())))
                .toList();
    }

    @Transactional
    public SnippetResponse create(UUID workspaceId, UUID userId, CreateSnippetRequest req) {
        guard.requireMember(workspaceId, userId);
        Snippet s = new Snippet();
        s.setWorkspaceId(workspaceId);
        s.setUserId(userId);
        s.setTitle(req.title().trim());
        s.setLanguage(req.language() == null || req.language().isBlank() ? "plaintext" : req.language().trim());
        s.setCode(req.code());
        snippets.save(s);
        return SnippetResponse.of(s, author(userId), 0);
    }

    @Transactional(readOnly = true)
    public SnippetDetailResponse get(UUID snippetId, UUID userId) {
        Snippet s = requireAccess(snippetId, userId);
        List<SnippetCommentResponse> cs = comments.findBySnippetIdOrderByCreatedAtAsc(snippetId).stream()
                .map(c -> SnippetCommentResponse.of(c, author(c.getUserId())))
                .toList();
        return new SnippetDetailResponse(
                SnippetResponse.of(s, author(s.getUserId()), cs.size()), cs);
    }

    @Transactional
    public void delete(UUID snippetId, UUID userId) {
        Snippet s = requireAccess(snippetId, userId);
        if (!s.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the author can delete this snippet");
        }
        comments.findBySnippetIdOrderByCreatedAtAsc(snippetId).forEach(comments::delete);
        snippets.delete(s);
    }

    @Transactional
    public SnippetCommentResponse addComment(UUID snippetId, UUID userId, String content) {
        requireAccess(snippetId, userId);
        SnippetComment c = new SnippetComment();
        c.setSnippetId(snippetId);
        c.setUserId(userId);
        c.setContent(content.trim());
        comments.save(c);
        return SnippetCommentResponse.of(c, author(userId));
    }

    private Snippet requireAccess(UUID snippetId, UUID userId) {
        Snippet s = snippets.findById(snippetId)
                .orElseThrow(() -> ApiException.badRequest("Snippet not found"));
        guard.requireMember(s.getWorkspaceId(), userId);
        return s;
    }

    private User author(UUID id) {
        return users.findById(id).orElse(null);
    }
}
