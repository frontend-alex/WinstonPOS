import { config } from "@repo/env/config";
import { DatabaseConnection } from "./connection.js";

const connection = new DatabaseConnection(config.MONGODB_URI);

export function connectDatabase() {
	return connection.connect();
}

export function closeDatabase() {
	return connection.close();
}

export type { Collection, Db, Document } from "mongodb";
export { ObjectId } from "mongodb";
