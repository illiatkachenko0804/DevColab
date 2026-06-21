package com.devcollab.snippet;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SnippetStarId implements Serializable {
    private UUID snippetId;
    private UUID userId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SnippetStarId that = (SnippetStarId) o;
        return Objects.equals(snippetId, that.snippetId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(snippetId, userId);
    }
}
