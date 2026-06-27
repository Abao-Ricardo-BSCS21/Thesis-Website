import type { ISmsProvider } from "./sms-provider.interface";
import { MockSmsService } from "./mock-sms.service";
import { SemaphoreSmsService } from "./semaphore-sms.service";
import { UniSmsService } from "./unisms-sms.service";
import { TextBeeSmsService } from "./textbee-sms.service";
import { SmsApiPhService } from "./smsapiph-sms.service";

export type SmsProviderType = "mock" | "smsapiph" | "semaphore" | "unisms" | "textbee";

let smsProviderInstance: ISmsProvider | null = null;

function resolveProviderType(): SmsProviderType {
  const explicit = process.env.SMS_PROVIDER?.toLowerCase() as SmsProviderType | undefined;
  if (
    explicit &&
    ["mock", "smsapiph", "semaphore", "unisms", "textbee"].includes(explicit)
  ) {
    return explicit;
  }

  const apiKey = process.env.SMS_API_KEY || process.env.SEMAPHORE_API_KEY;
  if (!apiKey?.trim()) return "mock";

  // sk- keys from SMS API PH (smsapiph.onrender.com)
  if (apiKey.startsWith("sk-") || apiKey.startsWith("sk_")) return "smsapiph";

  return "smsapiph";
}

/** Factory: picks provider from SMS_PROVIDER env or auto-detects from key format */
export function getSmsProvider(): ISmsProvider {
  if (smsProviderInstance) return smsProviderInstance;

  const provider = resolveProviderType();
  const apiKey = (process.env.SMS_API_KEY || process.env.SEMAPHORE_API_KEY)?.trim();

  switch (provider) {
    case "smsapiph":
      if (!apiKey) {
        smsProviderInstance = new MockSmsService();
      } else {
        smsProviderInstance = new SmsApiPhService(apiKey);
      }
      break;
    case "unisms":
      if (!apiKey) {
        smsProviderInstance = new MockSmsService();
      } else {
        smsProviderInstance = new UniSmsService(apiKey);
      }
      break;
    case "textbee": {
      const deviceId = process.env.TEXTBEE_DEVICE_ID?.trim();
      if (!apiKey || !deviceId) {
        console.warn("[SMS] TextBee requires SMS_API_KEY and TEXTBEE_DEVICE_ID — using MockSMS");
        smsProviderInstance = new MockSmsService();
      } else {
        smsProviderInstance = new TextBeeSmsService(apiKey, deviceId);
      }
      break;
    }
    case "semaphore":
      if (!apiKey) {
        smsProviderInstance = new MockSmsService();
      } else {
        const senderName = process.env.SEMAPHORE_SENDER_NAME?.trim();
        smsProviderInstance = new SemaphoreSmsService(apiKey, senderName || undefined);
      }
      break;
    case "mock":
    default:
      smsProviderInstance = new MockSmsService();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[SMS] Using provider: ${smsProviderInstance.name}`);
  }

  return smsProviderInstance;
}

export {
  MockSmsService,
  SmsApiPhService,
  SemaphoreSmsService,
  UniSmsService,
  TextBeeSmsService,
};
export type { ISmsProvider };
