export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  /** Send an OTP message to the given phone number */
  sendOtp(phoneNumber: string, otp: string, studentId: string): Promise<SmsSendResult>;
  /** Provider name for logging */
  readonly name: string;
}
