package com.devcollab.ws;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** Tracks which users have an open WebSocket and broadcasts the online set. */
@Component
public class PresenceTracker {

    private final Map<String, Integer> sessionCounts = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate broker;

    public PresenceTracker(SimpMessagingTemplate broker) {
        this.broker = broker;
    }

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        String userId = userId(event.getUser());
        if (userId == null) return;
        sessionCounts.merge(userId, 1, Integer::sum);
        broadcast();
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String userId = userId(event.getUser());
        if (userId == null) return;
        sessionCounts.compute(userId, (k, v) -> (v == null || v <= 1) ? null : v - 1);
        broadcast();
    }

    public List<String> online() {
        return List.copyOf(sessionCounts.keySet());
    }

    private void broadcast() {
        broker.convertAndSend("/topic/presence", online());
    }

    private static String userId(Principal p) {
        return p == null ? null : p.getName();
    }
}
