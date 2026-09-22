// arxivTest.ts
// Purpose: confirm we can pull real paper data from arXiv before
// building any filtering logic on top of it. No judgment calls here —
// just prove the raw data comes through in a shape we can work with.

async function testArxivFetch(): Promise<void> {
  // arXiv's query API: cs.AI is the category code for AI research papers.
  // sortBy=submittedDate + sortOrder=descending means "newest first."
  // max_results=5 keeps this test small and readable.
  const queryUrl: string =
    "http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=5";

  const response = await fetch(queryUrl);

  if (!response.ok) {
    console.log(`Request failed. Status: ${response.status}`);
    return;
  }

  const rawXmlText: string = await response.text();
  // Unlike the Anthropic test, we do NOT call response.json() here —
  // arXiv sends back XML text, not JSON, so we grab it as plain text
  // and will need to pull the pieces we want out of it manually below.

  // Quick and dirty extraction for this test: XML entries are wrapped
  // in <entry>...</entry> tags, each containing a <title> and <summary>.
  // This is NOT a real XML parser — it's just enough to prove data is
  // coming through. We'll replace this with a proper parser once we
  // know the real shape of what arXiv sends back.
  const entryMatches: RegExpMatchArray | null = rawXmlText.match(/<entry>[\s\S]*?<\/entry>/g);

  if (entryMatches === null) {
    console.log("No entries found. Here's the raw response to inspect:");
    console.log(rawXmlText);
    return;
  }

  console.log(`Found ${entryMatches.length} papers:\n`);

  for (const singleEntry of entryMatches) {
    const titleMatch: RegExpMatchArray | null = singleEntry.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch: RegExpMatchArray | null = singleEntry.match(/<summary>([\s\S]*?)<\/summary>/);

    const paperTitle: string = titleMatch?.[1]?.trim() ?? "No title found";
    const paperSummary: string = summaryMatch?.[1]?.trim() ?? "No summary found";
/**
 * titleMatch?.[1] — "if titleMatch is null, stop right here and the whole expression becomes undefined; otherwise, grab index 1." The ?. is optional chaining — it's a safe way to reach into something that might not exist, instead of crashing.
?.trim() — same idea, chained again: "if what we got back is undefined, don't bother calling .trim() on it, just pass undefined along."
?? "No title found" — nullish coalescing: "if everything above ended up undefined (or null), use this fallback string instead."
 */
    console.log(`TITLE: ${paperTitle}`);
    console.log(`SUMMARY: ${paperSummary.slice(0, 200)}...`);
    console.log("---");
  }
}

testArxivFetch();