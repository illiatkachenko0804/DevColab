import { api } from "./api";

export interface Channel {
  id: string;
  name: string;
  type: "TEXT" | "DM";
  peerId: string | null;
  peerDevTag: string | null;
  unread: number;
  description: string | null;
  imageUrl: string | null;
  adminId: string | null;
}

export function markChannelRead(channelId: string): Promise<void> {
  return api(`/api/channels/${channelId}/read`, { method: "POST" });
}

export interface ChatMessage {
  id: string;
  channelId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    devTag: string;
    avatarUrl: string | null;
  };
}

export function listChannels(ws: string): Promise<Channel[]> {
  return api(`/api/workspaces/${ws}/channels`);
}

export function createChannel(ws: string, name: string): Promise<Channel> {
  return api(`/api/workspaces/${ws}/channels`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
}

export function updateChannel(ws: string, channelId: string, req: UpdateChannelRequest): Promise<Channel> {
  return api(`/api/workspaces/${ws}/channels/${channelId}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export function createDm(ws: string, userId: string): Promise<Channel> {
  return api(`/api/workspaces/${ws}/dms`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function listMessages(channelId: string): Promise<ChatMessage[]> {
  return api(`/api/channels/${channelId}/messages`);
}

export function sendMessage(channelId: string, content: string): Promise<ChatMessage> {
  return api(`/api/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export interface ChannelMember {
  id: string;
  displayName: string;
  devTag: string;
  avatarUrl: string | null;
}

export function listChannelMembers(channelId: string): Promise<ChannelMember[]> {
  return api(`/api/channels/${channelId}/members`);
}

export function addChannelMember(channelId: string, userId: string): Promise<ChannelMember> {
  return api(`/api/channels/${channelId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function removeChannelMember(channelId: string, userId: string): Promise<void> {
  return api(`/api/channels/${channelId}/members/${userId}`, {
    method: "DELETE",
  });
}

export interface TypingEvent {
  userId: string;
  displayName: string;
  typing: boolean;
}

export function fetchPresence(): Promise<string[]> {
  return api("/api/presence");
}
