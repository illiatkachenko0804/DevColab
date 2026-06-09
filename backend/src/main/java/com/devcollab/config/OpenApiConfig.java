package com.devcollab.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI devCollabOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("DevCollab API")
                .description("Real-time developer collaboration platform")
                .version("v0.1.0")
                .license(new License().name("MIT")));
    }
}
