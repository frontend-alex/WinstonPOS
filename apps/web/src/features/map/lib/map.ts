import mapboxgl from "mapbox-gl";
import { env } from "@/config/env";
import type { Restaurant } from "../types";

export const NETHERLANDS_CENTER: [number, number] = [5.2913, 52.1326];
export const NETHERLANDS_ZOOM = 6.5;

const ACCENT = "#e3262f";
const AREA_RADIUS_METERS = 90;
const AREA_MIN_ZOOM = 13;

const AREAS = "restaurant-areas";
const POINTS = "restaurant-points";
const LAYERS = {
	fill: "restaurant-area-fill",
	outline: "restaurant-area-outline",
	halo: "restaurant-halo",
	dot: "restaurant-dot",
	label: "restaurant-label",
} as const;
const CLICKABLE = [LAYERS.fill, LAYERS.halo, LAYERS.dot];

const isSelected = ["boolean", ["feature-state", "selected"], false];

export type LightPreset = "day" | "night";

export interface ClientPoint {
	x: number;
	y: number;
}

export interface RestaurantMapController {
	select: (id: string) => void;
	reset: () => void;
	setVisible: (ids: readonly string[]) => void;
	project: (id: string) => ClientPoint | null;
	/** Called after every frame Mapbox paints, while the drawing buffer can still be read. */
	onRender: (listener: (canvas: HTMLCanvasElement) => void) => () => void;
	repaint: () => void;
	setLightPreset: (preset: LightPreset) => void;
	destroy: () => void;
}

interface Options {
	container: HTMLElement;
	lightPreset: LightPreset;
	restaurants: readonly Restaurant[];
	getPadding: () => mapboxgl.PaddingOptions;
	onSelect: (id: string | null) => void;
	onCameraChange: () => void;
}

function circle([lng, lat]: readonly [number, number], radius: number) {
	const dLat = radius / 111_320;
	const dLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
	return Array.from({ length: 65 }, (_, i) => {
		const angle = (i / 64) * 2 * Math.PI;
		return [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)];
	});
}

function collection<G extends GeoJSON.Geometry>(
	restaurants: readonly Restaurant[],
	geometry: (restaurant: Restaurant) => G,
): GeoJSON.FeatureCollection<G> {
	return {
		type: "FeatureCollection",
		features: restaurants.map((restaurant) => ({
			type: "Feature",
			properties: { id: restaurant.id, name: restaurant.name },
			geometry: geometry(restaurant),
		})),
	};
}

function addLayers(map: mapboxgl.Map, restaurants: readonly Restaurant[]) {
	map.addSource(AREAS, {
		type: "geojson",
		promoteId: "id",
		data: collection(restaurants, (r) => ({
			type: "Polygon",
			coordinates: [circle(r.coordinates, AREA_RADIUS_METERS)],
		})),
	});
	map.addSource(POINTS, {
		type: "geojson",
		promoteId: "id",
		data: collection(restaurants, (r) => ({
			type: "Point",
			coordinates: [...r.coordinates],
		})),
	});

	map.addLayer({
		id: LAYERS.fill,
		type: "fill",
		source: AREAS,
		slot: "top",
		minzoom: AREA_MIN_ZOOM,
		paint: {
			"fill-color": ACCENT,
			"fill-opacity": ["case", isSelected, 0.12, 0.04],
			"fill-emissive-strength": 1,
		},
	});
	map.addLayer({
		id: LAYERS.outline,
		type: "line",
		source: AREAS,
		slot: "top",
		minzoom: AREA_MIN_ZOOM,
		layout: { "line-join": "round", "line-cap": "round" },
		paint: {
			"line-color": ACCENT,
			"line-opacity": 0.9,
			"line-dasharray": [0, 4, 3],
			"line-width": [
				"interpolate",
				["linear"],
				["zoom"],
				AREA_MIN_ZOOM,
				["case", isSelected, 3, 2],
				17,
				["case", isSelected, 6, 5],
			],
			"line-emissive-strength": 1,
		},
	});
	map.addLayer({
		id: LAYERS.halo,
		type: "circle",
		source: POINTS,
		slot: "top",
		maxzoom: AREA_MIN_ZOOM,
		paint: {
			"circle-color": ACCENT,
			"circle-opacity": ["case", isSelected, 0.3, 0.18],
			"circle-radius": [
				"interpolate",
				["linear"],
				["zoom"],
				5,
				["case", isSelected, 22, 18],
				12,
				["case", isSelected, 30, 26],
			],
			"circle-stroke-color": ACCENT,
			"circle-stroke-opacity": 0.5,
			"circle-stroke-width": 1.5,
			"circle-emissive-strength": 1,
		},
	});
	map.addLayer({
		id: LAYERS.dot,
		type: "circle",
		source: POINTS,
		slot: "top",
		maxzoom: AREA_MIN_ZOOM,
		paint: {
			"circle-color": ACCENT,
			"circle-radius": [
				"interpolate",
				["linear"],
				["zoom"],
				5,
				["case", isSelected, 10, 8],
				12,
				["case", isSelected, 13, 11],
			],
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": 3,
			"circle-emissive-strength": 1,
		},
	});
	map.addLayer({
		id: LAYERS.label,
		type: "symbol",
		source: POINTS,
		slot: "top",
		layout: {
			"text-field": ["get", "name"],
			"text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
			"text-size": ["interpolate", ["linear"], ["zoom"], 6, 13, 16, 16],
			"text-anchor": "top",
			"text-offset": [0, 1.8],
			"text-allow-overlap": true,
			"text-ignore-placement": true,
		},
		paint: {
			"text-color": "#111111",
			"text-halo-color": "#ffffff",
			"text-halo-width": 2,
			"text-emissive-strength": 1,
		},
	});
}

