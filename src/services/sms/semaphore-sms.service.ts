import type { ISmsProvider, SmsSendResult } from "./sms-provider.interface";
import { formatPhoneForSemaphore } from "@/lib/utils/phone";

/**
 * Semaphore SMS integration for production.
 * @see https://semaphore.co/docs
 */
export class SemaphoreSmsService implements ISmsProvider {
  readonly name = "Semaphore";

  private apiKey: string;
  private senderName?: string;

  constructor(apiKey: string, senderName?: string) {
    this.apiKey = apiKey;
    this.senderName = senderName?.trim() || undefined;
  }

  async sendOtp(
    phoneNumber: string,
    otp: string,
    studentId: string
  ): Promise<SmsSendResult> {
    const number = formatPhoneForSemaphore(phoneNumber);
    const message = `FilCycle: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code. Ref: ${studentId}`;

    try {
      const params: Record<string, string> = {
        apikey: this.apiKey,
        number,
        message,
      };

      if (this.senderName) {
        params.sendername = this.senderName;
      }

      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
      });

      const data: unknown = await response.json();

      // Semaphore returns validation errors as objects, e.g. { apikey: ["..."] }
      if (!Array.isArray(data)) {
        const record = data as Record<string, string[] | string>;
        const errorMsg =
          (typeof record.message === "string" ? record.message : null) ||
          Object.values(record)
            .flat()
            .filter(Boolean)
            .join(", ") ||
          "Failed to send SMS via Semaphore";

        console.error("[Semaphore SMS] Send failed:", { number, error: errorMsg, data });

        return { success: false, error: errorMsg };
      }

      const first = data[0] as { message_id?: number; status?: string; recipient?: string };
      if (!first?.message_id) {
        console.error("[Semaphore SMS] Unexpected response:", data);
        return { success: false, error: "Unexpected response from Semaphore" };
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[Semaphore SMS] Queued → ${first.recipient ?? number} (status: ${first.status ?? "unknown"})`
        );
      }

      return { success: true, messageId: String(first.message_id) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "SMS send failed";
      console.error("[Semaphore SMS] Request error:", msg);
      return { success: false, error: msg };
    }
  }
}
