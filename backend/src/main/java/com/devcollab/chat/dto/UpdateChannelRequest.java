package com.devcollab.chat.dto;

import lombok.Data;

@Data
public class UpdateChannelRequest {
    private String name;
    private String description;
    private String imageUrl;
}
