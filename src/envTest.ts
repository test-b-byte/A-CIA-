// envTest.ts
// Purpose: confirm that the API key in .env is actually being read into
// the program before we try to call any real API with it.

import * as dotenv from "dotenv";
// dotenv is a package whose only job is: read the .env file and copy
// its key=value lines into process.env, which is Node's built-in
// object holding all environment variables for this running program.

dotenv.config();
// This line does the actual reading. Nothing exists in process.env
// from .env until you call this — dotenv does not do it automatically
// just by being imported.

const anthropicApiKey: string | undefined = process.env.ANTHROPIC_API_KEY;
// process.env.ANTHROPIC_API_KEY is undefined if either:
//   (a) .env doesn't have a line named ANTHROPIC_API_KEY, or
//   (b) dotenv.config() never ran, or ran but couldn't find the .env file.
// The type is "string | undefined" (not just "string") because
// TypeScript knows env vars might not exist — it forces you to
// handle the missing case instead of assuming the key is always there.

if (anthropicApiKey === undefined) {
  console.log("No key found. Check that .env exists and the variable name matches.");
} else {
  // We print only the first 8 characters, never the full key.
  // Even in a local test script, printing the whole secret to the
  // terminal is a bad habit — terminal scrollback, screenshots, and
  // logs can leak it.
  const firstEightChars: string = anthropicApiKey.slice(0, 8);
  console.log(`Key found. Starts with: ${firstEightChars}...`);
}