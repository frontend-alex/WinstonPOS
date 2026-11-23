import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { restaurants } from "../data/restaurants";
import { useRestaurantMap } from "../hooks/use-restaurant-map";

type RestaurantMapContextValue = ReturnType<typeof useRestaurantMap> & {
	query: string;
	setQuery: (query: string) => void;
	results: typeof restaurants;
};

const RestaurantMapContext = createContext<RestaurantMapContextValue | null>(
	null,
);

export function RestaurantMapProvider({ children }: { children: ReactNode }) {
	const [query, setQuery] = useState("");
	const results = useMemo(() => {
		const search = query.trim().toLocaleLowerCase();
		return restaurants.filter(({ name, city, category }) =>
			`${name} ${city} ${category}`.toLocaleLowerCase().includes(search),
		);
	}, [query]);
	const map = useRestaurantMap(results);

	return (
		<RestaurantMapContext value={{ ...map, query, setQuery, results }}>
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
