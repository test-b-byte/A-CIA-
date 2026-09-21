// src/seenFilter.ts
// Tracks which papers have already been selected, so they never get picked again.

import { readFileSync, writeFileSync } from "node:fs";
import type { PaperRecord } from "./types.js";

const seenPapersPath = "./src/seenPapers.json";

/** Reads the list of already-selected paper ids. */
function loadSeenIds(): string[] {
  const fileContents = readFileSync(seenPapersPath, "utf-8");
  const parsed = JSON.parse(fileContents);
  return Array.isArray(parsed.seenIds) ? parsed.seenIds : [];
}

/** Removes any paper whose id has already been selected on a previous day. */
export function filterOutSeen(papers: PaperRecord[]): PaperRecord[] {
  const seenIds = loadSeenIds();
  return papers.filter((paper) => !seenIds.includes(paper.id));
}

/** Records a paper's id as seen, so it will not be selected again. Call this only after a paper is actually chosen. */
export function markAsSeen(paperId: string): void {
  const seenIds = loadSeenIds();

  if (seenIds.includes(paperId)) {
    return;
  }

  seenIds.push(paperId);
  writeFileSync(seenPapersPath, JSON.stringify({ seenIds }, null, 2), "utf-8");
}
