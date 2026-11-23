import { Target01Icon } from "@animateicons/react/huge";
import { Outlet } from "react-router";
import { primaryNav, settingsNav } from "../nav";
import { GlassPane, GlassScene } from "./glass";
import { NavItem } from "./nav-item";

export function AppSidebar() {
	return (
		<GlassScene className="absolute inset-y-4 left-4 z-10 w-[30rem] rounded-[32px]">
			<GlassPane className="flex h-full overflow-hidden text-foreground">
				<div className="flex w-20 shrink-0 flex-col items-center gap-2 py-6">
					<span className="mb-10 grid size-12 place-items-center rounded-full bg-foreground text-background shadow-md">
						<Target01Icon size={22} />
					</span>
					<nav aria-label="Main" className="flex flex-col gap-3">
						{primaryNav.map((entry) => (
							<NavItem key={entry.to} {...entry} />
						))}
					</nav>
					<div className="mt-auto">
						<NavItem {...settingsNav} />
					</div>
				</div>
				<section className="flex min-w-0 flex-1 flex-col">
					<Outlet />
				</section>
			</GlassPane>
		</GlassScene>
	);
}
