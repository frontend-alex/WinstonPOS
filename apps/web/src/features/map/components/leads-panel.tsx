import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { SearchIcon } from "@animateicons/react/huge";
import type { Lead } from "@repo/contracts";
import { Input } from "@repo/ui/components/input";
import { toast } from "@repo/ui/components/sonner";
import { cn } from "@repo/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { scanSources } from "../api/map";
import { useRestaurantMapContext } from "../context/restaurant-map-context";
import { LeadDetails } from "./lead-details";

// Long enough for a previously open card to finish collapsing (animate-ui uses 350 ms).
const COLLAPSE_MS = 400;

interface IconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

export function LeadsPanel() {
	const {
		results,
		selected,
		query,
		setQuery,
		select,
		loading,
		error,
		refresh,
	} = useRestaurantMapContext();
	const [searching, setSearching] = useState(query !== "");
	const searchIcon = useRef<IconHandle>(null);
	// Which card is expanded. Opening a card does not move the map; picking a lead on the map
	// (or pressing "Fly to lead") opens its card.
	const [openId, setOpenId] = useState<string | null>(selected?.id ?? null);
	const [lastSelectedId, setLastSelectedId] = useState(selected?.id);
	const [scanning, setScanning] = useState(false);
	if (selected?.id !== lastSelectedId) {
		setLastSelectedId(selected?.id);
		if (selected) setOpenId(selected.id);
	}

	// Bring the lead picked on the map to the top of the list.
	const cards = useRef(new Map<string, HTMLElement>());
	useEffect(() => {
		if (!selected) return;
		const scroll = () =>
			cards.current.get(selected.id)?.scrollIntoView({
				block: "start",
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
			});
		scroll();
		// Scroll again once a card above it has collapsed and shifted the list.
		const settle = window.setTimeout(scroll, COLLAPSE_MS);
		return () => window.clearTimeout(settle);
	}, [selected]);

	async function scan() {
		setScanning(true);
		try {
			const { queued } = await scanSources();
			toast.success(`Queued ${queued} source jobs`, {
				description:
					"Enrichment runs in the background; use Refresh to see updates.",
			});
		} catch {
			toast.error("Could not queue the scan", {
				description: "Check that the API is running.",
			});
		} finally {
			setScanning(false);
		}
	}

	return (
		<>
			<header className="space-y-5 px-6 pt-7 pb-4">
				<div className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-normal tracking-tight">
						Leads{" "}
						<span className="text-base text-muted-foreground tabular-nums">
							{results.length}
						</span>
					</h1>
					<button
						type="button"
						aria-label={searching ? "Close search" : "Search leads"}
						aria-expanded={searching}
						onMouseEnter={() => searchIcon.current?.startAnimation()}
						onMouseLeave={() => searchIcon.current?.stopAnimation()}
						onClick={() => {
							if (searching) setQuery("");
							setSearching(!searching);
						}}
						className={cn(
							"grid size-11 place-items-center rounded-full shadow-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
							searching
								? "bg-foreground text-background"
								: "bg-card/90 hover:bg-card",
						)}
					>
						<SearchIcon ref={searchIcon} size={20} />
					</button>
				</div>
				<div className="flex gap-2 text-sm">
					<button
						type="button"
						onClick={() => void scan()}
						disabled={scanning}
						className="rounded-full bg-foreground px-4 py-2 text-background disabled:opacity-50"
					>
						{scanning ? "Queueing…" : "Scan sources"}
					</button>
					<button
						type="button"
						onClick={() => void refresh()}
						disabled={loading}
						className="rounded-full bg-card px-4 py-2 disabled:opacity-50"
					>
						Refresh
					</button>
				</div>
				{searching && (
					<Input
						type="search"
						autoFocus
						aria-label="Search leads"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search by title, city, source or address"
						className="h-11 rounded-full border-transparent bg-card/90 px-5 shadow-sm"
					/>
				)}
			</header>
			{/* pt-1 leaves room for the open card's ring, which the scroll container would clip. */}
			<ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pt-1 pb-6">
				{results.map((lead) => (
					<li
						key={lead.id}
						// scroll-mt-1 keeps the open card's ring visible at the top.
						className="scroll-mt-1"
						ref={(element) => {
							if (element) cards.current.set(lead.id, element);
							else cards.current.delete(lead.id);
						}}
					>
						<LeadCard
							lead={lead}
							open={openId === lead.id}
							onOpenChange={(open) => setOpenId(open ? lead.id : null)}
							onFly={() => select(lead.id)}
						/>
					</li>
				))}
			</ol>
			{loading && (
				<p
					role="status"
					className="p-6 text-center text-sm text-muted-foreground"
				>
					Loading leads…
				</p>
			)}
			{!loading && !error && results.length === 0 && (
				<p className="p-6 text-center text-sm text-muted-foreground">
					{query ? "No matching leads" : "No leads yet"}
				</p>
			)}
		</>
	);
}

function LeadCard({
	lead,
	open,
	onOpenChange,
	onFly,
}: {
	lead: Lead;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onFly: () => void;
}) {
	const coordinates = lead.location?.coordinates;

	return (
		<Collapsible.Root
			open={open}
			onOpenChange={onOpenChange}
			render={<article />}
			className={cn(
				"rounded-3xl bg-card/85 shadow-sm ring-1 transition-[box-shadow,background-color] duration-300",
				open
					? "bg-card ring-indigo-500"
					: "ring-transparent hover:ring-foreground/10",
			)}
		>
			<Collapsible.Trigger className="flex w-full items-start justify-between gap-3 rounded-3xl px-5 py-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
				<span className="min-w-0">
					<span className="block truncate text-[15px] font-medium">
						{lead.details?.businessName ?? lead.title}
					</span>
					<span className="mt-1 block text-sm text-muted-foreground">
						{lead.city ?? "City unavailable"}
					</span>
				</span>
				<span
					className={cn(
						"inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors duration-300",
						open
							? "bg-indigo-100 text-indigo-950 dark:bg-indigo-500/20 dark:text-indigo-100"
							: "bg-pink-100 text-pink-950 dark:bg-pink-500/20 dark:text-pink-100",
					)}
				>
					<span
						aria-hidden="true"
						className={cn(
							"size-1.5 rounded-full transition-colors duration-300",
							open ? "bg-indigo-500" : "bg-pink-500",
						)}
					/>
					{lead.source === "news" ? "News" : "Official notice"}
				</span>
			</Collapsible.Trigger>
			<Collapsible.Panel>
				<div className="px-5 pb-5">
					<LeadDetails lead={lead} />
					<button
						type="button"
						onClick={onFly}
						disabled={!coordinates}
						className="mt-5 h-11 w-full rounded-full bg-foreground text-sm font-medium text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{coordinates ? "Fly to lead" : "Location unavailable"}
					</button>
				</div>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
