import type { ISmsProvider, SmsSendResult } from "./sms-provider.interface";

/**
 * Mock SMS provider for local development and thesis demos.
 * Prints OTP to server console — never use in production.
 */
export class MockSmsService implements ISmsProvider {
  readonly name = "MockSMS";

  async sendOtp(
    phoneNumber: string,
    otp: string,
    studentId: string
  ): Promise<SmsSendResult> {
    console.log("\n--------------------------------");
    console.log(`OTP for Student ${studentId}`);
    console.log(phoneNumber);
    console.log(otp);
    console.log("--------------------------------\n");

    return { success: true, messageId: `mock-${Date.now()}` };
  }
}
