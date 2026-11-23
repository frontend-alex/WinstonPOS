import { TooltipProvider } from "@repo/ui/components/tooltip";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { RestaurantMapProvider } from "@/features/map";
import { router } from "./router";

/**
 * Every app-wide provider, outermost first. The map context sits above the router so the map
 * and the routed panels share one Mapbox instance.
 */
export function Providers() {
	return (
		<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
			<TooltipProvider>
				<RestaurantMapProvider>
					<RouterProvider router={router} />
				</RestaurantMapProvider>
			</TooltipProvider>
		</ThemeProvider>
	);
}
