// src/signalScorer.ts
// Stage 4. Attaches a numeric attention score to each paper. Pure code. No LLM call.
// Does not remove anything. Stage 5 does the actual cutting.

import { readFileSync } from "node:fs";
import type { PaperRecord } from "./types.js";

/** Loads the key topics of interest from topics.json. */
function loadTopics(): string[] {
  const fileContents = readFileSync("./src/topics.json", "utf-8");
  const parsed = JSON.parse(fileContents);
  return parsed.topics ?? [];
}


/** Scores recency: newer papers score higher, decaying over roughly a week. */
function scoreRecency(paper: PaperRecord): number {
  if (!paper.timestamp) {
    return 0;
  }

  const publishedTime = new Date(paper.timestamp).getTime();
  if (Number.isNaN(publishedTime)) {
    return 0;
  }

  const hoursOld = (Date.now() - publishedTime) / (1000 * 60 * 60);
  const maxUsefulAgeHours = 168; // one week

  if (hoursOld < 0 || hoursOld > maxUsefulAgeHours) {
    return 0;
  }

  // MARKER: linear decay from 20 (brand new) to 0 (one week old). Arbitrary curve, easy to retune later.
  return 20 * (1 - hoursOld / maxUsefulAgeHours);
}

/** Loads known influential labs and researchers from knownEntities.json. */
function loadKnownEntities(): string[] {
  const fileContents = readFileSync("./src/knownEntities.json", "utf-8");
  const parsed = JSON.parse(fileContents);
  return [...(parsed.labs ?? []), ...(parsed.researchers ?? [])];
}

const topics = loadTopics();
const knownEntities = loadKnownEntities();

/** Counts how many topics appear in the title, weighted higher than an abstract-only match. */
function scoreTopicMatch(paper: PaperRecord): number {
  const titleLower = paper.title.toLowerCase();
  const abstractLower = paper.abstractOrSnippet.toLowerCase();

  let score = 0;

  for (const topic of topics) {
    const topicLower = topic.toLowerCase();
    if (titleLower.includes(topicLower)) {
      score += 3;
    } else if (abstractLower.includes(topicLower)) {
      score += 1;
    }
  }

  return score;
}

/** True if the paper's title or abstract mentions a known lab or researcher. */
function mentionsKnownEntity(paper: PaperRecord): boolean {
  const searchText = `${paper.title} ${paper.abstractOrSnippet}`.toLowerCase();
  return knownEntities.some((entity) => searchText.includes(entity.toLowerCase()));
}

/** Computes the source-specific portion of the score, based on real engagement signals only. */
function scoreSourceSignal(paper: PaperRecord): number {
  const signal = paper.rawSignalData;

  switch (paper.source) {
    case "hackernews": {
      const points = typeof signal.points === "number" ? signal.points : 0;
      // MARKER: numComments is intentionally excluded. High comment count often means controversy, not quality.
      return points;
    }

    case "huggingFace": {
      const upvotes = typeof signal.upvotes === "number" ? signal.upvotes : 0;
      const githubStars = typeof signal.githubStars === "number" ? signal.githubStars : 0;
      // MARKER: stars weighted higher than upvotes. A star means someone used the code, not just clicked a button.
      return upvotes + githubStars * 2;
    }

    case "semanticScholar": {
      // MARKER: Semantic Scholar is not wired into the pipeline yet. Placeholder only.
      return 0;
    }

    case "arxiv": {
  // MARKER: arXiv has no engagement signal. Score comes from real recency data instead of a guessed flat number.
      return scoreRecency(paper);
    }

    default:
      return 0;
  }
}

/** Computes the full attention score for one paper: source signal, topic match strength, and known entity bonus. */
function scorePaper(paper: PaperRecord): number {
  let totalScore = scoreSourceSignal(paper);
  totalScore += scoreTopicMatch(paper);

  if (mentionsKnownEntity(paper)) {
    totalScore += 10;
  }

  return totalScore;
}

/** Sorts papers by attention score, highest first. Does not remove anything. */
export function rankBySignal(papers: PaperRecord[]): PaperRecord[] {
  return [...papers].sort((paperA, paperB) => scorePaper(paperB) - scorePaper(paperA));
}
