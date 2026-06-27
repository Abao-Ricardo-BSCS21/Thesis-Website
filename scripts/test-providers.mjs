import { readFileSync } from "fs";

const key = readFileSync(".env", "utf8").match(/SEMAPHORE_API_KEY="([^"]+)"/)?.[1];

async function test(name, url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  console.log(`\n=== ${name} ===`);
  console.log("status:", res.status);
  console.log("body:", text.slice(0, 500));
}

// SMS-OTPS
await test("SMS-OTPS credits", "https://api.smsotps.com/api/credits", {
  headers: { Accept: "application/json", "X-API-KEY": key },
});

// IPROG SMS credits
await test("IPROG credits", `https://www.iprogsms.com/api/v1/account/sms_credits?api_token=${key}`);

// PhilSMS - bearer
await test("PhilSMS", "https://app.philsms.com/api/v3/sms/send", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({
    recipient: "639171234567",
    sender_id: "PhilSMS",
    type: "plain",
    message: "FilCycle test",
  }),
});
