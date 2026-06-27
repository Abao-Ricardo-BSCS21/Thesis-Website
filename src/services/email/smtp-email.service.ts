import nodemailer from "nodemailer";
import type { EmailSendResult, IEmailProvider } from "./email-provider.interface";

export class SmtpEmailService implements IEmailProvider {
  readonly name = "SMTP";
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(
    host: string,
    port: number,
    user: string,
    pass: string,
    from: string,
    secure: boolean
  ) {
    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendOtp(
    to: string,
    subject: string,
    body: string,
    _studentId: string
  ): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Email send failed";
      return { success: false, error: msg };
    }
  }
}
