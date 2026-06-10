package com.devcollab.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Holds the {@link PasswordEncoder} bean on its own so it isn't entangled with
 * {@code SecurityConfig}'s constructor dependencies (which would create a cycle
 * via OAuth2SuccessHandler -> AuthService -> PasswordEncoder).
 */
@Configuration
public class PasswordConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
