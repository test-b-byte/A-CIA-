// src/types.ts

/** The one shape every source adapter must produce. Stage 3 onward only ever sees this — never a source's raw format. */
export interface PaperRecord {
  id: string;              // Unique per source (a URL for arXiv, a numeric ID for HN) — never reused across sources.
  title: string;
  abstractOrSnippet: string; // Empty string allowed — not every source has one (e.g. a bare HN link post).
  url: string;              // The human-readable page, not a PDF or API link.
  source: "arxiv" | "hackernews" | "huggingFace" | "semanticScholar"; // Set by the adapter, not read from the raw data.
  timestamp: string;        // ISO 8601 format (e.g. "2026-09-17T17:41:51Z") — convert non-ISO source timestamps here, not downstream.
  rawSignalData: Record<string, unknown>; // Stage 4 reads this. Shape varies by source — HN's has "score", arXiv's has "categories".
}

export interface ScoredPaper {
  paper: PaperRecord;
  novelty: number;
  rigor: number;
  robustness: number;
  significance: number;
  totalScore: number;
  justification: string;
}
