/** n8n test URLs only work while "Listen for test event" is active in the editor */
export function isN8nTestWebhookUrl(url: string): boolean {
  try {
    return new URL(url).pathname.includes("/webhook-test/");
  } catch {
    return false;
  }
}

export function validateN8nWebhookUrl(url: string): string | null {
  if (isN8nTestWebhookUrl(url)) {
    return "Use the Production URL from n8n (path /webhook/...), not the Test URL (/webhook-test/...). Test URLs only work once after clicking Execute workflow in the n8n editor.";
  }
  return null;
}

export interface N8nResponseCheck {
  httpOk: boolean;
  statusCode: number;
  responseText: string;
  /** n8n acknowledged and parsed the payload (non-empty event/channel in response) */
  workflowProcessed: boolean;
  warning?: string;
}

/** Detect false-positive 200 responses when n8n responds but did not parse/route the payload */
export function analyzeN8nResponse(statusCode: number, responseText: string): N8nResponseCheck {
  const httpOk = statusCode >= 200 && statusCode < 300;
  const result: N8nResponseCheck = {
    httpOk,
    statusCode,
    responseText,
    workflowProcessed: httpOk,
  };

  if (!httpOk) {
    result.workflowProcessed = false;
    if (responseText.includes("not registered")) {
      result.warning =
        "n8n says this webhook is not registered. Activate the workflow in n8n (toggle top-right) and use the Production URL.";
    }
    return result;
  }

  try {
    const json = JSON.parse(responseText) as {
      success?: boolean;
      event?: string;
      channel?: string;
      message?: string;
    };

    if (json.message?.includes("FilCycle webhook processed by n8n")) {
      const hasParsedFields = Boolean(json.event?.trim() && json.channel?.trim());
      if (!hasParsedFields) {
        result.workflowProcessed = false;
        result.warning =
          "n8n returned HTTP 200 but did not parse the payload (empty event/channel). Re-import n8n/filcycle-email-workflow.json.";
      } else if (json.success === false && json.message) {
        result.workflowProcessed = false;
        result.warning = json.message;
      }
    }
  } catch {
    // Non-JSON 200 — assume connection ok but cannot verify routing
    const trimmed = responseText.trim();
    if (trimmed === "" || trimmed === "json") {
      result.workflowProcessed = false;
      result.warning =
        trimmed === "json"
          ? "n8n returned the literal text \"json\" — the workflow response is misconfigured. Re-import n8n/filcycle-email-workflow.json and activate the workflow."
          : "n8n returned HTTP 200 with an empty body — Respond node did not run. Re-import n8n/filcycle-email-workflow.json and activate the workflow.";
    }
  }

  return result;
}
