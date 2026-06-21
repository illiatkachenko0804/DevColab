package com.devcollab.snippet;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.web.CurrentUser;
import com.devcollab.snippet.dto.AddCommentRequest;
import com.devcollab.snippet.dto.CollectionResponse;
import com.devcollab.snippet.dto.CreateCollectionRequest;
import com.devcollab.snippet.dto.CreateSnippetRequest;
import com.devcollab.snippet.dto.RevisionResponse;
import com.devcollab.snippet.dto.SnippetCommentResponse;
import com.devcollab.snippet.dto.SnippetDetailResponse;
import com.devcollab.snippet.dto.SnippetResponse;
import com.devcollab.snippet.dto.TagResponse;
import com.devcollab.snippet.dto.UpdateCollectionRequest;
import com.devcollab.snippet.dto.UpdateSnippetRequest;

import jakarta.validation.Valid;

@RestController
public class SnippetController {

    private final SnippetService snippets;
    private final SnippetCollectionService collections;
    private final SnippetTagService tags;
    private final SnippetRevisionService revisions;
    private final SnippetStarService stars;

    public SnippetController(SnippetService snippets, SnippetCollectionService collections,
                             SnippetTagService tags, SnippetRevisionService revisions,
                             SnippetStarService stars) {
        this.snippets = snippets;
        this.collections = collections;
        this.tags = tags;
        this.revisions = revisions;
        this.stars = stars;
    }

    // Snippets
    @GetMapping("/api/workspaces/{workspaceId}/snippets")
    public List<SnippetResponse> list(
            @PathVariable UUID workspaceId, 
            @RequestParam(required = false) String collectionId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean starred,
            @RequestParam(required = false) Boolean mine,
            Authentication auth) {
        return snippets.list(workspaceId, CurrentUser.id(auth), collectionId, tag, search, starred, mine);
    }

    @PostMapping("/api/workspaces/{workspaceId}/snippets")
    public ResponseEntity<SnippetResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody CreateSnippetRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(snippets.create(workspaceId, CurrentUser.id(auth), req));
    }

    @PatchMapping("/api/snippets/{snippetId}")
    public SnippetResponse update(@PathVariable UUID snippetId, @Valid @RequestBody UpdateSnippetRequest req, Authentication auth) {
        return snippets.update(snippetId, CurrentUser.id(auth), req);
    }

    @PostMapping("/api/snippets/{snippetId}/fork")
    public SnippetResponse fork(@PathVariable UUID snippetId, Authentication auth) {
        return snippets.fork(snippetId, CurrentUser.id(auth));
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

    // Collections
    @GetMapping("/api/workspaces/{workspaceId}/snippet-collections")
    public List<CollectionResponse> listCollections(@PathVariable UUID workspaceId) {
        return collections.listCollections(workspaceId);
    }

    @PostMapping("/api/workspaces/{workspaceId}/snippet-collections")
    public ResponseEntity<CollectionResponse> createCollection(
            @PathVariable UUID workspaceId, @Valid @RequestBody CreateCollectionRequest req, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(collections.createCollection(workspaceId, CurrentUser.id(auth), req));
    }

    @PutMapping("/api/snippet-collections/{id}")
    public CollectionResponse updateCollection(
            @PathVariable UUID id, @RequestParam UUID workspaceId, @Valid @RequestBody UpdateCollectionRequest req) {
        return collections.updateCollection(id, workspaceId, req);
    }

    @DeleteMapping("/api/snippet-collections/{id}")
    public ResponseEntity<Void> deleteCollection(@PathVariable UUID id, @RequestParam UUID workspaceId) {
        collections.deleteCollection(id, workspaceId);
        return ResponseEntity.noContent().build();
    }

    // Tags
    @GetMapping("/api/workspaces/{workspaceId}/snippet-tags")
    public List<TagResponse> listTags(@PathVariable UUID workspaceId) {
        return tags.listTags(workspaceId);
    }

    @DeleteMapping("/api/snippet-tags/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable UUID id, @RequestParam UUID workspaceId) {
        tags.deleteTag(id, workspaceId);
        return ResponseEntity.noContent().build();
    }

    // Stars
    @PostMapping("/api/snippets/{snippetId}/star")
    public ResponseEntity<Void> toggleStar(@PathVariable UUID snippetId, Authentication auth) {
        stars.toggleStar(snippetId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }

    // Revisions
    @GetMapping("/api/snippets/{snippetId}/revisions")
    public List<RevisionResponse> listRevisions(@PathVariable UUID snippetId) {
        return revisions.listRevisions(snippetId);
    }
}
