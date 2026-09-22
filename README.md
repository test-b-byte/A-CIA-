![Agent Op Structure](Architecture_Updated.png)



# CIAI pipeline — stage reference (v0.8)

Four phases, ten numbered stages (7 retired, not renumbered). Data flows one direction, top to bottom, phase to phase. Nothing in a later stage triggers an earlier one to re-run — a failure halts the run and waits for manual review.

---

## Phase 1: Collection

### Stage 1 — Source collectors
Three independent functions: arXiv, Hacker News, Hugging Face daily papers. Papers with Code was dropped after confirming Meta shut it down in 2025; Hugging Face's daily papers feed replaced it as the third source. Each collector fetches raw data in its own native shape (arXiv returns XML, HN and Hugging Face return JSON), with a timeout and a primary/backup fallback. Hugging Face's endpoint is unofficial and undocumented, so its collector carries an explicit warning that the shape could change without notice. HN's collector was switched from the fixed 30-item front page to the larger recent-stories feed, since the front page was too small a pool.

### Stage 2 — Normalizer
Each source has its own adapter that converts raw data into one shared shape, `PaperRecord` (id, title, abstractOrSnippet, url, source, timestamp, rawSignalData). No inheritance — each adapter is a small, independent function that only has to conform to the same output type. Every adapter validates its input defensively (missing fields, empty results, malformed structure) before producing a record.

---

## Phase 2: Filtering

### Stage 3 — Hard filter
Pure code, no LLM call. Two separate topic lists, not one: `topics.json` (technical KTOI list — autonomy, robotics, reinforcement learning, defense, etc.) filters arXiv and Hugging Face; `hnContextTopics.json` (a broader trade, manufacturing, defense-policy, geopolitics list) filters HN specifically, since HN's front page rarely intersects with narrow technical terms. The filter checks a paper's source and picks the matching list automatically.

### Stage 4 — Signal scorer
Still no LLM call. Scores each paper using real signals specific to its source: Hugging Face uses upvotes plus GitHub stars (stars weighted double, since a star reflects real use, not just a click); HN uses points only (comment count deliberately excluded, since high comment count often means controversy, not quality); arXiv has no engagement signal at all, so it is scored by recency instead (decaying linearly over one week) rather than an arbitrary flat number. A separate bonus applies if a paper's title or abstract mentions a known lab or researcher, read from an editable `knownEntities.json`. Topic-match strength also contributes, weighted higher if a topic appears in the title rather than only the abstract.

### Stage 5 — Shortlist
Per-source, not a single combined cut. arXiv and Hugging Face are each capped at their top 5, since Hugging Face's raw score ceiling is structurally higher and would otherwise crowd out every other source. HN is passed through uncapped, since it is a low-yield source most days and was never at risk of dominating.

---

## Phase 3: Judgment

### Stage 6 — Deep-read ranker
The one real LLM stage in filtering/judgment. Every shortlisted paper (title + abstract, real full-text reading not yet built) is sent to Claude and scored on four dimensions: novelty (1-5), rigor (1-7, weighted heavy, since method quality matters most), robustness (1-5), significance (1-7, weighted heavy, since relevance matters most). The model returns strict JSON; a defensive parser extracts the JSON object from the response regardless of stray prose or code fences the model might add around it. Every candidate is scored and ranked, not just the eventual winners, so the day's decision is auditable.

### Stage 7 — Fallback check (retired)
Originally designed to swap in a classic paper on a weak day. Removed after observing that the daily volume of genuinely interesting candidates made a weak-day fallback unnecessary. The number is kept retired rather than renumbering the stages that follow.

---

## Phase 4: Output

### Stage 8 — Report builder
Produces two distinct deliverables, not one. First, a lightweight scan of the full shortlist: title, source, and link for every candidate, no LLM call. Second, a Who/What/When/Where/Why/How write-up for the top 3 papers by score, one LLM call each: Who is authors/institution if identifiable, What is the core goal or discovery, When is the publish date, Where is a research location or one mentioned in the text, Why is the motivating problem, How is the contribution and method. Any field with no real answer is left blank rather than invented, the prompt explicitly forbids fabricating a detail to fill a slot.

### Stage 9 — Delivery
Sends both deliverables in one email via Resend. Working and tested end to end. Currently limited to sending only to the account owner's own address, since Resend's free tier only allows sending to other recipients from a verified custom domain, sending to friends is a real, deliberate later step, not yet done.

### Stage 10 — Archive & log
Written, not yet wired into the live run. Appends one JSON-lines record per run (timestamp, every candidate's score, the chosen top 3) to a running archive file, and marks the chosen top 3's ids as seen in `seenPapers.json` so they cannot be re-selected on a future day. `markAsSeen` is only ever called here, at the true end of the pipeline, never earlier, a paper that merely scored well but wasn't chosen is not blocked from resurfacing tomorrow.

---

## Cost and reliability notes, by stage

- Stages 1-5, 7 (retired), 9: free or near-free, no LLM involved.
- Stage 6: the main cost driver, but cheap in practice, a full run of about 14 candidates on a fast, small model has cost roughly a cent.
- Stage 8: one small LLM call per top-3 paper for the 5W write-up; the shortlist scan itself is free.
- Semantic Scholar was built (collector, adapter, retry-with-backoff on rate limits) but is not currently wired into the live pipeline, due to persistent rate limiting on the free, unauthenticated tier.
