// lib/realtime.ts
import PusherServer from 'pusher';

/**
 * UTILITY: Centralized Real-Time Event Broadcaster Instance
 * Manages atomic channel broadcasts for instant multi-tenant client synchronizations.
 */
export const realtimeServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
  useTLS: true,
});