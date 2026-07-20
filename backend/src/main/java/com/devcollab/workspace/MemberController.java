package com.devcollab.workspace;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.common.web.CurrentUser;
import com.devcollab.workspace.dto.InviteRequest;
import com.devcollab.workspace.dto.MemberResponse;
import com.devcollab.workspace.dto.UpdateMemberRoleRequest;
import org.springframework.web.bind.annotation.PatchMapping;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/members")
public class MemberController {

    private final MemberService members;

    public MemberController(MemberService members) {
        this.members = members;
    }

    @GetMapping
    public List<MemberResponse> list(@PathVariable UUID workspaceId, Authentication auth) {
        return members.list(workspaceId, CurrentUser.id(auth));
    }

    @GetMapping("/search")
    public List<MemberResponse> search(
            @PathVariable UUID workspaceId,
            @RequestParam(name = "q", required = false) String q,
            Authentication auth) {
        return members.search(workspaceId, CurrentUser.id(auth), q);
    }

    @PostMapping
    public ResponseEntity<MemberResponse> invite(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody InviteRequest req,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(members.invite(workspaceId, CurrentUser.id(auth), req.query()));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(
            @PathVariable UUID workspaceId,
            @PathVariable String userId,
            Authentication auth) {
        members.remove(workspaceId, CurrentUser.id(auth), userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<Void> updateRole(
            @PathVariable UUID workspaceId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateMemberRoleRequest req,
            Authentication auth) {
        members.updateRole(workspaceId, CurrentUser.id(auth), userId, req);
        return ResponseEntity.noContent().build();
    }
}
