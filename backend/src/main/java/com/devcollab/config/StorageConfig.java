package com.devcollab.config;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.devcollab.file.LocalFileStorage;
import com.devcollab.file.S3FileStorage;
import com.devcollab.file.StorageProvider;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class StorageConfig {

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.dir:uploads}")
    private String localDir;

    @Value("${app.storage.s3.endpoint:}")
    private String s3Endpoint;

    @Value("${app.storage.s3.region:auto}")
    private String s3Region;

    @Value("${app.storage.s3.access-key:}")
    private String s3AccessKey;

    @Value("${app.storage.s3.secret-key:}")
    private String s3SecretKey;

    @Value("${app.storage.s3.bucket-name:}")
    private String s3BucketName;

    @Bean
    public StorageProvider storageProvider() {
        if ("s3".equalsIgnoreCase(storageType)) {
            S3Client s3Client = S3Client.builder()
                    .region(Region.of(s3Region))
                    .endpointOverride(URI.create(s3Endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(s3AccessKey, s3SecretKey)))
                    .build();
            return new S3FileStorage(s3Client, s3BucketName);
        } else {
            return new LocalFileStorage(localDir);
        }
    }
}
