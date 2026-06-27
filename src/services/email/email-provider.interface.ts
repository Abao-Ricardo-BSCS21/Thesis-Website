export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  readonly name: string;
  sendOtp(
    to: string,
    subject: string,
    body: string,
    studentId: string
  ): Promise<EmailSendResult>;
}
