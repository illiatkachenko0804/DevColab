package com.devcollab.file;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.devcollab.common.error.ApiException;
import com.devcollab.file.dto.FileResponse;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class FileService {

    private final FileRepository files;
    private final UserRepository users;
    private final WorkspaceGuard guard;
    private final Path root;

    public FileService(
            FileRepository files, UserRepository users, WorkspaceGuard guard,
            @Value("${app.storage.dir:uploads}") String dir) {
        this.files = files;
        this.users = users;
        this.guard = guard;
        this.root = Path.of(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create storage dir " + root, e);
        }
    }

    @Transactional
    public FileResponse upload(UUID workspaceId, UUID userId, MultipartFile file, boolean hidden) {
        guard.requireMember(workspaceId, userId);
        if (file == null || file.isEmpty()) throw ApiException.badRequest("No file provided");

        String storageKey = UUID.randomUUID().toString();
        try {
            Files.copy(file.getInputStream(), root.resolve(storageKey));
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        StoredFile f = new StoredFile();
        f.setWorkspaceId(workspaceId);
        f.setUploaderId(userId);
        f.setName(sanitize(file.getOriginalFilename()));
        f.setContentType(file.getContentType());
        f.setSizeBytes(file.getSize());
        f.setStorageKey(storageKey);
        f.setHidden(hidden);
        files.save(f);
        return FileResponse.of(f, users.findById(userId).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<FileResponse> list(UUID workspaceId, UUID userId) {
        guard.requireMember(workspaceId, userId);
        return files.findByWorkspaceIdAndHiddenFalseOrderByCreatedAtDesc(workspaceId).stream()
                .map(f -> FileResponse.of(f, f.getUploaderId() == null ? null
                        : users.findById(f.getUploaderId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public StoredFile requireAccess(UUID fileId, UUID userId) {
        StoredFile f = files.findById(fileId)
                .orElseThrow(() -> ApiException.badRequest("File not found"));
        guard.requireMember(f.getWorkspaceId(), userId);
        return f;
    }

    public Resource resource(StoredFile f) {
        return new FileSystemResource(root.resolve(f.getStorageKey()));
    }

    @Transactional
    public void delete(UUID fileId, UUID userId) {
        StoredFile f = requireAccess(fileId, userId);
        if (f.getUploaderId() != null && !f.getUploaderId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the uploader can delete this file");
        }
        try {
            Files.deleteIfExists(root.resolve(f.getStorageKey()));
        } catch (IOException ignored) {
            // metadata removal still proceeds
        }
        files.delete(f);
    }

    private static String sanitize(String name) {
        if (name == null || name.isBlank()) return "file";
        return name.replaceAll("[\\r\\n]", "").trim();
    }
}
