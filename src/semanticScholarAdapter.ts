// src/semanticScholarAdapter.ts
// Stage 2 adapter for Semantic Scholar. Converts raw JSON into PaperRecord[].

import type { PaperRecord } from "./types.js";

/** True if a string is non-empty after trimming whitespace. */
function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0;
}

/** Converts Semantic Scholar's raw JSON response into an array of PaperRecords. */
export function parseSemanticScholarResponse(rawJsonText: string): PaperRecord[] {
  let parsedResponse: any;

  try {
    parsedResponse = JSON.parse(rawJsonText);
  } catch (parseError) {
    throw new Error(`Semantic Scholar response was not valid JSON: ${parseError}`);
  }

  if (!Array.isArray(parsedResponse.data)) {
    throw new Error("Semantic Scholar response missing expected 'data' array. Response shape may have changed.");
  }

  return parsedResponse.data
    .filter((paper: any) => paper && paper.paperId && isNonEmptyText(paper.title ?? ""))
    .map((paper: any): PaperRecord => {
      return {
        id: paper.paperId,
        title: paper.title,
        abstractOrSnippet: paper.abstract ?? "",
        url: paper.url ?? `https://www.semanticscholar.org/paper/${paper.paperId}`,
        source: "semanticScholar" as any,
        timestamp: paper.publicationDate ?? "",
        rawSignalData: {
          citationCount: paper.citationCount ?? 0,
        },
      };
    });
}