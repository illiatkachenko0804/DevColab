package com.devcollab.file;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.devcollab.common.error.ApiException;
import com.devcollab.file.dto.CreateFolderRequest;
import com.devcollab.file.dto.FileResponse;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;
import com.devcollab.workspace.WorkspaceGuard;

@Service
public class FileService {

    private final FileRepository files;
    private final FileMemberRepository fileMembers;
    private final UserRepository users;
    private final WorkspaceGuard guard;
    private final Path root;

    public FileService(
            FileRepository files, FileMemberRepository fileMembers, UserRepository users, WorkspaceGuard guard,
            @Value("${app.storage.dir:uploads}") String dir) {
        this.files = files;
        this.fileMembers = fileMembers;
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
    public FileResponse upload(UUID workspaceId, UUID userId, MultipartFile file, boolean hidden, UUID parentId, String accessType, List<UUID> allowedUsers) {
        guard.requireMember(workspaceId, userId);
        if (!hidden) {
            guard.requirePermission(workspaceId, userId, "manageFiles");
        }
        if (file == null || file.isEmpty()) throw ApiException.badRequest("No file provided");

        if (parentId != null) {
            requireAccess(parentId, userId);
        }

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
        f.setParentId(parentId);
        f.setFolder(false);
        if (accessType != null) {
            f.setAccessType(accessType);
        }
        files.save(f);

        if ("PRIVATE".equals(f.getAccessType()) && allowedUsers != null) {
            for (UUID u : allowedUsers) {
                fileMembers.save(new FileMember(f.getId(), u));
            }
            fileMembers.save(new FileMember(f.getId(), userId));
        }

        return FileResponse.of(f, users.findById(userId).orElse(null));
    }

    @Transactional
    public FileResponse createFolder(UUID workspaceId, UUID userId, CreateFolderRequest req) {
        guard.requireMember(workspaceId, userId);
        guard.requirePermission(workspaceId, userId, "manageFiles");

        if (req.parentId() != null) {
            requireAccess(req.parentId(), userId);
        }

        StoredFile f = new StoredFile();
        f.setWorkspaceId(workspaceId);
        f.setUploaderId(userId);
        f.setName(sanitize(req.name()));
        f.setContentType("inode/directory");
        f.setSizeBytes(0);
        f.setStorageKey("");
        f.setHidden(false);
        f.setFolder(true);
        f.setParentId(req.parentId());
        f.setAccessType(req.accessType() != null ? req.accessType() : "PUBLIC");
        files.save(f);

        if ("PRIVATE".equals(f.getAccessType()) && req.allowedUsers() != null) {
            for (UUID u : req.allowedUsers()) {
                fileMembers.save(new FileMember(f.getId(), u));
            }
            fileMembers.save(new FileMember(f.getId(), userId));
        }

        return FileResponse.of(f, users.findById(userId).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<FileResponse> list(UUID workspaceId, UUID userId) {
        guard.requirePermission(workspaceId, userId, "viewApps");
        // simple filtering in memory for access control
        return files.findByWorkspaceIdAndHiddenFalseOrderByCreatedAtDesc(workspaceId).stream()
                .filter(f -> hasAccess(f, userId))
                .map(f -> FileResponse.of(f, f.getUploaderId() == null ? null
                        : users.findById(f.getUploaderId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public StoredFile requireAccess(UUID fileId, UUID userId) {
        StoredFile f = files.findById(fileId)
                .orElseThrow(() -> ApiException.badRequest("File not found"));
        guard.requireMember(f.getWorkspaceId(), userId);
        if (!hasAccess(f, userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied to this file/folder");
        }
        return f;
    }

    private boolean hasAccess(StoredFile f, UUID userId) {
        if ("PUBLIC".equals(f.getAccessType())) {
            return true;
        }
        if ("INHERIT".equals(f.getAccessType()) && f.getParentId() != null) {
            StoredFile parent = files.findById(f.getParentId()).orElse(null);
            if (parent != null) {
                return hasAccess(parent, userId);
            }
        }
        if ("PRIVATE".equals(f.getAccessType())) {
            if (userId.equals(f.getUploaderId())) return true;
            return fileMembers.findByFileId(f.getId()).stream().anyMatch(m -> m.getUserId().equals(userId));
        }
        return true;
    }

    public Resource resource(StoredFile f) {
        if (f.isFolder()) throw ApiException.badRequest("Cannot download a folder");
        return new FileSystemResource(root.resolve(f.getStorageKey()));
    }

    @Transactional
    public void delete(UUID fileId, UUID userId) {
        StoredFile f = requireAccess(fileId, userId);
        if (!f.isHidden() || (f.getUploaderId() != null && !f.getUploaderId().equals(userId))) {
            guard.requirePermission(f.getWorkspaceId(), userId, "manageFiles");
        }
        if (!f.isFolder()) {
            try {
                Files.deleteIfExists(root.resolve(f.getStorageKey()));
            } catch (IOException ignored) {
            }
        }
        files.delete(f);
    }

    private static String sanitize(String name) {
        if (name == null || name.isBlank()) return "file";
        return name.replaceAll("[\\r\\n]", "").trim();
    }
}
