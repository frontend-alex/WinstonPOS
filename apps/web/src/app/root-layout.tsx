import { RestaurantMap } from "@/features/map";
import { AppSidebar } from "@/features/sidebar";

export function RootLayout() {
	return (
		<main className="fixed inset-0 overflow-hidden bg-muted">
			<RestaurantMap />
			<AppSidebar />
		</main>
	);
}
