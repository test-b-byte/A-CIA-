// src/hardFilter.ts
// Stage 3. Filters PaperRecord[] down to only papers matching a topic in topics.json.
// Pure code. No LLM call. Reads topics.json fresh each time it runs.

import { readFileSync } from "node:fs";
import type { PaperRecord } from "./types.js";


function loadTopicsFrom(path: string): string[] {
  let fileContents: string;

  try {
    fileContents = readFileSync(path, "utf-8");
  } catch (readError) {
    throw new Error(`Could not read ${path}: ${readError}`);
  }

  let parsedFile: any;

  try {
    parsedFile = JSON.parse(fileContents);
  } catch (parseError) {
    throw new Error(`${path} is not valid JSON: ${parseError}`);
  }

  if (!Array.isArray(parsedFile.topics) || parsedFile.topics.length === 0) {
    throw new Error(`${path} has no usable 'topics' array. Check the file.`);
  }

  return parsedFile.topics;
}

const coreTopics = loadTopicsFrom("./src/topics.json");
const hnContextTopics = loadTopicsFrom("./src/hnContextTopics.json");

/** True if the paper's title or abstract contains any topic from the given list, case-insensitive. */
function matchesAnyTopic(paper: PaperRecord, topics: string[]): boolean {
  const searchText = `${paper.title} ${paper.abstractOrSnippet}`.toLowerCase();
  return topics.some((topic) => searchText.includes(topic.toLowerCase()));
}

/** Keeps only papers matching at least one relevant topic. HN uses a separate, broader topic list than other sources. */
export function filterByTopics(papers: PaperRecord[]): PaperRecord[] {
  return papers.filter((paper) => {
    const relevantTopics = paper.source === "hackernews" ? hnContextTopics : coreTopics;
    return matchesAnyTopic(paper, relevantTopics);
  });
}
