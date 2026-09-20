/** The one shape every source adapter must produce. Stage 3 onward only ever sees this — never a source's raw format. */
export interface PaperRecord {
    id: string;
    title: string;
    abstractOrSnippet: string;
    url: string;
    source: "arxiv" | "hackernews" | "papersWithCode";
    timestamp: string;
    rawSignalData: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map