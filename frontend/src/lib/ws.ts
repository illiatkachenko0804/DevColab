"use client";

import { Client, type StompSubscription } from "@stomp/stompjs";

const WS_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/^http/, "ws") + "/ws";

interface Sub {
  destination: string;
  cb: (body: unknown) => void;
  live?: StompSubscription;
}

let client: Client | null = null;
const subs = new Set<Sub>();
const connectListeners = new Set<() => void>();

function ensure(): Client {
  if (client) return client;
  client = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 3000,
    debug: (str) => console.log("[STOMP]", str),
    onConnect: () => {
      // (Re)subscribe everything on every connect.
      subs.forEach((s) => {
        s.live = client!.subscribe(s.destination, (msg) => {
          try {
            s.cb(JSON.parse(msg.body));
          } catch {
            s.cb(msg.body);
          }
        });
      });
      // Let listeners refresh state (e.g. presence snapshot) once connected.
      connectListeners.forEach((cb) => cb());
    },
  });
  client.activate();
  return client;
}

/** Registers a callback fired on every (re)connect; fires now if already connected. */
export function addConnectListener(cb: () => void): () => void {
  connectListeners.add(cb);
  if (client?.connected) cb();
  return () => connectListeners.delete(cb);
}

export function wsConnect() {
  ensure();
}

export function wsDisconnect() {
  subs.clear();
  client?.deactivate();
  client = null;
}

export function subscribe(destination: string, cb: (body: unknown) => void): () => void {
  const c = ensure();
  const sub: Sub = { destination, cb };
  subs.add(sub);
  if (c.connected) {
    sub.live = c.subscribe(destination, (msg) => {
      try {
        cb(JSON.parse(msg.body));
      } catch {
        cb(msg.body);
      }
    });
  }
  return () => {
    sub.live?.unsubscribe();
    subs.delete(sub);
  };
}

export function publish(destination: string, body: unknown) {
  const c = ensure();
  if (c.connected) {
    c.publish({ destination, body: JSON.stringify(body) });
  }
}
