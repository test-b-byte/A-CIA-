// src/shortlist.ts
// Stage 5. Takes the top N papers per source, so no single source can dominate by raw score alone.

import type { PaperRecord } from "./types.js";

/** Groups papers by their source field. */
function groupBySource(papers: PaperRecord[]): Map<string, PaperRecord[]> {
  const groups = new Map<string, PaperRecord[]>();

  for (const paper of papers) {
    const existing = groups.get(paper.source) ?? [];
    existing.push(paper);
    groups.set(paper.source, existing);
  }

  return groups;
}


/** Takes the top N papers from each source, except HN, which passes through uncapped since it rarely contributes much. */
export function takeShortlistPerSource(rankedPapers: PaperRecord[], perSourceCount: number): PaperRecord[] {
  const groups = groupBySource(rankedPapers);
  const shortlist: PaperRecord[] = [];

  for (const [source, papers] of groups.entries()) {
    if (source === "hackernews") {
      shortlist.push(...papers);
    } else {
      shortlist.push(...papers.slice(0, perSourceCount));
    }
  }

  return shortlist;
}

