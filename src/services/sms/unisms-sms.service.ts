import type { ISmsProvider, SmsSendResult } from "./sms-provider.interface";
import { normalizePhoneNumber } from "@/lib/utils/phone";

/**
 * UniSMS integration (unismsapi.com)
 * API keys typically look like sk_XXXXX or sk-XXXXX
 * @see https://unismsapi.com/docs/sms
 */
export class UniSmsService implements ISmsProvider {
  readonly name = "UniSMS";

  constructor(private apiKey: string) {}

  async sendOtp(
    phoneNumber: string,
    otp: string,
    studentId: string
  ): Promise<SmsSendResult> {
    const recipient = normalizePhoneNumber(phoneNumber);
    const content = `FilCycle: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code. Ref: ${studentId}`;

    try {
      const auth = Buffer.from(`${this.apiKey}:`).toString("base64");
      const response = await fetch("https://unismsapi.com/api/sms", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient, content }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          (data as { message?: string })?.message ||
          (typeof data === "string" ? data : null) ||
          `UniSMS request failed (${response.status})`;
        console.error("[UniSMS] Send failed:", { recipient, error: errorMsg, data });
        return { success: false, error: errorMsg };
      }

      const record = data as { message?: { id?: string; status?: string } };
      if (process.env.NODE_ENV !== "production") {
        console.log(`[UniSMS] Sent → ${recipient} (status: ${record.message?.status ?? "queued"})`);
      }

      return { success: true, messageId: record.message?.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "SMS send failed";
      console.error("[UniSMS] Request error:", msg);
      return { success: false, error: msg };
    }
  }
}
