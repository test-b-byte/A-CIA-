// src/reportBuilder.ts
// Stage 8. Builds the two deliverable outputs: the lightweight shortlist, and the 5W summaries for the top 3.

import type { PaperRecord, ScoredPaper } from "./types.js";

import Anthropic from "@anthropic-ai/sdk";

/** Builds a simple, scannable list of title + link for the full shortlist. */
export function buildShortlistSummary(shortlist: PaperRecord[]): string {
  return shortlist
    .map((paper) => `- [${paper.source}] ${paper.title}\n  ${paper.url}`)
    .join("\n\n");
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const fiveWPrompt = `You are writing a short research digest entry in Who/What/When/Where/Why/How format, based on a paper's title and abstract.

Rules:
- Who: authors or institution, only if mentioned in the text. Leave empty ("") if not identifiable.
- What: the core goal, action, or discovery.
- When: the publish date, if provided.
- Where: a research location or location mentioned in the text, if any. Leave empty ("") if none.
- Why: the problem or motivation being addressed.
- How: the contribution and method used.

Never invent a detail that isn't in the text. An empty string is correct and expected for Who or Where when the source material does not name one.

Respond ONLY with valid JSON in this exact shape, nothing else, no commentary, no code fence:
{"who": "<text or empty>", "what": "<text>", "when": "<text>", "where": "<text or empty>", "why": "<text>", "how": "<text>"}`;

/** Extracts a JSON object from Claude's response, ignoring any code fences, backticks, or prose around it. */
function extractJson(text: string): string {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return text;
  }

  return text.slice(firstBrace, lastBrace + 1);
}

/** Writes a 5W-style summary for one paper. Throws if Claude's response is not valid, parseable JSON. */
export async function writeFiveW(scored: ScoredPaper): Promise<string> {
  const paper = scored.paper;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system: fiveWPrompt,
    messages: [
      {
        role: "user",
        content: `Title: ${paper.title}\n\nPublished: ${paper.timestamp}\n\nAbstract: ${paper.abstractOrSnippet}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text response from Claude for 5W summary of: ${paper.title}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(textBlock.text.trim()));
  } catch (parseError) {
    throw new Error(`5W response was not valid JSON for "${paper.title}": ${textBlock.text}`);
  }

  const { who, what, when, where, why, how } = parsed;

  const sections = [
    who ? { label: "Who", text: who } : null,
    { label: "What", text: what ?? "" },
    { label: "When", text: when ?? "" },
    where ? { label: "Where", text: where } : null,
    { label: "Why", text: why ?? "" },
    { label: "How", text: how ?? "" },
  ].filter((section) => section !== null);

  const body = sections
    .map((section) => `${section.label}:\n    ${section.text}`)
    .join("\n");

  return `${paper.title}\n\n${body}`;
}

import { fetchArxivPapers } from "./arxivCollector.js";
import { parseArxivResponse } from "./arxivAdapter.js";
import { fetchHnStories } from "./hnCollector.js";
import { parseHnResponse } from "./hnAdapter.js";
import { fetchHuggingFacePapers } from "./huggingFaceCollector.js";
import { parseHuggingFaceResponse } from "./huggingFaceAdapter.js";
import { filterByTopics } from "./hardFilter.js";
import { rankBySignal } from "./signalScore.js";
import { takeShortlistPerSource } from "./shortlist.js";

const arxivRaw = await fetchArxivPapers("cs.LG");
const arxivPapers = parseArxivResponse(arxivRaw);

const hnRaw = await fetchHnStories();
const hnPapers = parseHnResponse(hnRaw);

const hfRaw = await fetchHuggingFacePapers();
const hfPapers = parseHuggingFaceResponse(hfRaw);

const allPapers = [...arxivPapers, ...hnPapers, ...hfPapers];
const filtered = filterByTopics(allPapers);
const ranked = rankBySignal(filtered);
const shortlist = takeShortlistPerSource(ranked, 5);

console.log("=== SHORTLIST SUMMARY ===\n");
console.log(buildShortlistSummary(shortlist));

console.log("\n\n=== TOP 3, 5W FORMAT ===\n");
for (const paper of shortlist.slice(0, 3)) {
  const fakeScored = { paper } as any;
  const summary = await writeFiveW(fakeScored);
  console.log(summary);
  console.log("\n---\n");
}
