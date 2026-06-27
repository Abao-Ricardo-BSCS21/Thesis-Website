import { WebhookChannel, WebhookEvent } from "@prisma/client";
import type { N8nWebhookPayload } from "@/lib/constants/webhooks";
import { analyzeN8nResponse } from "@/lib/utils/n8n-webhook";
import { webhookRepository } from "@/repositories/webhook.repository";

export interface DispatchResult {
  webhookId: string;
  name: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  warning?: string;
  responseBody?: string;
  workflowProcessed?: boolean;
}

export class WebhookDispatcherService {
  private repo = webhookRepository;

  /** Fire non-primary active webhooks (for parallel n8n workflows) */
  async dispatchSecondary(
    channel: WebhookChannel,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<DispatchResult[]> {
    const webhooks = await this.repo.findActiveForEvent(channel, event);
    const secondary = webhooks.filter((w) => !w.isPrimary);
    if (secondary.length === 0) return [];

    return Promise.all(
      secondary.map((webhook) =>
        this.sendToWebhook(
          webhook.id,
          webhook.url,
          webhook.secret,
          channel,
          event,
          data,
          webhook.name
        )
      )
    );
  }

  dispatchSecondaryAsync(
    channel: WebhookChannel,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): void {
    void this.dispatchSecondary(channel, event, data);
  }

  /** Fire all active webhooks matching channel + event (non-blocking) */
  async dispatch(
    channel: WebhookChannel,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<DispatchResult[]> {
    const webhooks = await this.repo.findActiveForEvent(channel, event);
    if (webhooks.length === 0) return [];

    return Promise.all(
      webhooks.map((webhook) => this.sendToWebhook(webhook.id, webhook.url, webhook.secret, channel, event, data, webhook.name))
    );
  }

  /** Dispatch without waiting — for OTP flow */
  dispatchAsync(
    channel: WebhookChannel,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): void {
    void this.dispatch(channel, event, data);
  }

  /** Send to a single webhook by ID (test button) */
  async testWebhook(
    webhookId: string,
    overrides?: Record<string, unknown>
  ): Promise<DispatchResult> {
    const webhook = await this.repo.findById(webhookId);
    if (!webhook) throw new Error("Webhook not found");

    const data: Record<string, unknown> = {
      test: true,
      message: "FilCycle n8n webhook test — connection successful.",
      ...overrides,
    };

    if (webhook.channel === "SMS") {
      data.phoneNumber = overrides?.phoneNumber ?? "+639171234567";
      data.recipient = data.phoneNumber;
    }
    if (webhook.channel === "EMAIL") {
      data.email = overrides?.email ?? "test@filamer.edu";
      data.subject = "FilCycle Webhook Test";
    }

    return this.sendToWebhook(
      webhook.id,
      webhook.url,
      webhook.secret,
      webhook.channel,
      WebhookEvent.MANUAL_TEST,
      data,
      webhook.name
    );
  }

  /** Deliver SMS via n8n (primary webhook, or first active match). Awaited — used for OTP. */
  async deliverSms(
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<DispatchResult> {
    const primary = await this.repo.findPrimary("SMS", event);
    const webhooks = primary
      ? [primary]
      : await this.repo.findActiveForEvent("SMS", event);

    if (webhooks.length === 0) {
      return {
        webhookId: "",
        name: "SMS",
        success: false,
        error:
          "No active SMS webhook configured. Add your n8n Production URL in Admin → Webhooks.",
      };
    }

    const hook = webhooks[0];
    const result = await this.sendToWebhook(
      hook.id,
      hook.url,
      hook.secret,
      "SMS",
      event,
      data,
      hook.name
    );

    if (result.success && result.workflowProcessed === false) {
      return {
        ...result,
        success: false,
        error:
          result.warning ||
          "n8n responded but did not process the SMS workflow. Check n8n Executions.",
      };
    }

    return result;
  }

  /** Use primary n8n webhook as delivery channel (returns success if any primary succeeds) */
  async dispatchPrimary(
    channel: WebhookChannel,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const primary = await this.repo.findPrimary(channel, event);
    if (!primary) return false;

    const result = await this.sendToWebhook(
      primary.id,
      primary.url,
      primary.secret,
      channel,
      event,
      data,
      primary.name
    );
    return result.success;
  }

  private async sendToWebhook(
    webhookId: string,
    url: string,
    secret: string | null,
    channel: WebhookChannel,
    event: WebhookEvent,
    data: Record<string, unknown>,
    name: string
  ): Promise<DispatchResult> {
    const payload: N8nWebhookPayload = {
      event,
      channel,
      timestamp: new Date().toISOString(),
      source: "filcycle",
      data,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "FilCycle-Webhook/1.0",
    };

    if (secret) {
      headers["x-webhook-secret"] = secret;
      headers["Authorization"] = `Bearer ${secret}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      const responseText = await response.text().catch(() => "");
      const analysis = analyzeN8nResponse(response.status, responseText);
      const success = analysis.httpOk;
      const workflowProcessed = analysis.workflowProcessed;

      await this.repo.updateLastRun(
        webhookId,
        !success ? "failed" : workflowProcessed ? "success" : "partial"
      );
      await this.repo.createLog({
        webhookId,
        event,
        status: !success ? "failed" : workflowProcessed ? "success" : "partial",
        statusCode: response.status,
        response: responseText,
        payload: payload as unknown as Record<string, unknown>,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[n8n Webhook] ${name} → ${event} (${response.status}${workflowProcessed ? ", processed" : ", NOT processed"})`
        );
        if (analysis.warning) console.warn(`[n8n Webhook] ${name}: ${analysis.warning}`);
      }

      return {
        webhookId,
        name,
        success,
        statusCode: response.status,
        responseBody: responseText.slice(0, 500),
        workflowProcessed,
        warning: analysis.warning,
        error: success ? undefined : responseText.slice(0, 200) || `HTTP ${response.status}`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Request failed";

      await this.repo.updateLastRun(webhookId, "error");
      await this.repo.createLog({
        webhookId,
        event,
        status: "error",
        response: msg,
        payload: payload as unknown as Record<string, unknown>,
      });

      console.error(`[n8n Webhook] ${name} failed:`, msg);

      return { webhookId, name, success: false, error: msg };
    }
  }
}

export const webhookDispatcher = new WebhookDispatcherService();
