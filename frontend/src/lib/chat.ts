import { api } from "./api";

export interface Channel {
  id: string;
  name: string;
  type: "TEXT" | "DM";
  peerId: string | null;
  peerDevTag: string | null;
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
