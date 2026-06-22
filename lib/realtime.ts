// lib/realtime.ts
import PusherServer from 'pusher';

/**
 * UTILITY: Centralized Real-Time Event Broadcaster Instance
 * 🚀 FIXED: Global caching design pattern to prevent Vercel Serverless Functions 
 * from leaking duplicate socket connections during runtime executions.
 */
const globalForPusher = globalThis as unknown as {
  realtimeServer: PusherServer | undefined;
};

export const realtimeServer =
  globalForPusher.realtimeServer ??
  new PusherServer({
    appId: process.env.PUSHER_APP_ID || "",
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
    secret: process.env.PUSHER_SECRET || "",
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    useTLS: true,
  });

// In development or local hot-reloads, persist the reference globally
if (process.env.NODE_ENV !== "production") {
  globalForPusher.realtimeServer = realtimeServer;
}