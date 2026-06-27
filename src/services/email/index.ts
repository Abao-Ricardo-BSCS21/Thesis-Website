import type { IEmailProvider } from "./email-provider.interface";
import { MockEmailService } from "./mock-email.service";
import { SmtpEmailService } from "./smtp-email.service";

type EmailProviderType = "smtp" | "mock";

let emailProviderInstance: IEmailProvider | null = null;

function resolveProviderType(): EmailProviderType {
  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase() as EmailProviderType | undefined;
  if (explicit === "mock") return "mock";
  if (explicit === "smtp") return "smtp";

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (host && user && pass) return "smtp";

  return "mock";
}

export function getEmailProvider(): IEmailProvider {
  if (emailProviderInstance) return emailProviderInstance;

  const provider = resolveProviderType();

  switch (provider) {
    case "smtp": {
      const host = process.env.SMTP_HOST?.trim();
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const user = process.env.SMTP_USER?.trim();
      const pass = process.env.SMTP_PASS?.trim();
      const from =
        process.env.SMTP_FROM?.trim() ||
        process.env.SMTP_USER?.trim() ||
        "FilCycle <noreply@filamer.edu>";
      const secure = process.env.SMTP_SECURE === "true" || port === 465;

      if (!host || !user || !pass) {
        emailProviderInstance = {
          name: "SMTP (not configured)",
          async sendOtp() {
            return {
              success: false,
              error:
                "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env — run: node scripts/check-email.mjs",
            };
          },
        };
      } else {
        emailProviderInstance = new SmtpEmailService(host, port, user, pass, from, secure);
      }
      break;
    }
    default:
      emailProviderInstance = new MockEmailService();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Email] Using provider: ${emailProviderInstance.name}`);
  }

  return emailProviderInstance;
}
