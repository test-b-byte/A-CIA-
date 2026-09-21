// src/dailyLog.ts
// Appends a simple, human-readable log of everything that passes the topic filter.
// This is for glancing through by eye. It is not used by any filtering logic.

import { appendFileSync } from "node:fs";
import type { PaperRecord } from "./types.js";

const logPath = "./src/candidateLog.txt";

/** Appends today's date and a simple title/source list of everything that passed the topic filter. */
export function logCandidates(papers: PaperRecord[]): void {
  const today = new Date().toISOString().split("T")[0];

  const lines = papers.map((paper) => `  [${paper.source}] ${paper.title}`);
  const entry = `\n${today} (${papers.length} candidates)\n${lines.join("\n")}\n`;

  appendFileSync(logPath, entry, "utf-8");
}