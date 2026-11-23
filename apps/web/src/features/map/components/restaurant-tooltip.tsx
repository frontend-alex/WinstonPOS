import { Tooltip, TooltipContent } from "@repo/ui/components/tooltip";
import { useEffect, useReducer } from "react";
import { useRestaurantMapContext } from "../context/restaurant-map-context";

export function RestaurantTooltip() {
	const { selected, project, subscribeCamera } = useRestaurantMapContext();
	const [, rerender] = useReducer((frame: number) => frame + 1, 0);

	useEffect(
		() => (selected ? subscribeCamera(rerender) : undefined),
		[selected, subscribeCamera],
	);

	const point = selected ? project(selected.id) : null;
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
					className="flex-col items-start gap-0.5 px-3.5 py-2.5"
				>
					<span className="text-sm font-semibold">{selected.name}</span>
					<span className="text-background/70">
						{selected.city} · {selected.category}
					</span>
				</TooltipContent>
			)}
		</Tooltip>
	);
}
