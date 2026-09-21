// src/huggingFaceAdapter.ts
// Stage 2 adapter for Hugging Face daily papers. Converts raw JSON into PaperRecord[].
// MARKER: shape is unofficial and unconfirmed. This adapter defends heavily against surprises.

import type { PaperRecord } from "./types.js";

/** True if a string is non-empty after trimming whitespace. */
function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

/** Converts Hugging Face's raw JSON response into an array of PaperRecords. */
export function parseHuggingFaceResponse(rawJsonText: string): PaperRecord[] {
  let parsedResponse: any;

  try {
    parsedResponse = JSON.parse(rawJsonText);
  } catch (parseError) {
    throw new Error(`Hugging Face response was not valid JSON: ${parseError}`);
  }

  // MARKER: the unofficial endpoint may return a bare array, or an object with a "results" field.
  // Handle both shapes rather than assuming one.
  const items: any[] = Array.isArray(parsedResponse)
    ? parsedResponse
    : Array.isArray(parsedResponse.results)
      ? parsedResponse.results
      : [];

  if (items.length === 0) {
    return [];
  }

  return items
    .map((item: any) => {
      // MARKER: some responses nest paper details under item.paper, others may be flat. Handle both.
      const paper = item.paper ?? item;
      return { item, paper };
    })
    .filter(({ paper }) => paper && isNonEmptyText(paper.title ?? ""))
    .map(({ item, paper }): PaperRecord => {
      const arxivId = paper.id ?? paper.arxivId ?? "";

      return {
        id: String(arxivId || paper.title),
        title: paper.title,
        abstractOrSnippet: paper.summary ?? paper.abstract ?? "",
        url: arxivId ? `https://huggingface.co/papers/${arxivId}` : "",
        source: "huggingFace" as any,
        timestamp: item.publishedAt ?? paper.publishedAt ?? "",
        rawSignalData: {
          upvotes: paper.upvotes ?? item.upvotes ?? 0,
          githubStars: paper.githubStars ?? 0,
        },
      };
    });
}