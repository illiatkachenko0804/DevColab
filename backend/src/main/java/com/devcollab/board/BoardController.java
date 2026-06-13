package com.devcollab.board;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devcollab.board.dto.BoardResponse;
import com.devcollab.common.web.CurrentUser;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/board")
public class BoardController {

    private final BoardService boards;

    public BoardController(BoardService boards) {
        this.boards = boards;
    }

    @GetMapping
    public BoardResponse board(@PathVariable UUID workspaceId, Authentication auth) {
        return boards.getBoard(workspaceId, CurrentUser.id(auth));
    }
}
