import { useCallback, useEffect, useRef, useState } from "react";
import { useResolvedTheme } from "@/features/settings";
import { restaurants } from "../data/restaurants";
import {
	createRestaurantMap,
	type LightPreset,
	type RestaurantMapController,
} from "../lib/map";
import type { Restaurant } from "../types";

export function useRestaurantMap(visible: readonly Restaurant[]) {
	const containerRef = useRef<HTMLDivElement>(null);
	const controllerRef = useRef<RestaurantMapController | null>(null);
	const cameraListeners = useRef(new Set<() => void>());
	const renderListeners = useRef(
		new Set<(canvas: HTMLCanvasElement) => void>(),
	);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const lightPreset: LightPreset =
		useResolvedTheme() === "dark" ? "night" : "day";
	const initialPreset = useRef(lightPreset);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const controller = createRestaurantMap({
			container,
			restaurants,
			lightPreset: initialPreset.current,
			onSelect: setSelectedId,
			onCameraChange: () => {
				for (const listener of cameraListeners.current) listener();
			},
			getPadding: () => ({ left: 528, right: 32, top: 40, bottom: 40 }),
		});
		controllerRef.current = controller;
		const stopRender = controller.onRender((canvas) => {
			for (const listener of renderListeners.current) listener(canvas);
		});
		return () => {
			stopRender();
			controller.destroy();
			controllerRef.current = null;
		};
	}, []);

	useEffect(() => {
		controllerRef.current?.setLightPreset(lightPreset);
	}, [lightPreset]);

	useEffect(() => {
		controllerRef.current?.setVisible(visible.map(({ id }) => id));
	}, [visible]);

	const select = useCallback(
		(id: string) => controllerRef.current?.select(id),
		[],
	);
	const reset = useCallback(() => controllerRef.current?.reset(), []);
	const project = useCallback(
		(id: string) => controllerRef.current?.project(id) ?? null,
		[],
	);
	const subscribeCamera = useCallback((listener: () => void) => {
		cameraListeners.current.add(listener);
		return () => {
			cameraListeners.current.delete(listener);
		};
	}, []);

	const subscribeRender = useCallback(
		(listener: (canvas: HTMLCanvasElement) => void) => {
			renderListeners.current.add(listener);
			controllerRef.current?.repaint();
			return () => {
				renderListeners.current.delete(listener);
			};
		},
		[],
	);
	const repaint = useCallback(() => controllerRef.current?.repaint(), []);

	return {
		containerRef,
		selected: restaurants.find(({ id }) => id === selectedId),
		select,
		reset,
		project,
		subscribeCamera,
		subscribeRender,
		repaint,
	};
}
