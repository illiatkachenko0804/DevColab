package com.devcollab.chat.dto;

import com.devcollab.chat.Channel;
import com.devcollab.user.User;

public record ChannelResponse(
        String id,
        String name,
        String type,
        String peerId,
        String peerDevTag) {

    public static ChannelResponse text(Channel c) {
        return new ChannelResponse(c.getId().toString(), c.getName(), "TEXT", null, null);
    }

    public static ChannelResponse dm(Channel c, User peer) {
        return new ChannelResponse(
                c.getId().toString(), peer.getDisplayName(), "DM",
                peer.getId().toString(), peer.getDevTag());
    }
}
