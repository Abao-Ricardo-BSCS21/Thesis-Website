import { z } from "zod";
import { WebhookChannel, WebhookEvent } from "@prisma/client";
import { validateN8nWebhookUrl } from "@/lib/utils/n8n-webhook";

const webhookEventSchema = z.nativeEnum(WebhookEvent);
const webhookChannelSchema = z.nativeEnum(WebhookChannel);

const webhookUrlSchema = z
  .string()
  .min(1, "Webhook URL is required")
  .refine(
    (val) => {
      try {
        const u = new URL(val);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid http(s) URL (e.g. http://localhost:5678/webhook/filcycle)" }
  )
  .refine((val) => !validateN8nWebhookUrl(val), {
    message:
      "Use the n8n Production URL (/webhook/...), not the Test URL (/webhook-test/...).",
  });

export const webhookCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  channel: webhookChannelSchema,
  url: webhookUrlSchema,
  secret: z.string().max(256).optional().or(z.literal("")),
  events: z.array(webhookEventSchema).min(1, "Select at least one event"),
  description: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
});

export const webhookUpdateSchema = webhookCreateSchema.partial();

export const webhookTestSchema = z.object({
  recipient: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  message: z.string().max(500).optional(),
});

export type WebhookCreateInput = z.infer<typeof webhookCreateSchema>;
export type WebhookUpdateInput = z.infer<typeof webhookUpdateSchema>;
export type WebhookTestInput = z.infer<typeof webhookTestSchema>;
