package com.devcollab.file.dto;

import com.devcollab.file.StoredFile;
import com.devcollab.user.User;

public record FileResponse(
        String id,
        String name,
        String contentType,
        long size,
        String createdAt,
        Uploader uploader) {

    public record Uploader(String id, String displayName, String devTag) {}

    public static FileResponse of(StoredFile f, User uploader) {
        return new FileResponse(
                f.getId().toString(), f.getName(), f.getContentType(), f.getSizeBytes(),
                f.getCreatedAt().toString(),
                uploader == null ? null
                        : new Uploader(uploader.getId().toString(), uploader.getDisplayName(), uploader.getDevTag()));
    }
}
