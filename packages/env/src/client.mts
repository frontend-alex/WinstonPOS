import { z } from "zod";

export const clientEnvSchema = z.object({
	VITE_MAPBOX_ACCESS_TOKEN: z
		.string({ error: "is required" })
		.trim()
		.startsWith("pk.", { error: "must be a public Mapbox token (pk.*)" }),
});

export type ClientConfig = Readonly<z.infer<typeof clientEnvSchema>>;

export function createClientConfig(
	input: Record<string, unknown>,
): ClientConfig {
	const result = clientEnvSchema.safeParse(input);
	if (!result.success) {
		const details = result.error.issues
			.map((issue) => `${issue.path.join(".")} ${issue.message}`)
			.join("\n");
		throw new Error(`Invalid client environment:\n${details}`);
	}
	return Object.freeze(result.data);
}
