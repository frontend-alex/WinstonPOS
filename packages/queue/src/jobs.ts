import { z } from "zod";

export const officialNoticesJobSchema = z.strictObject({
	lookbackDays: z.number().int().min(1).max(365),
});
export const newsFeedJobSchema = z.strictObject({
	url: z.url({ protocol: /^https?$/ }),
});

export interface JobData {
	"official-notices": z.infer<typeof officialNoticesJobSchema>;
	"news-feed": z.infer<typeof newsFeedJobSchema>;
}

export type JobName = keyof JobData;

export const JOBS = {
	officialNotices: "official-notices",
	newsFeed: "news-feed",
} as const satisfies Record<string, JobName>;

export type ScanJob =
	| { name: "official-notices"; data: JobData["official-notices"] }
	| { name: "news-feed"; data: JobData["news-feed"] };
