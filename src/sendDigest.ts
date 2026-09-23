// src/sendDigest.ts
// The real daily pipeline. Fetches, filters, scores, shortlists, judges, reports, delivers, archives.

import { fetchArxivPapers } from "./arxivCollector.js";
import { parseArxivResponse } from "./arxivAdapter.js";
import { fetchHnStories } from "./hnCollector.js";
import { parseHnResponse } from "./hnAdapter.js";
import { fetchHuggingFacePapers } from "./huggingFaceCollector.js";
import { parseHuggingFaceResponse } from "./huggingFaceAdapter.js";
import { filterByTopics } from "./hardFilter.js";
import { rankBySignal } from "./signalScore.js";
import { takeShortlistPerSource } from "./shortlist.js";
import { scoreOnePaper } from "./deepReadRanker.js";
import { buildShortlistSummary, writeFiveW } from "./reportBuilder.js";
import { filterOutSeen } from "./seenFilter.js";
import { archiveRun } from "./runLog.js";
import { Resend } from "resend";
import type { ScoredPaper } from "./types.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const RECIPIENT_EMAIL = process.env.DIGEST_RECIPIENT ?? "";

/** Sends the full daily digest as one email. */
async function sendDigestEmail(shortlistText: string, topThreeWriteups: string[]): Promise<void> {
  const body = [
    "Hello fellow,",
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
    to: RECIPIENT_EMAIL,
    subject: "Ciai daily digest",
    text: body,
  });

  if (result.error) {
    throw new Error(`Email failed to send: ${JSON.stringify(result.error)}`);
  }
}

/** Runs the full pipeline once: collect, filter, score, judge, report, deliver, archive. */
async function runDailyDigest(): Promise<void> {
  if (!RECIPIENT_EMAIL) {
    throw new Error("DIGEST_RECIPIENT is not set in .env");
  }

  const arxivRaw = await fetchArxivPapers("cs.LG");
  const arxivPapers = parseArxivResponse(arxivRaw);

  const hnRaw = await fetchHnStories();
  const hnPapers = parseHnResponse(hnRaw);

  const hfRaw = await fetchHuggingFacePapers();
  const hfPapers = parseHuggingFaceResponse(hfRaw);

  const allPapers = [...arxivPapers, ...hnPapers, ...hfPapers];
  const topicFiltered = filterByTopics(allPapers);
  const unseenFiltered = filterOutSeen(topicFiltered);
  const ranked = rankBySignal(unseenFiltered);
  const shortlist = takeShortlistPerSource(ranked, 5);

  const scoredPapers: ScoredPaper[] = [];
  for (const paper of shortlist) {
    scoredPapers.push(await scoreOnePaper(paper));
  }

  const topThree = [...scoredPapers].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);

  const shortlistText = buildShortlistSummary(shortlist);
  const writeups: string[] = [];
  for (const scored of topThree) {
    writeups.push(await writeFiveW(scored));
  }

  await sendDigestEmail(shortlistText, writeups);

  archiveRun(scoredPapers, topThree);

  console.log(`Digest sent. ${scoredPapers.length} scored, top 3 chosen and marked seen.`);
}

runDailyDigest();