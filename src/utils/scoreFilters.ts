export type ScoreFiltered = {
    PerformanceID?: string;
    Username: string;
    CountryName: string;
    ContestYear: number;
    ContestType: string;
    Score: number;
    Comment: string | null;
    YoutubeLink: string;
    GifURL: string | null;
    Song: string;
    Artist: string;
    Qualified?: boolean;
    Place?: number;
};

export type SortType = "time" | "score" | "place";

export function scoreKey(item: ScoreFiltered): string {
    if (item.PerformanceID) return item.PerformanceID;
    return `${item.ContestYear}|${item.ContestType}|${item.CountryName}|${item.Artist}|${item.Song}`;
}

export function applyScoreFilters(
    data: ScoreFiltered[],
    filterType: string,
    qualifiedFilter: string,
    sort: SortType
): ScoreFiltered[] {
    let res = [...data];
    if (filterType === "final") {
        res = res.filter((item) => item.ContestType === "final" || item.ContestType === "Финал");
    } else if (filterType === "semifinal") {
        res = res.filter((item) => item.ContestType?.includes("semifinal"));

        if (qualifiedFilter === "qualified") {
            res = res.filter((item) => item.Qualified === true);
        } else if (qualifiedFilter === "not-qualified") {
            res = res.filter(
                (item) =>
                    item.Qualified === false ||
                    item.Qualified === null ||
                    item.Qualified === undefined
            );
        }
    }

    if (filterType === "final" && sort === "place") {
        res.sort((a, b) => (a.Place ?? Infinity) - (b.Place ?? Infinity));
    }

    return res;
}

export type CompareRow = {
    key: string;
    mine: ScoreFiltered | null;
    theirs: ScoreFiltered | null;
    display: ScoreFiltered;
};

export function buildCompareRows(
    mine: ScoreFiltered[],
    theirs: ScoreFiltered[],
    sort: SortType,
    filterType: string
): CompareRow[] {
    const theirsMap = new Map(theirs.map((i) => [scoreKey(i), i]));
    const seen = new Set<string>();
    const rows: CompareRow[] = [];

    for (const item of mine) {
        const key = scoreKey(item);
        seen.add(key);
        rows.push({
            key,
            mine: item,
            theirs: theirsMap.get(key) ?? null,
            display: item,
        });
    }

    for (const item of theirs) {
        const key = scoreKey(item);
        if (seen.has(key)) continue;
        rows.push({
            key,
            mine: null,
            theirs: item,
            display: item,
        });
    }

    if (filterType === "final" && sort === "place") {
        rows.sort((a, b) => (a.display.Place ?? Infinity) - (b.display.Place ?? Infinity));
    } else if (sort === "score") {
        rows.sort((a, b) => {
            const aScore = Math.max(a.mine?.Score ?? 0, a.theirs?.Score ?? 0);
            const bScore = Math.max(b.mine?.Score ?? 0, b.theirs?.Score ?? 0);
            return bScore - aScore;
        });
    }

    return rows;
}
