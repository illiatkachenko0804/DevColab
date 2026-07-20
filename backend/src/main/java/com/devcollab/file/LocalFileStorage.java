package com.devcollab.file;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

public class LocalFileStorage implements StorageProvider {

    private final Path root;

    public LocalFileStorage(String dir) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create storage dir " + root, e);
        }
    }

    @Override
    public void store(String storageKey, InputStream inputStream, long contentLength, String contentType) throws Exception {
        Files.copy(inputStream, root.resolve(storageKey));
    }

    @Override
    public Resource resource(String storageKey) throws Exception {
        return new FileSystemResource(root.resolve(storageKey));
    }

    @Override
    public void delete(String storageKey) throws Exception {
        Files.deleteIfExists(root.resolve(storageKey));
    }
}
