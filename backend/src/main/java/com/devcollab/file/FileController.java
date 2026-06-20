package com.devcollab.file;

import java.util.List;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.devcollab.common.web.CurrentUser;
import com.devcollab.file.dto.FileResponse;

@RestController
public class FileController {

    private final FileService files;

    public FileController(FileService files) {
        this.files = files;
    }

    @PostMapping(path = "/api/workspaces/{workspaceId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileResponse> upload(
            @PathVariable UUID workspaceId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "hidden", required = false, defaultValue = "false") boolean hidden,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(files.upload(workspaceId, CurrentUser.id(auth), file, hidden));
    }

    @GetMapping("/api/workspaces/{workspaceId}/files")
    public List<FileResponse> list(@PathVariable UUID workspaceId, Authentication auth) {
        return files.list(workspaceId, CurrentUser.id(auth));
    }

    @GetMapping("/api/files/{fileId}")
    public ResponseEntity<Resource> download(
            @PathVariable UUID fileId,
            @RequestParam(name = "download", required = false, defaultValue = "false") boolean download,
            Authentication auth) {
        StoredFile f = files.requireAccess(fileId, CurrentUser.id(auth));
        String type = f.getContentType() != null ? f.getContentType() : "application/octet-stream";
        String disposition = (download ? "attachment" : "inline") + "; filename=\"" + f.getName() + "\"";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(type))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .contentLength(f.getSizeBytes())
                .body(files.resource(f));
    }

    @DeleteMapping("/api/files/{fileId}")
    public ResponseEntity<Void> delete(@PathVariable UUID fileId, Authentication auth) {
        files.delete(fileId, CurrentUser.id(auth));
        return ResponseEntity.noContent().build();
    }
}
