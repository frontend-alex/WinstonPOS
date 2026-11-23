import { Button } from "@repo/ui/components/button";
import { useRestaurantMapContext } from "../context/restaurant-map-context";
import { RestaurantTooltip } from "./restaurant-tooltip";

export function RestaurantMap() {
	const { containerRef, reset } = useRestaurantMapContext();

	return (
		<>
			{/* size-full: Mapbox's unlayered `.mapboxgl-map { position: relative }` beats Tailwind's `absolute`. */}
			<div ref={containerRef} className="size-full" />
			<Button
				type="button"
				variant="outline"
				size="lg"
				className="absolute top-4 right-4 z-10 rounded-full bg-background shadow-sm"
				onClick={reset}
			>
				Reset view
			</Button>
			<RestaurantTooltip />
		</>
	);
}
