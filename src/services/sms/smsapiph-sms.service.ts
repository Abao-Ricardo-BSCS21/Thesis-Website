import type { ISmsProvider, SmsSendResult } from "./sms-provider.interface";
import { normalizePhoneNumber } from "@/lib/utils/phone";

const DEFAULT_BASE_URL = "https://smsapiph.onrender.com";

/**
 * SMS API PH — smsapiph.onrender.com
 * Supports SMS with server-side fallback (SMS → Email → Push)
 * @see https://smsapiph.onrender.com
 */
export class SmsApiPhService implements ISmsProvider {
  readonly name = "SMS API PH";

  constructor(
    private apiKey: string,
    private baseUrl = process.env.SMS_API_BASE_URL?.trim() || DEFAULT_BASE_URL
  ) {}

  async sendOtp(
    phoneNumber: string,
    otp: string,
    studentId: string
  ): Promise<SmsSendResult> {
    const recipient = normalizePhoneNumber(phoneNumber);
    const message = `FilCycle: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code. Ref: ${studentId}`;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/send/sms`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient, message }),
      });

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        error?: string;
        data?: { id?: string; channel?: string };
      } | null;

      if (!response.ok || data?.success === false) {
        const rawError = data?.error ?? data?.message;
        const errorMsg =
          typeof rawError === "string"
            ? rawError
            : rawError && typeof rawError === "object" && "message" in rawError
              ? String((rawError as { message: unknown }).message)
              : `SMS API PH request failed (${response.status})`;
        console.error("[SMS API PH] Send failed:", { recipient, error: errorMsg, data });
        return { success: false, error: errorMsg };
      }

      if (process.env.NODE_ENV !== "production") {
        const channel = data?.data?.channel ? ` via ${data.data.channel}` : "";
        console.log(`[SMS API PH] Sent${channel} → ${recipient}`);
      }

      return {
        success: true,
        messageId: data?.data?.id,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "SMS send failed";
      console.error("[SMS API PH] Request error:", msg);
      return { success: false, error: msg };
    }
  }
}
