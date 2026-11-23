import type { Restaurant } from "../types";

export const restaurants: readonly Restaurant[] = [
	{
		id: "demo-tilburg",
		name: "Tilburg Table",
		city: "Tilburg",
		category: "Casual dining",
		coordinates: [5.0913, 51.5555],
	},
	{
		id: "demo-amsterdam",
		name: "Canal Kitchen",
		city: "Amsterdam",
		category: "Restaurant",
		coordinates: [4.8952, 52.3702],
	},
	{
		id: "demo-rotterdam",
		name: "Harbour House",
		city: "Rotterdam",
		category: "Bistro",
		coordinates: [4.4777, 51.9244],
	},
	{
		id: "demo-utrecht",
		name: "The Green Table",
		city: "Utrecht",
		category: "Restaurant",
		coordinates: [5.1214, 52.0907],
	},
	{
		id: "demo-eindhoven",
		name: "Studio Lunch",
		city: "Eindhoven",
		category: "Lunchroom",
		coordinates: [5.4697, 51.4416],
	},
	{
		id: "demo-groningen",
		name: "Northern Kitchen",
		city: "Groningen",
		category: "Casual dining",
		coordinates: [6.5665, 53.2194],
	},
];
