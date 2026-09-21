// src/semanticScholarCollector.ts
// Stage 1 collector for Semantic Scholar. Fetches raw JSON only. No parsing here.
// MARKER: this API requires a search query. It cannot browse recent papers without one.
// MARKER: rate limit is roughly 1 request per second without an API key. Keep calls infrequent.

/** Sends one request to a URL. Waits at most 10 seconds per attempt. Retries on 429 with increasing delay. */
async function requestJson(requestUrl: string): Promise<string> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(requestUrl, { signal: AbortSignal.timeout(10_000) });

    if (response.status === 429) {
      // MARKER: 429 means rate limited, not broken. Wait longer each retry, then give up after maxAttempts.
      if (attempt < maxAttempts) {
        const delayMs = attempt * 300000;
        console.warn(`Rate limited (429). Waiting ${delayMs}ms before retry ${attempt + 1}/${maxAttempts}.`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw new Error(`Rate limited after ${maxAttempts} attempts.`);
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("Request succeeded but returned an empty body.");
    }

    return rawText;
  }

  throw new Error("Unexpected: retry loop exited without returning or throwing.");
}

const fields = "title,abstract,url,publicationDate,citationCount,externalIds";

/** Fetches Semantic Scholar papers matching a search query. No fallback URL exists for this source. */
export async function fetchSemanticScholarPapers(searchQuery: string): Promise<string> {
  const requestUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&fields=${fields}&limit=20`;

  try {
    return await requestJson(requestUrl);
  } catch (requestError) {
    throw new Error(`Semantic Scholar request failed. Query: "${searchQuery}". Error: ${requestError}`);
  }
}
import { parseSemanticScholarResponse } from "./semanticScholarAdapter.js";

const rawJson = await fetchSemanticScholarPapers("reinforcement learning");
const papers = parseSemanticScholarResponse(rawJson);
console.log(papers);