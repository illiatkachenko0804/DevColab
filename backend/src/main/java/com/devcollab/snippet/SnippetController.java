package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.web.CurrentUser;
import com.devcollab.snippet.dto.AddCommentRequest;
import com.devcollab.snippet.dto.CreateSnippetRequest;
import com.devcollab.snippet.dto.SnippetCommentResponse;
import com.devcollab.snippet.dto.SnippetDetailResponse;
import com.devcollab.snippet.dto.SnippetResponse;

import jakarta.validation.Valid;

@RestController
public class SnippetController {

    private final SnippetService snippets;

    public SnippetController(SnippetService snippets) {
        this.snippets = snippets;
    }

    @GetMapping("/api/workspaces/{workspaceId}/snippets")
    public List<SnippetResponse> list(@PathVariable UUID workspaceId, Authentication auth) {
        return snippets.list(workspaceId, CurrentUser.id(auth));
    }

    @PostMapping("/api/workspaces/{workspaceId}/snippets")
    public ResponseEntity<SnippetResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody CreateSnippetRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(snippets.create(workspaceId, CurrentUser.id(auth), req));
    }

    @GetMapping("/api/snippets/{snippetId}")
    public SnippetDetailResponse get(@PathVariable UUID snippetId, Authentication auth) {
        return snippets.get(snippetId, CurrentUser.id(auth));
    }

    @DeleteMapping("/api/snippets/{snippetId}")
    public ResponseEntity<Void> delete(@PathVariable UUID snippetId, Authentication auth) {
        snippets.delete(snippetId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/snippets/{snippetId}/comments")
    public ResponseEntity<SnippetCommentResponse> comment(
            @PathVariable UUID snippetId, @Valid @RequestBody AddCommentRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(snippets.addComment(snippetId, CurrentUser.id(auth), req.content()));
    }
}
