import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import { useState } from "react";

export function App() {
	const [checks, setChecks] = useState(0);
	const [dark, setDark] = useState(() =>
		document.documentElement.classList.contains("dark"),
	);

	function toggleTheme() {
		const next = !dark;
		document.documentElement.classList.toggle("dark", next);
		setDark(next);
	}

	return (
		<main className="grid min-h-svh place-items-center bg-muted/30 px-4 py-12">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<div className="mb-3 flex items-center justify-between gap-3">
						<Badge variant="secondary">Frontend starter</Badge>
						<Badge variant="outline">Rhea</Badge>
					</div>
					<h1 className="font-heading text-2xl font-semibold tracking-tight">
						Opening Radar
					</h1>
					<CardDescription>
						React + Vite, with shared shadcn/ui components in{" "}
						<code className="text-xs text-foreground">packages/ui</code>.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<Separator />
					<dl className="grid grid-cols-2 gap-3 text-sm">
						<dt className="text-muted-foreground">Application</dt>
						<dd>React + TypeScript</dd>
						<dt className="text-muted-foreground">Build tooling</dt>
						<dd>Vite + Tailwind CSS v4</dd>
						<dt className="text-muted-foreground">Components</dt>
						<dd>shadcn/ui · Base UI · Rhea</dd>
					</dl>
					<p className="text-sm text-muted-foreground">
						Frontend setup only. Discovery, AI extraction, and backend
						integration are not connected.
					</p>
				</CardContent>
				<CardFooter className="flex flex-wrap gap-2">
					<Button type="button" onClick={() => setChecks((count) => count + 1)}>
						Test React
					</Button>
					<Button
						type="button"
						variant="outline"
						aria-pressed={dark}
						onClick={toggleTheme}
					>
						Dark mode
					</Button>
					<p
						role="status"
						className="mt-2 w-full text-xs text-muted-foreground"
					>
						{checks === 0
							? "Use the buttons to check interactivity and theme styles."
							: `React check passed ${checks} ${checks === 1 ? "time" : "times"}.`}
					</p>
				</CardFooter>
			</Card>
		</main>
	);
}
