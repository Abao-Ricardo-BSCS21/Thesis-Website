import type { EmailSendResult, IEmailProvider } from "./email-provider.interface";

/** Logs OTP to console in development when SMTP is not configured */
export class MockEmailService implements IEmailProvider {
  readonly name = "MockEmail";

  async sendOtp(
    to: string,
    subject: string,
    body: string,
    studentId: string
  ): Promise<EmailSendResult> {
    console.log("\n--------------------------------");
    console.log(`[MockEmail] OTP for ${studentId}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(body);
    console.log("--------------------------------\n");
    return { success: true, messageId: "mock-" + Date.now() };
  }
}
