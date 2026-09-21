// src/apiTest.ts
// Throwaway test. Confirms the Anthropic API key and SDK work together. Not part of the real pipeline.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 100,
  messages: [{ role: "user", content: "Say hello in exactly five words." }],
});

console.log(response.content);