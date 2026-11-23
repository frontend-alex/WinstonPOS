import { z } from "zod";

export const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	MONGODB_URI: z
		.string({ error: "MONGODB_URI is required" })
		.trim()
		.regex(/^mongodb(?:\+srv)?:\/\/[^\s]+$/, {
			error: "Must be a mongodb:// or mongodb+srv:// connection string",
		}),
});

export type Config = Readonly<z.infer<typeof envSchema>>;

export function validateEnv(input: Record<string, unknown>): Config {
	const result = envSchema.safeParse(input);

	if (!result.success) {
		const details = result.error.issues
			.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
			.join("\n");
		// Values are intentionally omitted: MongoDB URLs can contain credentials.
		throw new Error(`Invalid server environment:\n${details}`);
	}

	return Object.freeze(result.data);
}
