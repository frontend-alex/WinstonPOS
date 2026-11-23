const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const {
	cpSync,
	mkdtempSync,
	mkdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { test } = require("node:test");
const { validateEnv } = require("../dist/schema.js");
const { parseEnv, findWorkspaceRoot } = require("../dist/index.js");

const uri = "mongodb://127.0.0.1:27017/env_fixture";

test("validates and freezes typed configuration without exposing unknown keys", () => {
	const config = validateEnv({
		MONGODB_URI: uri,
		API_PORT: "4100",
		EXTRA_SECRET: "hidden",
	});
	assert.equal(config.API_PORT, 4100);
	assert.equal(config.NODE_ENV, "development");
	assert.equal(config.MONGODB_URI, uri);
	assert.equal("EXTRA_SECRET" in config, false);
	assert.ok(Object.isFrozen(config));
});

test("accepts mongodb+srv URLs", () => {
	assert.equal(
		validateEnv({ MONGODB_URI: "mongodb+srv://example.invalid/opening_radar" })
			.MONGODB_URI,
		"mongodb+srv://example.invalid/opening_radar",
	);
});

test("requires MongoDB and rejects unsupported protocols without leaking values", () => {
	assert.throws(() => validateEnv({}), /MONGODB_URI is required/);
	assert.throws(
		() =>
			validateEnv({
				MONGODB_URI: "https://username:do-not-log-this@example.invalid/db",
			}),
		(error) =>
			error.message.includes("MONGODB_URI") &&
			!error.message.includes("do-not-log-this"),
	);
});

test("defaults REDIS_URL to the local compose container", () => {
	assert.equal(
		validateEnv({ MONGODB_URI: uri }).REDIS_URL,
		"redis://127.0.0.1:6379",
	);
});

test("accepts redis:// and rediss:// URLs", () => {
	for (const redis of [
		"redis://127.0.0.1:6379",
		"rediss://cache.example.invalid:6380/0",
	]) {
		assert.equal(
			validateEnv({ MONGODB_URI: uri, REDIS_URL: redis }).REDIS_URL,
			redis,
		);
	}
});

test("rejects other Redis protocols without leaking values", () => {
	assert.throws(
		() =>
			validateEnv({
				MONGODB_URI: uri,
				REDIS_URL: "http://user:do-not-log-this@example.invalid:6379",
			}),
		(error) =>
			error.message.includes("REDIS_URL") &&
			!error.message.includes("do-not-log-this"),
	);
});

test("defaults WORKER_PORT next to the API port", () => {
	const config = validateEnv({ MONGODB_URI: uri, WORKER_PORT: "4300" });
	assert.equal(config.WORKER_PORT, 4300);
	assert.equal(validateEnv({ MONGODB_URI: uri }).WORKER_PORT, 3001);
});

test("rejects invalid ports and environments", () => {
	for (const key of ["API_PORT", "WORKER_PORT"]) {
		for (const port of ["", "abc", "0", "-1", "65536", "3000.5"]) {
			assert.throws(
				() => validateEnv({ MONGODB_URI: uri, [key]: port }),
				new RegExp(key),
			);
		}
	}
	assert.throws(
		() => validateEnv({ MONGODB_URI: uri, NODE_ENV: "not-an-environment" }),
		/NODE_ENV/,
	);
});

function withFixtureWorkspace(run) {
	const workspace = mkdtempSync(join(tmpdir(), "opening-radar-env-"));
	const packageDir = join(workspace, "packages/env");
	mkdirSync(packageDir, { recursive: true });
	mkdirSync(join(workspace, "unrelated-cwd"));
	writeFileSync(
		join(workspace, "pnpm-workspace.yaml"),
		"packages:\n  - 'packages/*'\n",
	);
	cpSync(resolve(__dirname, "../dist"), join(packageDir, "dist"), {
		recursive: true,
	});
	symlinkSync(
		resolve(__dirname, "../node_modules"),
		join(packageDir, "node_modules"),
		"dir",
	);
	try {
		run(workspace, join(packageDir, "dist/config.js"));
	} finally {
		rmSync(workspace, { recursive: true, force: true });
	}
}

function childEnvironment(overrides = {}) {
	const env = { ...process.env };
	delete env.MONGODB_URI;
	delete env.API_PORT;
	delete env.WORKER_PORT;
	delete env.REDIS_URL;
	delete env.NODE_ENV;
	return { ...env, ...overrides };
}

test("loads the workspace .env independently of cwd, preserving process precedence", () => {
	withFixtureWorkspace((workspace, configPath) => {
		writeFileSync(
			join(workspace, ".env"),
			`MONGODB_URI=${uri}\nAPI_PORT=4100\nNODE_ENV=test\n`,
		);
		const script = `
			const assert = require("node:assert/strict");
			const { config } = require(process.argv[1]);
			assert.equal(config.MONGODB_URI, ${JSON.stringify(uri)});
			assert.equal(config.API_PORT, 4200);
			assert.equal(config.NODE_ENV, "test");
		`;
		execFileSync(process.execPath, ["-e", script, configPath], {
			cwd: join(workspace, "unrelated-cwd"),
			env: childEnvironment({ API_PORT: "4200" }),
			stdio: "pipe",
		});
	});
});

test("supports process-only deployment without a .env file", () => {
	withFixtureWorkspace((workspace, configPath) => {
		execFileSync(
			process.execPath,
			[
				"-e",
				'const assert = require("node:assert/strict"); const {config} = require(process.argv[1]); assert.equal(config.API_PORT, 3000);',
				configPath,
			],
			{
				cwd: workspace,
				env: childEnvironment({ MONGODB_URI: uri }),
				stdio: "pipe",
			},
		);
	});
});

test("preserves the loader's raw parsing separately from Zod validation", () => {
	assert.deepEqual(
		parseEnv(`
			# A comment
			export NODE_ENV=test
			API_PORT=4100 # Inline comment
			MONGODB_URI="${uri}"
			QUOTED="line one\\nline two"
		`),
		{
			NODE_ENV: "test",
			API_PORT: "4100",
			MONGODB_URI: uri,
			QUOTED: "line one\nline two",
		},
	);
});

test("discovers pnpm workspaces from nested package directories", () => {
	withFixtureWorkspace((workspace) => {
		assert.equal(
			findWorkspaceRoot(join(workspace, "packages/env/dist")),
			workspace,
		);
	});
});

test(".env.local overrides .env while process environment wins over both", () => {
	withFixtureWorkspace((workspace, configPath) => {
		writeFileSync(
			join(workspace, ".env"),
			`MONGODB_URI=${uri}\nAPI_PORT=4100\nNODE_ENV=development\n`,
		);
		writeFileSync(
			join(workspace, ".env.local"),
			"API_PORT=4150\nNODE_ENV=test\n",
		);

		for (const [overrides, expectedPort] of [
			[{}, 4150],
			[{ API_PORT: "4200" }, 4200],
		]) {
			execFileSync(
				process.execPath,
				[
					"-e",
					`const assert = require("node:assert/strict");
					const {config} = require(process.argv[1]);
					assert.equal(config.API_PORT, ${expectedPort});
					assert.equal(config.NODE_ENV, "test");`,
					configPath,
				],
				{
					cwd: join(workspace, "packages/env"),
					env: childEnvironment(overrides),
					stdio: "pipe",
				},
			);
		}
	});
});

test("config fails immediately when a required variable is absent or invalid", () => {
	withFixtureWorkspace((workspace, configPath) => {
		for (const overrides of [
			{},
			{ MONGODB_URI: "https://user:never-log-me@example.invalid/db" },
		]) {
			execFileSync(
				process.execPath,
				[
					"-e",
					`const assert = require("node:assert/strict");
					assert.throws(() => require(process.argv[1]), error =>
						error.message.includes("MONGODB_URI") &&
						!error.message.includes("never-log-me")
					);`,
					configPath,
				],
				{ cwd: workspace, env: childEnvironment(overrides), stdio: "pipe" },
			);
		}
	});
});

test("the side-effect load entry point also validates required variables", () => {
	withFixtureWorkspace((workspace) => {
		execFileSync(
			process.execPath,
			[
				"-e",
				`require("node:assert/strict").throws(
					() => require(process.argv[1]), /MONGODB_URI/
				);`,
				join(workspace, "packages/env/dist/load.js"),
			],
			{ cwd: workspace, env: childEnvironment(), stdio: "pipe" },
		);
	});
});

test("blocks browser-condition imports of server config", () => {
	execFileSync(
		process.execPath,
		[
			"--conditions=browser",
			"-e",
			`require("node:assert/strict").throws(
				() => require("@repo/env/config"),
				{code: "ERR_PACKAGE_PATH_NOT_EXPORTED"}
			);`,
		],
		{ cwd: resolve(__dirname, ".."), stdio: "pipe" },
	);
});
