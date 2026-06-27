import type { WebhookChannel, WebhookEvent } from "@prisma/client";

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  OTP_SEND: "OTP Send",
  STUDENT_REGISTER: "Student Registration",
  REWARD_REDEMPTION: "Reward Redemption",
  PASSWORD_RESET: "Password Reset",
  MANUAL_TEST: "Manual Test",
};

export const WEBHOOK_CHANNEL_LABELS: Record<WebhookChannel, string> = {
  EMAIL: "Email",
};

/** Events available per channel for n8n workflows */
export const WEBHOOK_EVENTS_BY_CHANNEL: Record<WebhookChannel, WebhookEvent[]> = {
  EMAIL: ["OTP_SEND", "STUDENT_REGISTER", "REWARD_REDEMPTION", "PASSWORD_RESET", "MANUAL_TEST"],
};

export interface N8nWebhookPayload {
  event: WebhookEvent;
  channel: WebhookChannel;
  timestamp: string;
  source: "filcycle";
  data: Record<string, unknown>;
}
