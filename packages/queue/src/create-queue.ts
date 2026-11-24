import { Queue } from "bullmq";
import { JOB_QUEUE_NAME, JOB_QUEUE_OPTIONS } from "./queue-options.js";
import { createRedisConnection } from "./redis-connection.js";

export type { Queue } from "bullmq";

export function createQueue(redisUrl: string, name = JOB_QUEUE_NAME): Queue {
	return new Queue(name, {
		connection: createRedisConnection(redisUrl),
		defaultJobOptions: JOB_QUEUE_OPTIONS,
	});
}