export function createRestaurantMap({
	container,
	restaurants,
	getPadding,
	onSelect,
	onCameraChange,
	lightPreset,
}: Options): RestaurantMapController {
	const map = new mapboxgl.Map({
		container,
		accessToken: env.MAPBOX_ACCESS_TOKEN,
		style: "mapbox://styles/mapbox/standard",
		config: { basemap: { lightPreset } },
		center: NETHERLANDS_CENTER,
		zoom: NETHERLANDS_ZOOM,
		padding: getPadding(),
		cooperativeGestures: true,
	});
	map.getCanvas().setAttribute("aria-label", "Map of leads");

	let loaded = false;
	let selectedId: string | null = null;
	let visibleIds: readonly string[] | null = null;
	const duration = (ms: number) =>
		window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;

	function setSelectedState(id: string | null) {
		if (loaded) {
			for (const source of [AREAS, POINTS]) {
				if (selectedId)
					map.setFeatureState({ source, id: selectedId }, { selected: false });
				if (id) map.setFeatureState({ source, id }, { selected: true });
			}
		}
		selectedId = id;
	}

	function applyFilter() {
		if (!loaded || !visibleIds) return;
		const filter: mapboxgl.FilterSpecification = [
			"in",
			["get", "id"],
			["literal", [...visibleIds]],
		];
		for (const layer of Object.values(LAYERS)) map.setFilter(layer, filter);
	}

	function select(id: string) {
		const restaurant = restaurants.find((r) => r.id === id);
		if (!restaurant) return;
		setSelectedState(id);
		map.flyTo({
			center: [...restaurant.coordinates],
			zoom: 16.4,
			pitch: 55,
			bearing: -20,
			duration: duration(1600),
		});
		onSelect(id);
	}

	function deselect() {
		if (!selectedId) return;
		setSelectedState(null);
		onSelect(null);
	}

	function reset() {
		deselect();
		map.flyTo({
			center: NETHERLANDS_CENTER,
			zoom: NETHERLANDS_ZOOM,
			pitch: 0,
			bearing: 0,
			duration: duration(1200),
		});
	}

	function setVisible(ids: readonly string[]) {
		visibleIds = ids;
		applyFilter();
		if (selectedId && !ids.includes(selectedId)) deselect();
	}

	function project(id: string): ClientPoint | null {
		const restaurant = restaurants.find((r) => r.id === id);
		if (!restaurant) return null;
		const { x, y } = map.project([...restaurant.coordinates]);
		const rect = container.getBoundingClientRect();
		if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
		return { x: rect.left + x, y: rect.top + y };
	}

	map.on("style.load", () => {
		addLayers(map, restaurants);
		loaded = true;
		applyFilter();
		setSelectedState(selectedId);
	});
	map.on("move", onCameraChange);
	const renderListeners = new Set<(canvas: HTMLCanvasElement) => void>();
	map.on("render", () => {
		for (const listener of renderListeners) listener(map.getCanvas());
	});
	map.on("click", CLICKABLE, (event) => {
		const id = event.features?.[0]?.properties?.id;
		if (typeof id === "string") select(id);
	});
	map.on("click", (event) => {
		if (
			loaded &&
			map.queryRenderedFeatures(event.point, { layers: CLICKABLE }).length === 0
		) {
			deselect();
		}
	});
	map.on("mouseenter", CLICKABLE, () => {
		map.getCanvas().style.cursor = "pointer";
	});
	map.on("mouseleave", CLICKABLE, () => {
		map.getCanvas().style.cursor = "";
	});

	const resizeObserver = new ResizeObserver(() => {
		map.resize();
		map.setPadding(getPadding());
	});
	resizeObserver.observe(container);

	return {
		select,
		reset,
		setVisible,
		project,
		onRender: (listener) => {
			renderListeners.add(listener);
			map.triggerRepaint();
			return () => {
				renderListeners.delete(listener);
			};
		},
		repaint: () => map.triggerRepaint(),
		setLightPreset: (preset) => {
			if (map.isStyleLoaded())
				map.setConfigProperty("basemap", "lightPreset", preset);
			else
				map.once("style.load", () =>
					map.setConfigProperty("basemap", "lightPreset", preset),
				);
		},
		destroy: () => {
			resizeObserver.disconnect();
			map.remove();
		},
	};
}
