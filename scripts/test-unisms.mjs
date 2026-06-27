import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const apikey = env.match(/SEMAPHORE_API_KEY="([^"]+)"/)?.[1];
const phone = process.argv[2] || "+639171234567";

async function testUniSMS() {
  const auth = Buffer.from(`${apikey}:`).toString("base64");
  const res = await fetch("https://unismsapi.com/api/sms", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: phone,
      content: "FilCycle test: Your verification code is 123456",
    }),
  });
  const text = await res.text();
  console.log("UniSMS status:", res.status);
  console.log("UniSMS body:", text);
}

await testUniSMS();
