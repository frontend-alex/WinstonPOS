import {
	Analytics01Icon,
	Home01Icon,
	Location01Icon,
	Message01Icon,
	Settings01Icon,
	UserGroupIcon,
} from "@animateicons/react/huge";
import type { ComponentType, Ref } from "react";

export interface IconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

export interface NavEntry {
	to: string;
	label: string;
	icon: ComponentType<{ ref?: Ref<IconHandle>; size?: number }>;
}

export const primaryNav: NavEntry[] = [
	{ to: "/overview", label: "Overview", icon: Home01Icon },
	{ to: "/leads", label: "Leads", icon: Location01Icon },
	{ to: "/contacts", label: "Contacts", icon: UserGroupIcon },
	{ to: "/reports", label: "Reports", icon: Analytics01Icon },
	{ to: "/messages", label: "Messages", icon: Message01Icon },
];

export const settingsNav: NavEntry = {
	to: "/settings",
	label: "Settings",
	icon: Settings01Icon,
};
