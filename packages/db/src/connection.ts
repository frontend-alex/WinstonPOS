import { type Db, MongoClient } from "mongodb";

/**
 * One client/pool per process. Concurrent callers share the same connection;
 * failed attempts are cleaned up so a later call can retry.
 */
export class DatabaseConnection {
	private client: MongoClient | undefined;
	private connection: Promise<Db> | undefined;
	private closing: Promise<void> | undefined;

	constructor(private readonly uri: string) {}

	async connect(): Promise<Db> {
		if (this.closing) {
			await this.closing;
		}

		if (!this.connection) {
			this.connection = this.open();
		}

		return this.connection;
	}

	private async open(): Promise<Db> {
		let client: MongoClient | undefined;

		try {
			client = new MongoClient(this.uri, {
				appName: "opening-radar",
				maxPoolSize: 10,
				minPoolSize: 0,
				serverSelectionTimeoutMS: 5000,
				connectTimeoutMS: 10000,
				waitQueueTimeoutMS: 5000,
			});
			this.client = client;
			await client.connect();
			const database = client.db();
			await database.command({ ping: 1 });
			return database;
		} catch {
			await client?.close().catch(() => undefined);
			this.client = undefined;
			this.connection = undefined;
			// Do not attach the driver error: it may contain connection secrets.
			throw new Error(
				"MongoDB connection failed. Check MONGODB_URI, database availability, and network/TLS access.",
			);
		}
	}

	async close(): Promise<void> {
		if (this.closing) {
			return this.closing;
		}

		if (!this.connection) {
			return;
		}

		const connection = this.connection;
		this.closing = (async () => {
			try {
				// Wait for an in-flight connect before closing its client.
				// A failed connection has already performed its own cleanup.
				await connection.catch(() => undefined);
				await this.client?.close();
			} catch {
				throw new Error("MongoDB connection could not be closed cleanly.");
			} finally {
				this.client = undefined;
				this.connection = undefined;
				this.closing = undefined;
			}
		})();

		return this.closing;
	}
}
