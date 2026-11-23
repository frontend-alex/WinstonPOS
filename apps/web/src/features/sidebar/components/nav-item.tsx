import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { useRef } from "react";
import { Link, useMatch } from "react-router";
import type { IconHandle, NavEntry } from "../nav";

export function NavItem({ to, label, icon: Icon }: NavEntry) {
	const icon = useRef<IconHandle>(null);
	const active = useMatch(`${to}/*`) !== null;

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						to={to}
						aria-label={label}
						aria-current={active ? "page" : undefined}
						onMouseEnter={() => icon.current?.startAnimation()}
						onMouseLeave={() => icon.current?.stopAnimation()}
						onClick={() => icon.current?.startAnimation()}
						className={cn(
							"grid size-11 place-items-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
							active
								? "bg-foreground text-background shadow-md"
								: "text-foreground/80 hover:bg-card/70 hover:text-foreground",
						)}
					/>
				}
			>
				<Icon ref={icon} size={22} />
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={12}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}
