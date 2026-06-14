package com.devcollab.chat.dto;

import com.devcollab.chat.Channel;
import com.devcollab.user.User;

public record ChannelResponse(
        String id,
        String name,
        String type,
        String peerId,
        String peerDevTag,
        long unread) {

    public static ChannelResponse text(Channel c, long unread) {
        return new ChannelResponse(c.getId().toString(), c.getName(), "TEXT", null, null, unread);
    }

    public static ChannelResponse dm(Channel c, User peer, long unread) {
        return new ChannelResponse(
                c.getId().toString(), peer.getDisplayName(), "DM",
                peer.getId().toString(), peer.getDevTag(), unread);
    }
}
