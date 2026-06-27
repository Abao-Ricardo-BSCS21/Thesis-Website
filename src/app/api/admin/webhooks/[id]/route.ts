import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { webhookRepository } from "@/repositories/webhook.repository";
import { webhookUpdateSchema } from "@/validators/webhook.validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;
  const webhook = await webhookRepository.findById(id);
  if (!webhook) return apiError("Webhook not found", 404);

  return apiResponse(webhook);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;
  const body = await parseBody(request);
  const parsed = webhookUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const webhook = await webhookRepository.update(id, parsed.data);
  if (!webhook) return apiError("Webhook not found", 404);

  return apiResponse(webhook);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;

  try {
    await webhookRepository.delete(id);
    return apiResponse({ deleted: true });
  } catch {
    return apiError("Webhook not found", 404);
  }
}
