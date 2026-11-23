import { type JobsOptions, Queue } from "bullmq";
import type { JobData, JobName } from "./jobs.js";
import { JOB_QUEUE_NAME, JOB_QUEUE_OPTIONS } from "./queue-options.js";
import { createRedisConnection } from "./redis-connection.js";

export type { Queue } from "bullmq";

export function createQueue(redisUrl: string, name = JOB_QUEUE_NAME): Queue {
	return new Queue(name, {
		connection: createRedisConnection(redisUrl),
		defaultJobOptions: JOB_QUEUE_OPTIONS,
	});
}

export function addJob<N extends JobName>(
	queue: Queue,
	name: N,
	data: JobData[N],
	opts?: JobsOptions,
) {
	return queue.add(name, data, opts);
}

export function addJobs<N extends JobName>(
	queue: Queue,
	name: N,
	items: JobData[N][],
	opts?: JobsOptions,
) {
	return queue.addBulk(items.map((data) => ({ name, data, opts })));
}
