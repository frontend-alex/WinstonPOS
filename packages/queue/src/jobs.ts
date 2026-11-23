export interface JobData {
	"official-notices": { lookbackDays: number };
	"news-feed": { url: string };
}

export type JobName = keyof JobData;

export const JOBS = {
	officialNotices: "official-notices",
	newsFeed: "news-feed",
} as const satisfies Record<string, JobName>;
