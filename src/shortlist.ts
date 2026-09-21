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

import { fetchArxivPapers } from "./arxivCollector.js";
import { parseArxivResponse } from "./arxivAdapter.js";
import { fetchHnStories } from "./hnCollector.js";
import { parseHnResponse } from "./hnAdapter.js";
import { fetchHuggingFacePapers } from "./huggingFaceCollector.js";
import { parseHuggingFaceResponse } from "./huggingFaceAdapter.js";
import { filterByTopics } from "./hardFilter.js";
import { rankBySignal } from "./signalScore.js";

const arxivRaw = await fetchArxivPapers("cs.LG");
const arxivPapers = parseArxivResponse(arxivRaw);

const hnRaw = await fetchHnStories();
const hnPapers = parseHnResponse(hnRaw);

const hfRaw = await fetchHuggingFacePapers();
const hfPapers = parseHuggingFaceResponse(hfRaw);

const allPapers = [...arxivPapers, ...hnPapers, ...hfPapers];
const filtered = filterByTopics(allPapers);
const ranked = rankBySignal(filtered);
const shortlisted = takeShortlistPerSource(ranked, 5);

console.log(`Ranked pool: ${ranked.length}. Shortlist: ${shortlisted.length}`);
console.log(shortlisted.map((paper) => `[${paper.source}] ${paper.title}`));