import type { Lead } from "@repo/contracts";
import { toast } from "@repo/ui/components/sonner";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { getLeads } from "../api/map";
import { useRestaurantMap } from "../hooks/use-restaurant-map";

type RestaurantMapContextValue = ReturnType<typeof useRestaurantMap> & {
	query: string;
	setQuery: (query: string) => void;
	results: Lead[];
	loading: boolean;
	error: string | null;
	refresh: (signal?: AbortSignal) => Promise<void>;
};

const RestaurantMapContext = createContext<RestaurantMapContextValue | null>(
	null,
);

export function RestaurantMapProvider({ children }: { children: ReactNode }) {
	const [leads, setLeads] = useState<Lead[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	const refresh = useCallback(async (signal?: AbortSignal) => {
		setLoading(true);
		setError(null);
		try {
			const leads = await getLeads(signal);
			if (!signal?.aborted) setLeads(leads);
		} catch {
			if (!signal?.aborted) {
				setError("Could not load leads.");
				toast.error("Could not load leads", {
					id: "load-leads", // one toast, however often loading fails
					description: "Check that the API is running.",
				});
			}
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void refresh(controller.signal);
		return () => controller.abort();
	}, [refresh]);

	const results = useMemo(() => {
		const search = query.trim().toLocaleLowerCase();
		return leads.filter(({ title, city, source, address, details }) =>
			`${title} ${city ?? ""} ${source} ${address ?? ""} ${details?.businessName ?? ""} ${details?.concept ?? ""} ${details?.contactName ?? ""}`
				.toLocaleLowerCase()
				.includes(search),
		);
	}, [leads, query]);
	const map = useRestaurantMap(leads, results);

	return (
		<RestaurantMapContext
			value={{ ...map, query, setQuery, results, loading, error, refresh }}
		>
			{children}
		</RestaurantMapContext>
	);
}

export function useRestaurantMapContext() {
	const context = useContext(RestaurantMapContext);
	if (!context) {
		throw new Error(
			"useRestaurantMapContext must be used inside RestaurantMapProvider",
		);
	}
	return context;
}
