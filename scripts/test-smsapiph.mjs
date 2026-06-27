import { readFileSync } from "fs";

const apiKey = readFileSync(".env", "utf8").match(/SMS_API_KEY="([^"]+)"/)?.[1];
const phone = process.argv[2] || "+639171234567";

const res = await fetch("https://smsapiph.onrender.com/api/v1/send/sms", {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    recipient: phone,
    message: "FilCycle test: Your verification code is 123456",
  }),
});

console.log("status:", res.status);
console.log("body:", await res.text());
