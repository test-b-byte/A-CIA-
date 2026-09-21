/** True if a string is non-empty after trimming whitespace. */
function isNonEmptyText(value) {
    return value.trim().length > 0;
}
/** Converts Hacker News's raw JSON response into an array of PaperRecords. */
export function parseHnResponse(rawJsonText) {
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(rawJsonText);
    }
    catch (parseError) {
        throw new Error(`HN response was not valid JSON: ${parseError}`);
    }
    if (!Array.isArray(parsedResponse.hits)) {
        throw new Error("HN response missing expected 'hits' array. Response shape may have changed.");
    }
    // MARKER: HN's front page is general tech news, not filtered to AI or ML.
    // This function only converts the shape. It does not remove off-topic stories.
    // Stage 3 must filter this output. Do not assume everything here is relevant.
    return parsedResponse.hits
        .filter((hit) => hit && hit.objectID && isNonEmptyText(hit.title ?? ""))
        .map((hit) => {
        return {
            id: String(hit.objectID),
            title: hit.title,
            // MARKER: most HN stories are bare links with no summary.
            // story_text only exists on Show HN or Ask HN posts. Empty string otherwise.
            abstractOrSnippet: hit.story_text ?? "",
            url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
            source: "hackernews",
            timestamp: hit.created_at ?? "",
            rawSignalData: {
                points: hit.points ?? 0,
                numComments: hit.num_comments ?? 0,
            },
        };
    });
}
//# sourceMappingURL=hnAdapter.js.map