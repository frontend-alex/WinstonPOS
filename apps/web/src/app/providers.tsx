import { Toaster } from "@repo/ui/components/sonner";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { RouterProvider } from "react-router";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
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
			<ThemedToaster />
		</ThemeProvider>
	);
}

// Status and error messages, bottom center, in the user's chosen theme.
function ThemedToaster() {
	const { theme } = useTheme();
	return <Toaster position="bottom-center" theme={theme} />;
}
