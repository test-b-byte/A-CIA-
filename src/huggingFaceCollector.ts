// src/huggingFaceCollector.ts
// Stage 1 collector for Hugging Face daily papers. Unofficial endpoint. Fetches raw JSON only.

/** Sends one request to a URL. Waits at most 10 seconds. Throws if the response is not OK. */
async function requestJson(requestUrl: string): Promise<string> {
  const response = await fetch(requestUrl, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const rawText = await response.text();

  if (!rawText || rawText.trim().length === 0) {
    throw new Error("Request succeeded but returned an empty body.");
  }

  return rawText;
}

// MARKER: this endpoint is unofficial and undocumented by Hugging Face itself.
// It could change shape or disappear without notice. Watch this one first if the pipeline breaks.
const primaryUrl = "https://huggingface.co/api/daily_papers?limit=20";
const backupUrl = "https://huggingface.co/api/daily_papers";

/** Fetches Hugging Face's daily papers list. Falls back to the undated base endpoint if the primary fails. */
export async function fetchHuggingFacePapers(): Promise<string> {
  try {
    return await requestJson(primaryUrl);
  } catch (primaryError) {
    console.warn("Primary Hugging Face endpoint failed. Trying backup.", primaryError);

    try {
      return await requestJson(backupUrl);
    } catch (backupError) {
      throw new Error(
        `Both Hugging Face endpoints failed. This endpoint is unofficial and may have changed. ` +
        `Primary error: ${primaryError}. Backup error: ${backupError}`
      );
    }
  }
}

import { parseHuggingFaceResponse } from "./huggingFaceAdapter.js";

const rawJson = await fetchHuggingFacePapers();
const papers = parseHuggingFaceResponse(rawJson);
console.log(papers);