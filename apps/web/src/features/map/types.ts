export interface Restaurant {
	readonly id: string;
	readonly name: string;
	readonly city: string;
	readonly category: string;
	readonly coordinates: readonly [number, number];
}
