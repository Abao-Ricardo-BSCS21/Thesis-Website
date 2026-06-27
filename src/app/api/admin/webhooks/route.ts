import { NextRequest } from "next/server";
import { RoleName, WebhookChannel } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { webhookRepository } from "@/repositories/webhook.repository";
import { webhookCreateSchema } from "@/validators/webhook.validators";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") as WebhookChannel | null;

  const webhooks = await webhookRepository.findAll(
    channel && channel === "EMAIL" ? channel : undefined
  );

  return apiResponse(webhooks);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const body = await parseBody(request);
  if (!body) return apiError("Invalid request body", 400);

  const parsed = webhookCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  try {
    const webhook = await webhookRepository.create(parsed.data);
    return apiResponse(webhook, 201);
  } catch (err) {
    console.error("[webhooks POST]", err);
    const message =
      err instanceof Error ? err.message : "Failed to save webhook";
    return apiError(
      message.includes("webhookEndpoint")
        ? "Database not ready — restart the dev server after running: npx prisma generate"
        : message,
      500
    );
  }
}
