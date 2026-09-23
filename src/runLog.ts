// src/runLog.ts
// Stage 10. Archives the full run and marks the top 3 as seen.

import { appendFileSync } from "node:fs";
import type { ScoredPaper } from "./types.js";
import { markAsSeen } from "./seenFilter.js";

/** Records the full run: every scored candidate, and which 3 were chosen. Marks those 3 as seen. */
export function archiveRun(allScored: ScoredPaper[], topThree: ScoredPaper[]): void {
  const today = new Date().toISOString();

  const runRecord = {
    timestamp: today,
    totalCandidatesScored: allScored.length,
    allScores: allScored.map((s) => ({
      title: s.paper.title,
      source: s.paper.source,
      totalScore: s.totalScore,
    })),
    chosenTop3: topThree.map((s) => ({
      title: s.paper.title,
      source: s.paper.source,
      totalScore: s.totalScore,
    })),
  };

  const logLine = JSON.stringify(runRecord) + "\n";
  appendFileSync("./src/runArchive.jsonl", logLine, "utf-8");

  for (const scored of topThree) {
    markAsSeen(scored.paper.id);
  }

  console.log(`Run archived. ${topThree.length} papers marked as seen.`);
}