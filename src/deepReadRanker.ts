// src/deepReadRanker.ts
// Stage 6. Sends each shortlisted paper to Claude for rubric scoring.
// MARKER: currently scores on title + abstract only, since that is what PaperRecord holds.
// Full-text reading (methods, results sections) is a future upgrade, not built yet.

import Anthropic from "@anthropic-ai/sdk";
import type { PaperRecord, ScoredPaper } from "./types.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const rubricPrompt = `You are scoring a research paper candidate for a daily AI/ML research digest.
Score it on four dimensions:
- novelty (1-5): is the core idea genuinely new, or a minor variation on existing work?
- rigor (1-7): based on the abstract alone, does the method sound well-supported, or overstated? Weighted heavily, since method quality matters most.
- robustness (1-5): does the abstract mention multiple settings, baselines, or conditions tested, or just one result?
- significance (1-7): does this address a real, important, relevant problem? Weighted heavily, since relevance matters most.

If the content is a news headline, announcement, or discussion post rather than a research paper, score all four dimensions at their minimum (1) and say so briefly in the justification. Do not add commentary before or after the JSON.

Respond ONLY with valid JSON in this exact shape, nothing else, no commentary, no code fence:
{"novelty": <1-5>, "rigor": <1-7>, "robustness": <1-5>, "significance": <1-7>, "justification": "<one sentence>"}`;

/** Removes a markdown code fence around JSON, if present. Claude sometimes wraps JSON responses in ```json blocks. */
/** Extracts a JSON object from Claude's response, ignoring any code fences, backticks, or prose around it. */
function extractJson(text: string): string {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return text;
  }

  return text.slice(firstBrace, lastBrace + 1);
}


/** Sends one paper to Claude for rubric scoring. Throws if the response is not valid, parseable JSON. */
export async function scoreOnePaper(paper: PaperRecord): Promise<ScoredPaper> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: rubricPrompt,
    messages: [
      {
        role: "user",
        content: `Title: ${paper.title}\n\nAbstract: ${paper.abstractOrSnippet}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  // ...rest of the function stays exactly as it already is
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text response from Claude for paper: ${paper.title}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(textBlock.text.trim()));
  } catch (parseError) {
    throw new Error(`Claude's response was not valid JSON for "${paper.title}": ${textBlock.text}`);
  }

  const { novelty, rigor, robustness, significance, justification } = parsed;

  if (
    typeof novelty !== "number" ||
    typeof rigor !== "number" ||
    typeof robustness !== "number" ||
    typeof significance !== "number"
  ) {
    throw new Error(`Claude's response was missing expected score fields for "${paper.title}"`);
  }

  return {
    paper,
    novelty,
    rigor,
    robustness,
    significance,
    totalScore: novelty + rigor + robustness + significance,
    justification: justification ?? "",
  };
}
