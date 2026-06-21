package com.devcollab.snippet;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.common.error.ApiException;
import com.devcollab.snippet.dto.CreateSnippetRequest;
import com.devcollab.snippet.dto.SnippetCommentResponse;
import com.devcollab.snippet.dto.SnippetDetailResponse;
import com.devcollab.snippet.dto.SnippetResponse;
import com.devcollab.snippet.dto.UpdateSnippetRequest;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class SnippetService {

    private final SnippetRepository snippets;
    private final SnippetCommentRepository comments;
    private final SnippetCollectionRepository collections;
    private final SnippetStarRepository stars;
    private final SnippetTagService tagService;
    private final SnippetRevisionService revisionService;
    private final UserRepository users;
    private final WorkspaceGuard guard;
    private final SimpMessagingTemplate broker;

    public SnippetService(
            SnippetRepository snippets, SnippetCommentRepository comments,
            SnippetCollectionRepository collections, SnippetStarRepository stars,
            SnippetTagService tagService, SnippetRevisionService revisionService,
            UserRepository users, WorkspaceGuard guard, SimpMessagingTemplate broker) {
        this.snippets = snippets;
        this.comments = comments;
        this.collections = collections;
        this.stars = stars;
        this.tagService = tagService;
        this.revisionService = revisionService;
        this.users = users;
        this.guard = guard;
        this.broker = broker;
    }

    @Transactional(readOnly = true)
    public List<SnippetResponse> list(UUID workspaceId, UUID userId, String collectionId, String tag, String search, Boolean starred, Boolean mine) {
        guard.requireMember(workspaceId, userId);
        
        List<Snippet> list = snippets.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);

        if (collectionId != null && !collectionId.isEmpty()) {
            UUID cid = UUID.fromString(collectionId);
            list = list.stream().filter(s -> cid.equals(s.getCollectionId())).toList();
        }
        if (tag != null && !tag.isEmpty()) {
            list = list.stream().filter(s -> s.getTags().stream().anyMatch(t -> t.getName().equalsIgnoreCase(tag))).toList();
        }
        if (search != null && !search.isEmpty()) {
            String sq = search.toLowerCase();
            list = list.stream().filter(s -> 
                s.getTitle().toLowerCase().contains(sq) || 
                (s.getDescription() != null && s.getDescription().toLowerCase().contains(sq)) ||
                (s.getLanguage() != null && s.getLanguage().toLowerCase().contains(sq))
            ).toList();
        }
        if (Boolean.TRUE.equals(mine)) {
            list = list.stream().filter(s -> s.getUserId().equals(userId)).toList();
        }
        
        // Filter visibility
        list = list.stream().filter(s -> "WORKSPACE".equals(s.getVisibility()) || s.getUserId().equals(userId)).toList();

        if (Boolean.TRUE.equals(starred)) {
            List<SnippetStar> myStars = stars.findByUserId(userId);
            Set<UUID> starredIds = myStars.stream().map(SnippetStar::getSnippetId).collect(Collectors.toSet());
            list = list.stream().filter(s -> starredIds.contains(s.getId())).toList();
        }

        return list.stream()
                .map(s -> mapToResponse(s, userId))
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
        s.setDescription(req.description());
        s.setVisibility(req.visibility() != null ? req.visibility() : "WORKSPACE");
        
        if (req.collectionId() != null && !req.collectionId().isBlank()) {
            s.setCollectionId(UUID.fromString(req.collectionId()));
        }

        s = snippets.save(s);

        if (req.tags() != null) {
            for (String tName : req.tags()) {
                SnippetTag t = tagService.getOrCreateTag(workspaceId, tName);
                s.getTags().add(t);
            }
            snippets.save(s);
        }

        revisionService.createRevision(s.getId(), s.getCode(), s.getLanguage(), "Initial commit", userId);

        notifySnippets(workspaceId);
        return mapToResponse(s, userId);
    }

    @Transactional
    public SnippetResponse update(UUID snippetId, UUID userId, UpdateSnippetRequest req) {
        Snippet s = requireAccess(snippetId, userId);
        if (!s.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the author can update this snippet");
        }

        boolean codeChanged = false;

        if (req.title() != null) s.setTitle(req.title().trim());
        if (req.language() != null) {
            s.setLanguage(req.language().trim());
            codeChanged = true;
        }
        if (req.code() != null) {
            s.setCode(req.code());
            codeChanged = true;
        }
        if (req.description() != null) s.setDescription(req.description());
        if (req.visibility() != null) s.setVisibility(req.visibility());
        if (req.pinned() != null) s.setPinned(req.pinned());
        
        if (req.collectionId() != null) {
            s.setCollectionId(req.collectionId().isEmpty() ? null : UUID.fromString(req.collectionId()));
        }

        if (req.tags() != null) {
            s.getTags().clear();
            for (String tName : req.tags()) {
                SnippetTag t = tagService.getOrCreateTag(s.getWorkspaceId(), tName);
                s.getTags().add(t);
            }
        }

        s = snippets.save(s);

        if (codeChanged || (req.revisionMessage() != null && !req.revisionMessage().isEmpty())) {
            revisionService.createRevision(s.getId(), s.getCode(), s.getLanguage(), req.revisionMessage(), userId);
        }

        notifySnippets(s.getWorkspaceId());
        return mapToResponse(s, userId);
    }

    @Transactional
    public SnippetResponse fork(UUID snippetId, UUID userId) {
        Snippet original = requireAccess(snippetId, userId);
        
        Snippet s = new Snippet();
        s.setWorkspaceId(original.getWorkspaceId());
        s.setUserId(userId);
        s.setTitle(original.getTitle() + " (Fork)");
        s.setLanguage(original.getLanguage());
        s.setCode(original.getCode());
        s.setDescription(original.getDescription());
        s.setVisibility("WORKSPACE");
        s.setForkedFrom(original.getId());
        s.setCollectionId(original.getCollectionId());
        
        s = snippets.save(s);
        
        for (SnippetTag t : original.getTags()) {
            s.getTags().add(t);
        }
        snippets.save(s);

        revisionService.createRevision(s.getId(), s.getCode(), s.getLanguage(), "Forked from " + original.getTitle(), userId);

        notifySnippets(s.getWorkspaceId());
        return mapToResponse(s, userId);
    }

    @Transactional(readOnly = true)
    public SnippetDetailResponse get(UUID snippetId, UUID userId) {
        Snippet s = requireAccess(snippetId, userId);
        List<SnippetCommentResponse> cs = comments.findBySnippetIdOrderByCreatedAtAsc(snippetId).stream()
                .map(c -> SnippetCommentResponse.of(c, author(c.getUserId())))
                .toList();
        return new SnippetDetailResponse(mapToResponse(s, userId), cs);
    }

    @Transactional
    public void delete(UUID snippetId, UUID userId) {
        Snippet s = requireAccess(snippetId, userId);
        if (!s.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the author can delete this snippet");
        }
        UUID wsId = s.getWorkspaceId();
        comments.findBySnippetIdOrderByCreatedAtAsc(snippetId).forEach(comments::delete);
        snippets.delete(s);
        notifySnippets(wsId);
    }

    @Transactional
    public SnippetCommentResponse addComment(UUID snippetId, UUID userId, String content) {
        Snippet s = requireAccess(snippetId, userId);
        SnippetComment c = new SnippetComment();
        c.setSnippetId(snippetId);
        c.setUserId(userId);
        c.setContent(content.trim());
        comments.save(c);
        notifySnippets(s.getWorkspaceId());
        return SnippetCommentResponse.of(c, author(userId));
    }

    private Snippet requireAccess(UUID snippetId, UUID userId) {
        Snippet s = snippets.findById(snippetId)
                .orElseThrow(() -> ApiException.badRequest("Snippet not found"));
        guard.requireMember(s.getWorkspaceId(), userId);
        if ("PRIVATE".equals(s.getVisibility()) && !s.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This snippet is private");
        }
        return s;
    }

    private User author(UUID id) {
        return users.findById(id).orElse(null);
    }

    private void notifySnippets(UUID workspaceId) {
        broker.convertAndSend("/topic/workspace." + workspaceId + ".snippets", "{\"type\":\"SNIPPETS_UPDATE\"}");
    }

    private SnippetResponse mapToResponse(Snippet s, UUID currentUserId) {
        String colName = null;
        if (s.getCollectionId() != null) {
            colName = collections.findById(s.getCollectionId()).map(SnippetCollection::getName).orElse(null);
        }
        Snippet forkedSnippet = null;
        if (s.getForkedFrom() != null) {
            forkedSnippet = snippets.findById(s.getForkedFrom()).orElse(null);
        }
        boolean starred = stars.existsBySnippetIdAndUserId(s.getId(), currentUserId);
        long starCount = stars.countBySnippetId(s.getId());
        long commentCount = comments.countBySnippetId(s.getId());
        return SnippetResponse.of(s, author(s.getUserId()), commentCount, colName, forkedSnippet, starred, starCount);
    }
}
