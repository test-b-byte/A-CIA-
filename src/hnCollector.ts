// src/hnCollector.ts
// Stage 1 collector for Hacker News. Fetches raw JSON only. No parsing here.

/** Sends one request to a URL. Waits at most 10 seconds. Throws if the response is not OK. */
async function requestJson(requestUrl: string): Promise<string> {
    const response = await fetch(requestUrl, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`); 
    }

    const rawText = await response.text();


  // MARKER: an OK response with an empty body is still a failure worth flagging.
  // HN's API has not shown this in testing, but a proxy or CDN error page could return status 200 with junk content.
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("Request succeeded but returned an empty body.");
  }
  
  return rawText;
}

// MARKER: these two URLs are separate endpoints, not mirrors of the same one.
// primaryUrl is HN's algorithm-curated front page.
// backupUrl is plain newest submissions, sorted by time.
// If the front page ever changes shape or goes down, the backup still gives usable data, just less curated.
const primaryUrl = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50";
const backupUrl = "https://hn.algolia.com/api/v1/search_by_date?tags=story";

/** Fetches current Hacker News stories. Tries the front page first. Falls back to newest stories if that fails. */
/** Fetches current Hacker News stories. Tries the front page first. Falls back to newest stories if that fails. */
export async function fetchHnStories(): Promise<string> {
  try {
    return await requestJson(primaryUrl);
  } catch (primaryError) {
    console.warn("Primary HN endpoint failed. Trying backup.", primaryError);

    try {
      return await requestJson(backupUrl);
    } catch (backupError) {
      // MARKER: both endpoints failed. This is not a transient blip. Check whether HN changed its API.
      throw new Error(
        `Both HN endpoints failed. Primary and backup URLs may need updating. ` +
        `Primary error: ${primaryError}. Backup error: ${backupError}`
      );
    }
  }
}

import { parseHnResponse } from "./hnAdapter.js";

// Temporary: fetch, then adapt, then print the finished PaperRecords.
const rawJson = await fetchHnStories();
const papers = parseHnResponse(rawJson);
console.log(papers);