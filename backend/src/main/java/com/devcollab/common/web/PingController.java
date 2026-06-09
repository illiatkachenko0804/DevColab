package com.devcollab.common.web;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Trivial liveness endpoint used to verify the scaffold end-to-end. */
@RestController
@RequestMapping("/api")
public class PingController {

    @GetMapping("/ping")
    Map<String, Object> ping() {
        return Map.of("status", "ok", "time", Instant.now().toString());
    }
}
