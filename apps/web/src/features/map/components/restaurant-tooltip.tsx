import { Tooltip, TooltipContent } from "@repo/ui/components/tooltip";
import { useEffect, useReducer } from "react";
import { useRestaurantMapContext } from "../context/restaurant-map-context";
import { SIDEBAR_INSET } from "../lib/map";

// The part of the screen where the map is visible, right of the sidebar.
const visibleMap = () => ({
	x: SIDEBAR_INSET,
	y: 0,
	width: Math.max(0, window.innerWidth - SIDEBAR_INSET),
	height: window.innerHeight,
});

export function RestaurantTooltip() {
	const { selected, project, subscribeCamera } = useRestaurantMapContext();
	const [, rerender] = useReducer((frame: number) => frame + 1, 0);

	useEffect(
		() => (selected ? subscribeCamera(rerender) : undefined),
		[selected, subscribeCamera],
	);

	const projected = selected ? project(selected.id) : null;
	// A pin hidden behind the sidebar gets no tooltip.
	const point = projected && projected.x >= SIDEBAR_INSET ? projected : null;
	const anchor = point && {
		getBoundingClientRect: () =>
			DOMRect.fromRect({ ...point, width: 0, height: 0 }),
	};

	return (
		<Tooltip open={Boolean(selected && anchor)}>
			{selected && anchor && (
				<TooltipContent
					anchor={anchor}
					sideOffset={14}
					collisionBoundary={visibleMap()}
					collisionPadding={12}
					className="flex-col items-start gap-0.5 px-3.5 py-2.5"
				>
					<span className="text-sm font-semibold">
						{selected.details?.businessName ?? selected.title}
					</span>
					<span className="text-background/70">
						{selected.city ?? "City unavailable"} ·{" "}
						{selected.source === "news" ? "News" : "Official notice"}
					</span>
				</TooltipContent>
			)}
		</Tooltip>
	);
}
