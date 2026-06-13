package com.devcollab.ws;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/presence")
public class PresenceController {

    private final PresenceTracker presence;

    public PresenceController(PresenceTracker presence) {
        this.presence = presence;
    }

    /** Snapshot of currently-online user ids. */
    @GetMapping
    public List<String> online() {
        return presence.online();
    }
}
