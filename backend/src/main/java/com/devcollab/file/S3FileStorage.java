package com.devcollab.file;

import java.io.InputStream;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

public class S3FileStorage implements StorageProvider {

    private final S3Client s3Client;
    private final String bucketName;

    public S3FileStorage(S3Client s3Client, String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    @Override
    public void store(String storageKey, InputStream inputStream, long contentLength, String contentType) throws Exception {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(storageKey)
                .contentType(contentType)
                .build();
        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
    }

    @Override
    public Resource resource(String storageKey) throws Exception {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(storageKey)
                .build();
        InputStream is = s3Client.getObject(request);
        return new InputStreamResource(is);
    }

    @Override
    public void delete(String storageKey) throws Exception {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(storageKey)
                .build();
        s3Client.deleteObject(request);
    }
}
