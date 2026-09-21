// src/hardFilter.ts
// Stage 3. Filters PaperRecord[] down to only papers matching a topic in topics.json.
// Pure code. No LLM call. Reads topics.json fresh each time it runs.

import { readFileSync } from "node:fs";
import type { PaperRecord } from "./types.js";

/** Reads and returns the list of key topics of interest from topics.json. */
function loadTopics(): string[] {
  let fileContents: string;

  try {
    fileContents = readFileSync("./src/topics.json", "utf-8");
  } catch (readError) {
    throw new Error(`Could not read topics.json: ${readError}`);
  }

  let parsedFile: any;

  try {
    parsedFile = JSON.parse(fileContents);
  } catch (parseError) {
    throw new Error(`topics.json is not valid JSON: ${parseError}`);
  }

  if (!Array.isArray(parsedFile.topics) || parsedFile.topics.length === 0) {
    throw new Error("topics.json has no usable 'topics' array. Check the file.");
  }

  return parsedFile.topics;
}

/** True if the paper's title or abstract contains any topic, case-insensitive. */
function matchesAnyTopic(paper: PaperRecord, topics: string[]): boolean {
  const searchText = `${paper.title} ${paper.abstractOrSnippet}`.toLowerCase();

  return topics.some((topic) => searchText.includes(topic.toLowerCase()));
}

/** Keeps only papers matching at least one key topic of interest. */
export function filterByTopics(papers: PaperRecord[]): PaperRecord[] {
  const topics = loadTopics();

  return papers.filter((paper) => matchesAnyTopic(paper, topics));
}

import { fetchArxivPapers } from "./arxivCollector.js";
import { parseArxivResponse } from "./arxivAdapter.js";

const rawXml = await fetchArxivPapers("cs.LG");
const allPapers = parseArxivResponse(rawXml);
const filteredPapers = filterByTopics(allPapers);

console.log(`Fetched ${allPapers.length} papers. ${filteredPapers.length} matched a topic.`);
console.log(filteredPapers.map((paper) => paper.title));