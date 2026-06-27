import type { ISmsProvider, SmsSendResult } from "./sms-provider.interface";
import { normalizePhoneNumber } from "@/lib/utils/phone";

/**
 * TextBee — Android phone as SMS gateway (textbee.dev)
 * Requires API key + registered device ID
 * @see https://textbee.dev/docs
 */
export class TextBeeSmsService implements ISmsProvider {
  readonly name = "TextBee";

  constructor(
    private apiKey: string,
    private deviceId: string
  ) {}

  async sendOtp(
    phoneNumber: string,
    otp: string,
    studentId: string
  ): Promise<SmsSendResult> {
    const recipient = normalizePhoneNumber(phoneNumber);
    const message = `FilCycle: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code. Ref: ${studentId}`;

    try {
      const response = await fetch(
        `https://api.textbee.dev/api/v1/gateway/devices/${this.deviceId}/send-sms`,
        {
          method: "POST",
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipients: [recipient],
            message,
          }),
        }
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          (data as { error?: string; message?: string })?.error ||
          (data as { message?: string })?.message ||
          `TextBee request failed (${response.status})`;
        console.error("[TextBee] Send failed:", { recipient, error: errorMsg, data });
        return { success: false, error: errorMsg };
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[TextBee] Queued → ${recipient}`);
      }

      return { success: true, messageId: (data as { id?: string })?.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "SMS send failed";
      console.error("[TextBee] Request error:", msg);
      return { success: false, error: msg };
    }
  }
}
