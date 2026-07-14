package com.devcollab.activity;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devcollab.activity.dto.ActivityResponse;
import com.devcollab.user.User;
import com.devcollab.user.UserRepository;

@Service
public class ActivityService {

    private final ActivityRepository activities;
    private final UserRepository users;
    private final SimpMessagingTemplate broker;

    public ActivityService(ActivityRepository activities, UserRepository users, SimpMessagingTemplate broker) {
        this.activities = activities;
        this.users = users;
        this.broker = broker;
    }

    @Transactional
    public void log(UUID workspaceId, UUID actorId, String app, String type, String text, String targetId) {
        User actor = users.findById(actorId).orElse(null);
        if (actor == null) return;

        Activity a = new Activity();
        a.setWorkspaceId(workspaceId);
        a.setActorId(actorId);
        a.setActorName(actor.getDisplayName());
        a.setApp(app);
        a.setType(type);
        a.setText(text);
        a.setTargetId(targetId);
        
        activities.save(a);

        ActivityResponse response = ActivityResponse.from(a);
        broker.convertAndSend("/topic/workspace." + workspaceId + ".activity", response);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> list(UUID workspaceId, int limit) {
        return activities.findRecentByWorkspaceId(workspaceId, PageRequest.of(0, limit))
                .stream()
                .map(ActivityResponse::from)
                .toList();
    }
}
