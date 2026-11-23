import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { SearchIcon } from "@animateicons/react/huge";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { useRef, useState } from "react";
import { useRestaurantMapContext } from "../context/restaurant-map-context";
import type { Restaurant } from "../types";

interface IconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

export function LeadsPanel() {
	const { results, selected, query, setQuery, select } =
		useRestaurantMapContext();
	const [searching, setSearching] = useState(query !== "");
	const searchIcon = useRef<IconHandle>(null);
	// Which card is expanded. Opening a card does not move the map; picking a lead on the map
	// (or pressing "Fly to lead") opens its card.
	const [openId, setOpenId] = useState<string | null>(selected?.id ?? null);
	const [lastSelectedId, setLastSelectedId] = useState(selected?.id);
	if (selected?.id !== lastSelectedId) {
		setLastSelectedId(selected?.id);
		if (selected) setOpenId(selected.id);
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
				{searching && (
					<Input
						type="search"
						autoFocus
						aria-label="Search leads"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search by name, city or category"
						className="h-11 rounded-full border-transparent bg-card/90 px-5 shadow-sm"
					/>
				)}
			</header>
			{/* pt-1 leaves room for the open card's ring, which the scroll container would clip. */}
			<ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pt-1 pb-6">
				{results.map((restaurant) => (
					<li key={restaurant.id}>
						<LeadCard
							restaurant={restaurant}
							open={openId === restaurant.id}
							onOpenChange={(open) => setOpenId(open ? restaurant.id : null)}
							onFly={() => select(restaurant.id)}
						/>
					</li>
				))}
			</ol>
			{results.length === 0 && (
				<p className="p-6 text-center text-sm text-muted-foreground">
					No results
				</p>
			)}
		</>
	);
}

function LeadCard({
	restaurant,
	open,
	onOpenChange,
	onFly,
}: {
	restaurant: Restaurant;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onFly: () => void;
}) {
	const [lng, lat] = restaurant.coordinates;

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
						{restaurant.name}
					</span>
					<span className="mt-1 block text-sm text-muted-foreground">
						{restaurant.city}
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
					{restaurant.category}
				</span>
			</Collapsible.Trigger>
			<Collapsible.Panel>
				<div className="px-5 pb-5">
					<ol className="relative space-y-4 border-l border-dashed border-foreground/40 pl-5 text-sm">
						<li className="relative">
							<span className="absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-foreground bg-card" />
							<span className="block font-medium">City</span>
							<span className="text-muted-foreground">{restaurant.city}</span>
						</li>
						<li className="relative">
							<span className="absolute top-1 -left-[25px] size-2.5 rounded-full bg-foreground" />
							<span className="block font-medium">Coordinates</span>
							<span className="text-muted-foreground tabular-nums">
								{lat.toFixed(4)}, {lng.toFixed(4)}
							</span>
						</li>
					</ol>
					<button
						type="button"
						onClick={onFly}
						className="mt-5 h-11 w-full rounded-full bg-foreground text-sm font-medium text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/40"
					>
						Fly to lead
					</button>
				</div>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
