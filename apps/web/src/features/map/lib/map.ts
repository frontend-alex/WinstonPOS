import type { Lead } from "@repo/contracts";
import { config } from "@repo/env/browser";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import mapboxgl from "mapbox-gl";

export const NETHERLANDS_CENTER: [number, number] = [5.2913, 52.1326];
export const NETHERLANDS_ZOOM = 6.5;
/** Width the sidebar covers on the left of the map, including its margin. */
export const SIDEBAR_INSET = 528;

const ACCENT = "#e3262f";
const AREA_RADIUS_METERS = 90;
const AREA_MIN_ZOOM = 13;
// Up to this zoom, nearby pins merge into one numbered circle.
const CLUSTER_MAX_ZOOM = 12;
// Labels only appear once pins are spread out enough to read them.
const LABEL_MIN_ZOOM = 13;

const AREAS = "restaurant-areas";
const POINTS = "restaurant-points";
const LAYERS = {
	fill: "restaurant-area-fill",
	outline: "restaurant-area-outline",
	halo: "restaurant-halo",
	dot: "restaurant-dot",
	label: "restaurant-label",
	cluster: "restaurant-cluster",
	clusterCount: "restaurant-cluster-count",
} as const;
const CLICKABLE = [LAYERS.fill, LAYERS.halo, LAYERS.dot, LAYERS.cluster];
const isCluster: mapboxgl.FilterSpecification = ["has", "point_count"];
const isSinglePin: mapboxgl.FilterSpecification = ["!", isCluster];

const isSelected = ["boolean", ["feature-state", "selected"], false];

export type LightPreset = "day" | "night";

export interface ClientPoint {
	x: number;
	y: number;
}

export interface RestaurantMapController {
	setLeads: (leads: readonly Lead[]) => void;
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
	leads: readonly Lead[];
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

function collection<G extends Geometry>(
	leads: readonly Lead[],
	geometry: (coordinates: [number, number]) => G,
): FeatureCollection<G> {
	return {
		type: "FeatureCollection",
		features: leads.flatMap<Feature<G>>((lead) =>
			lead.location
				? [
						{
							type: "Feature",
							// Permit titles are long legal names; the address reads better on a map.
							properties: {
								id: lead.id,
								label: lead.details?.businessName ?? lead.address ?? lead.title,
							},
							geometry: geometry(lead.location.coordinates),
						},
					]
				: [],
		),
	};
}

function addLayers(map: mapboxgl.Map, leads: readonly Lead[]) {
	map.addSource(AREAS, {
		type: "geojson",
		promoteId: "id",
		data: collection(leads, (coordinates) => ({
			type: "Polygon",
			coordinates: [circle(coordinates, AREA_RADIUS_METERS)],
		})),
	});
	map.addSource(POINTS, {
		type: "geojson",
		promoteId: "id",
		cluster: true,
		clusterRadius: 48,
		clusterMaxZoom: CLUSTER_MAX_ZOOM,
		data: collection(leads, (coordinates) => ({
			type: "Point",
			coordinates,
		})),
	});

	map.addLayer({
		id: LAYERS.cluster,
		type: "circle",
		source: POINTS,
		slot: "top",
		filter: isCluster,
		paint: {
			"circle-color": ACCENT,
			"circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": 3,
			"circle-emissive-strength": 1,
		},
	});
	map.addLayer({
		id: LAYERS.clusterCount,
		type: "symbol",
		source: POINTS,
		slot: "top",
		filter: isCluster,
		layout: {
			"text-field": ["get", "point_count_abbreviated"],
			"text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
			"text-size": 13,
			"text-allow-overlap": true,
		},
		paint: { "text-color": "#ffffff", "text-emissive-strength": 1 },
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
		filter: isSinglePin,
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
		filter: isSinglePin,
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
		minzoom: LABEL_MIN_ZOOM,
		filter: isSinglePin,
		layout: {
			"text-field": ["get", "label"],
			"text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
			"text-size": 13,
			"text-max-width": 14,
			"text-anchor": "top",
			"text-offset": [0, 1.8],
			// Mapbox hides labels that would collide instead of stacking them.
			"text-optional": true,
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
	leads,
	getPadding,
	onSelect,
	onCameraChange,
	lightPreset,
}: Options): RestaurantMapController {
	const map = new mapboxgl.Map({
		container,
		accessToken: config.VITE_MAPBOX_ACCESS_TOKEN,
		style: "mapbox://styles/mapbox/standard",
		config: { basemap: { lightPreset } },
		center: NETHERLANDS_CENTER,
		zoom: NETHERLANDS_ZOOM,
		cooperativeGestures: true,
	});
	map.setPadding(getPadding());
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

	// Filter the data, not the layers, so cluster counts match what's searched.
	function shownLeads() {
		if (!visibleIds) return leads;
		const ids = new Set(visibleIds);
		return leads.filter((lead) => ids.has(lead.id));
	}

	function refreshData() {
		if (!loaded) return;
		const shown = shownLeads();
		map.getSource<mapboxgl.GeoJSONSource>(AREAS)?.setData(
			collection(shown, (coordinates) => ({
				type: "Polygon",
				coordinates: [circle(coordinates, AREA_RADIUS_METERS)],
			})),
		);
		map
			.getSource<mapboxgl.GeoJSONSource>(POINTS)
			?.setData(
				collection(shown, (coordinates) => ({ type: "Point", coordinates })),
			);
	}

	function select(id: string) {
		const lead = leads.find((lead) => lead.id === id);
		if (!lead?.location) return;
		setSelectedState(id);
		map.flyTo({
			center: lead.location.coordinates,
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
		refreshData();
		if (selectedId && !ids.includes(selectedId)) deselect();
	}

	function project(id: string): ClientPoint | null {
		const lead = leads.find((lead) => lead.id === id);
		if (!lead?.location) return null;
		const { x, y } = map.project(lead.location.coordinates);
		const rect = container.getBoundingClientRect();
		if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
		return { x: rect.left + x, y: rect.top + y };
	}

	map.on("style.load", () => {
		addLayers(map, shownLeads());
		loaded = true;
		setSelectedState(selectedId);
	});
	map.on("move", onCameraChange);
	const renderListeners = new Set<(canvas: HTMLCanvasElement) => void>();
	map.on("render", () => {
		for (const listener of renderListeners) listener(map.getCanvas());
	});
	map.on("click", LAYERS.cluster, (event) => {
		const cluster = event.features?.[0];
		const clusterId = cluster?.properties?.cluster_id;
		if (typeof clusterId !== "number" || cluster?.geometry.type !== "Point") {
			return;
		}
		const center = cluster.geometry.coordinates as [number, number];
		map
			.getSource<mapboxgl.GeoJSONSource>(POINTS)
			?.getClusterExpansionZoom(clusterId, (error, zoom) => {
				if (error || zoom == null) return;
				map.easeTo({ center, zoom, duration: duration(500) });
			});
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
		setLeads(next) {
			leads = next;
			refreshData();
			if (
				selectedId &&
				!leads.some((lead) => lead.id === selectedId && lead.location)
			) {
				deselect();
			}
		},
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
