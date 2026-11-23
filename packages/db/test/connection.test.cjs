const assert = require("node:assert/strict");
const { afterEach, mock, test } = require("node:test");
const { Db, MongoClient } = require("mongodb");
const { DatabaseConnection } = require("../dist/connection.js");

const uri = "mongodb://127.0.0.1:27017/db_fixture";

afterEach(() => mock.restoreAll());

function stubDriver() {
	const connect = mock.method(
		MongoClient.prototype,
		"connect",
		async function () {
			return this;
		},
	);
	const close = mock.method(MongoClient.prototype, "close", async () => {});
	const ping = mock.method(Db.prototype, "command", async (command) => {
		assert.deepEqual(command, { ping: 1 });
		return { ok: 1 };
	});
	return { connect, close, ping };
}

test("concurrent callers reuse one client/pool and ping once", async () => {
	const driver = stubDriver();
	const connection = new DatabaseConnection(uri);
	try {
		const databases = await Promise.all([
			connection.connect(),
			connection.connect(),
			connection.connect(),
		]);
		assert.equal(databases[0], databases[1]);
		assert.equal(databases[1], databases[2]);
		assert.equal(databases[0].databaseName, "db_fixture");
		assert.equal(driver.connect.mock.callCount(), 1);
		assert.equal(driver.ping.mock.callCount(), 1);
	} finally {
		await connection.close();
	}
	assert.equal(driver.close.mock.callCount(), 1);
});

test("failed connections clean up, redact driver errors, and allow retry", async () => {
	const driver = stubDriver();
	driver.connect.mock.mockImplementationOnce(async () => {
		throw new Error("failed: mongodb://user:never-log-me@example.invalid/db");
	});
	const connection = new DatabaseConnection(uri);
	await assert.rejects(
		connection.connect(),
		(error) =>
			error.message.includes("MongoDB connection failed") &&
			!error.message.includes("never-log-me"),
	);
	assert.equal(driver.close.mock.callCount(), 1);
	try {
		assert.equal((await connection.connect()).databaseName, "db_fixture");
		assert.equal(driver.connect.mock.callCount(), 2);
	} finally {
		await connection.close();
	}
});

test("a failed ping prevents a connection from being reported ready", async () => {
	const driver = stubDriver();
	driver.ping.mock.mockImplementationOnce(async () => {
		throw new Error("ping failed");
	});
	const connection = new DatabaseConnection(uri);
	await assert.rejects(connection.connect(), /MongoDB connection failed/);
	assert.equal(driver.close.mock.callCount(), 1);
	try {
		await connection.connect();
		assert.equal(driver.connect.mock.callCount(), 2);
	} finally {
		await connection.close();
	}
});

test("close waits for in-flight connect; repeated close and reconnect are safe", async () => {
	const driver = stubDriver();
	const gate = Promise.withResolvers();
	driver.connect.mock.mockImplementationOnce(async function () {
		await gate.promise;
		return this;
	});
	const connection = new DatabaseConnection(uri);
	const pending = connection.connect();
	const closing = connection.close();
	const secondClose = connection.close();
	assert.equal(driver.close.mock.callCount(), 0);
	gate.resolve();
	await pending;
	await Promise.all([closing, secondClose]);
	assert.equal(driver.close.mock.callCount(), 1);
	try {
		await connection.connect();
		assert.equal(driver.connect.mock.callCount(), 2);
	} finally {
		await connection.close();
	}
});

test("close without a connection is a no-op", async () => {
	const driver = stubDriver();
	await new DatabaseConnection(uri).close();
	assert.equal(driver.connect.mock.callCount(), 0);
	assert.equal(driver.close.mock.callCount(), 0);
});

test("constructor/URI errors are sanitized, not leaked", async () => {
	const connection = new DatabaseConnection(
		"https://user:never-log-me@host/db",
	);
	await assert.rejects(
		connection.connect(),
		(error) =>
			error.message.includes("MongoDB connection failed") &&
			!error.message.includes("never-log-me"),
	);
	await connection.close();
});
