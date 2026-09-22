// src/sendDigest.ts
// Stage 9. Sends the daily digest email: shortlist summary + 5W write-ups for the top 3.

import { Resend } from "resend";
import type { PaperRecord, ScoredPaper } from "./types.js";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Sends the full daily digest as one email. */
export async function sendDigestEmail(
  shortlistText: string,
  topThreeWriteups: string[],
  recipientEmails: string | string[]
): Promise<void> {
  const body = [
    "Hello my friend,",
    "",
    "Here's today's shortlist, plus a closer look at the top 3.",
    "",
    "--- SHORTLIST ---",
    "",
    shortlistText,
    "",
    "--- TOP 3, IN DEPTH ---",
    "",
    topThreeWriteups.join("\n\n---\n\n"),
  ].join("\n");

  const result = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: recipientEmails,
    subject: "Computer Innovation and Information daily digest",
    text: body,
  });

  if (result.error) {
    throw new Error(`Email failed to send: ${JSON.stringify(result.error)}`);
  }

  console.log("Digest email sent successfully.");
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
import { buildShortlistSummary, writeFiveW } from "./reportBuilder.js";

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

const shortlistText = buildShortlistSummary(shortlist);

const topThree = shortlist.slice(0, 3);
const writeups: string[] = [];
for (const paper of topThree) {
  const fakeScored = { paper } as any;
  writeups.push(await writeFiveW(fakeScored));
}

await sendDigestEmail(shortlistText, writeups, "sabastianmandell25@gmail.com");
