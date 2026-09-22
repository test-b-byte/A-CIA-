// apiTest.ts
// Purpose: confirm the key in .env actually works against Anthropic's
// real API — not just that it loads, but that Anthropic accepts it
// and returns a response. This is the last check before building the
// real pipeline on top of this key.

import * as dotenv from "dotenv";
dotenv.config();
// Same as envTest.ts: reads .env into process.env before we use it below.

const anthropicApiKey: string | undefined = process.env.ANTHROPIC_API_KEY;

if (anthropicApiKey === undefined) {
  // Fail loud and immediately if the key isn't there, instead of
  // letting the fetch call below fail later with a more confusing error.
  console.log("No key found. Run envTest.ts first to debug that.");
  process.exit(1);
  // process.exit(1) stops the program right here and reports "this
  // run failed" to whatever called it (your terminal, in this case).
  // The number 1 is just a convention meaning "exited with an error"
  // — 0 would mean "exited successfully."
}

async function testApiCall(): Promise<void> {
  // "async" means this function can pause and wait for something slow
  // (a network request) without freezing the rest of the program.
  // "Promise<void>" means: this function eventually finishes, and
  // when it does, it doesn't hand back any value — it just does its
  // work (the console.log calls) and ends.

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicApiKey as string,
      // "as string" here tells TypeScript "trust me, this is
      // definitely a string by this point" — safe to say because
      // we already checked for undefined above and exited if so.
      "anthropic-version": "2023-06-01",
      // Anthropic requires this header on every request so they know
      // which version of their API request/response format you're
      // using. Leaving it out will cause the request to be rejected.
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 20,
      messages: [
        { role: "user", content: "Reply with exactly one word: pong." }
      ],
    }),
  });

  if (!response.ok) {
    // response.ok is true only for successful HTTP status codes (200-299).
    // If it's false, something went wrong — bad key, bad request shape,
    // rate limit, etc. — and we want to see the actual error text.
    const errorText: string = await response.text();
    console.log(`Request failed. Status: ${response.status}`);
    console.log(`Error details: ${errorText}`);
    return;
  }

  const parsedResponse = await response.json();
  console.log("Request succeeded. Full response:");
  console.log(JSON.stringify(parsedResponse, null, 2));
  // JSON.stringify's third argument (2) tells it to pretty-print with
  // 2-space indentation, instead of one unreadable line of text.
}

testApiCall();