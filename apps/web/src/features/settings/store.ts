import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";

export type ResolvedTheme = "light" | "dark";

export interface Appearance {
	/** 0 = calm, frosted glass; 100 = thick, strongly refracting liquid. */
	liquidity: number;
}

export const DEFAULT_APPEARANCE: Appearance = {
	liquidity: 50,
};

const STORAGE_KEY = "opening-radar:appearance";

function parse(raw: string | null): Appearance {
	if (!raw) return DEFAULT_APPEARANCE;
	try {
		const value = JSON.parse(raw) as Partial<Appearance>;
		return {
			liquidity:
				typeof value.liquidity === "number" && Number.isFinite(value.liquidity)
					? Math.min(100, Math.max(0, value.liquidity))
					: DEFAULT_APPEARANCE.liquidity,
		};
	} catch {
		return DEFAULT_APPEARANCE;
	}
}

function read(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

// Storage can be unavailable (private windows, blocked site data): keep working in memory.
let raw = read();
let snapshot = parse(raw);
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export function setAppearance(patch: Partial<Appearance>) {
	snapshot = { ...snapshot, ...patch };
	raw = JSON.stringify(snapshot);
	try {
		localStorage.setItem(STORAGE_KEY, raw);
	} catch {
		// Not persisted, but still applied for this visit.
	}
	emit();
}

export function resetAppearance() {
	snapshot = DEFAULT_APPEARANCE;
	raw = null;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Nothing stored to remove.
	}
	emit();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	// Keep other tabs in step.
	const onStorage = (event: StorageEvent) => {
		if (event.key !== STORAGE_KEY && event.key !== null) return;
		const next = read();
		if (next === raw) return;
		raw = next;
		snapshot = parse(next);
		listener();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", onStorage);
	};
}

export function useAppearance() {
	return useSyncExternalStore(subscribe, () => snapshot);
}

/**
 * The theme actually on screen. The shadcn ThemeProvider owns the choice and the `.dark` class;
 * this resolves "system" the same way it does, for the glass and the map.
 */
export function useResolvedTheme(): ResolvedTheme {
	const { theme } = useTheme();
	if (theme !== "system") return theme;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}
