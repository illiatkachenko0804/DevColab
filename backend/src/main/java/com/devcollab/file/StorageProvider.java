package com.devcollab.file;

import java.io.InputStream;
import org.springframework.core.io.Resource;

public interface StorageProvider {
    void store(String storageKey, InputStream inputStream, long contentLength, String contentType) throws Exception;
    Resource resource(String storageKey) throws Exception;
    void delete(String storageKey) throws Exception;
}
