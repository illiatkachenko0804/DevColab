package com.devcollab.board.dto;

import com.devcollab.board.TaskComment;
import com.devcollab.user.User;

public record CommentResponse(
    String id,
    TaskResponse.Assignee author,
    String content,
    String createdAt,
    String editedAt
) {
    public static CommentResponse of(TaskComment c, User author) {
        return new CommentResponse(
            c.getId().toString(),
            author == null ? null : new TaskResponse.Assignee(
                author.getId().toString(), author.getDisplayName(),
                author.getDevTag(), author.getAvatarUrl()),
            c.getContent(),
            c.getCreatedAt().toString(),
            c.getEditedAt() == null ? null : c.getEditedAt().toString()
        );
    }
}
