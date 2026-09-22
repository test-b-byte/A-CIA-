// src/emailTest.ts
// Throwaway test. Confirms the Resend API key and package work together. Not part of the real pipeline.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const result = await resend.emails.send({
  from: "onboarding@resend.dev",
  to: "sabastianmandell25@gmail.com",
  subject: "Ciai test email",
  text: "If you're reading this, the Resend connection works.",
});

console.log(result);