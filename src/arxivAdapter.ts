// src/arxivAdapter.ts

import { XMLParser } from "fast-xml-parser";
import type { PaperRecord } from "./types.js";

// Parses attribute values (like term="cs.LG") in addition to plain text content — arXiv's category tags rely on this.
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/** True if a string is non-empty after trimming whitespace. */
function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

/** True if a string parses as a real, valid date. */
function isValidTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

/** Converts arXiv's raw XML response into an array of PaperRecords. */
export function parseArxivResponse(rawXmlText: string): PaperRecord[] {
  const parsedFeed = xmlParser.parse(rawXmlText);

  if (!parsedFeed.feed) {
    throw new Error("arXiv response missing expected <feed> element — response shape may have changed.");
  }

  if (!parsedFeed.feed.entry) {
    return [];
  }

  const entries = Array.isArray(parsedFeed.feed.entry)
    ? parsedFeed.feed.entry
    : [parsedFeed.feed.entry];

  return entries.map((entry: any): PaperRecord => {
    if (!entry.id || !isNonEmptyText(entry.title ?? "")) {
      throw new Error(`arXiv entry missing a real id or title: ${JSON.stringify(entry)}`);
    }

    const timestamp = isValidTimestamp(entry.published) ? entry.published : "";

    const categoryList = Array.isArray(entry.category) ? entry.category : [entry.category];
    const categoryNames = categoryList
      .filter((cat: any) => cat && cat["@_term"])
      .map((cat: any) => cat["@_term"]);

    return {
      id: entry.id,
      title: entry.title,
      abstractOrSnippet: entry.summary ?? "",
      url: entry.id,
      source: "arxiv",
      timestamp,
      rawSignalData: { categories: categoryNames },
    };
  });
}
