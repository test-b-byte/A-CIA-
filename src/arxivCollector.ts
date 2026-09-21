/** Sends one request to a URL, times out after 10s, throws if the response wasn't OK. */
async function requestXml(requestUrl: string): Promise<string> {
  // AbortSignal.timeout cancels the request automatically if arXiv hasn't responded in time.
  const response = await fetch(requestUrl, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/** Fetches recent papers from arXiv for one category, e.g. "cs.LG". Tries https first, falls back to http if that fails. */
export async function fetchArxivPapers(arxivCategory: string): Promise<string> {
  const queryParams = `search_query=cat:${arxivCategory}&sortBy=submittedDate&sortOrder=descending&max_results=20`;
  const primaryUrl = `https://export.arxiv.org/api/query?${queryParams}`;
  const backupUrl = `http://export.arxiv.org/api/query?${queryParams}`;

  try {
    return await requestXml(primaryUrl);
  } catch (primaryError) {
    // Primary link failed — try the backup before giving up entirely.
    console.warn("Primary arXiv URL failed, trying backup:", primaryError);
    return await requestXml(backupUrl);
  }
}

import { parseArxivResponse } from "./arxivAdapter.js";

// Temporary: fetch, then adapt, then print the finished PaperRecords.
const rawXml = await fetchArxivPapers("cs.LG");
const papers = parseArxivResponse(rawXml);
console.log(papers);