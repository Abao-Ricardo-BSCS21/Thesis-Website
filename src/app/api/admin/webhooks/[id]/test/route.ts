import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { webhookDispatcher } from "@/services/webhook/webhook-dispatcher.service";
import { webhookTestSchema } from "@/validators/webhook.validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;
  const body = await parseBody(request);
  const parsed = webhookTestSchema.safeParse(body ?? {});
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const result = await webhookDispatcher.testWebhook(id, {
      phoneNumber: parsed.data.recipient,
      email: parsed.data.email || undefined,
      message: parsed.data.message,
    });

    if (!result.success) {
      return apiError(result.error || "Webhook test failed", 502);
    }

    if (result.workflowProcessed === false) {
      return apiResponse(
        {
          message: "n8n responded but the workflow may not have run correctly",
          result,
          warning: result.warning,
        },
        200
      );
    }

    return apiResponse({
      message: "Webhook triggered and processed by n8n",
      result,
    });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : "Test failed", 500);
  }
}
