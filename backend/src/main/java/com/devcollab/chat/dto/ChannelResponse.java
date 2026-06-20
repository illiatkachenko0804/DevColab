package com.devcollab.chat.dto;

import com.devcollab.chat.Channel;
import com.devcollab.user.User;

public record ChannelResponse(
        String id,
        String name,
        String type,
        String peerId,
        String peerDevTag,
        long unread,
        String description,
        String imageUrl,
        String adminId) {

    public static ChannelResponse text(Channel c, long unread) {
        return new ChannelResponse(c.getId().toString(), c.getName(), "TEXT", null, null, unread,
                c.getDescription(), c.getImageUrl(), c.getAdminId() != null ? c.getAdminId().toString() : null);
    }

    public static ChannelResponse dm(Channel c, User peer, long unread) {
        return new ChannelResponse(
                c.getId().toString(), peer.getDisplayName(), "DM",
                peer.getId().toString(), peer.getDevTag(), unread,
                null, null, null);
    }
}
