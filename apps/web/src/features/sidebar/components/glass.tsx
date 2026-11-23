import "@zerowing/liquid-glass";
import { cn } from "@repo/ui/lib/utils";
import type { LiquidGlassElement } from "@zerowing/liquid-glass";
import {
	type ComponentProps,
	type CSSProperties,
	useEffect,
	useRef,
} from "react";
import { useRestaurantMapContext } from "@/features/map";
import {
	type Appearance,
	type ResolvedTheme,
	useAppearance,
	useResolvedTheme,
} from "@/features/settings";

/**
 * The private parts of <liquid-glass> this file relies on. The library only refracts its own
 * backdrop (aurora, image or video), so to bend the live Mapbox map we hand its renderer a canvas
 * holding the map pixels under the scene. Pinned to @zerowing/liquid-glass 1.1.x; re-check on upgrade.
 */
interface SceneInternals {
	renderer: {
		setSource: (
			source: TexImageSource | null | "wait",
			width?: number,
			height?: number,
		) => void;
		setAurora: (
			colors: [number, number, number][],
			base: [number, number, number],
		) => void;
	} | null;
	sceneDirty: boolean;
	animatedScene: boolean;
	/** Tracks the cursor so the glass's highlight can follow it. */
	movePointer?: (event: PointerEvent) => void;
}

const MAP_BASE: Record<ResolvedTheme, [number, number, number]> = {
	light: [0.93, 0.93, 0.92],
	dark: [0.08, 0.09, 0.12],
};

/** Copy the part of `source` that lies under `scene` into `target`, at device resolution. */
function copyUnder(
	source: HTMLCanvasElement,
	scene: HTMLElement,
	target: HTMLCanvasElement,
) {
	const from = source.getBoundingClientRect();
	const to = scene.getBoundingClientRect();
	if (!from.width || !from.height || !to.width || !to.height) return false;
	const scaleX = source.width / from.width;
	const scaleY = source.height / from.height;
	const width = Math.max(1, Math.round(to.width * scaleX));
	const height = Math.max(1, Math.round(to.height * scaleY));
	if (target.width !== width) target.width = width;
	if (target.height !== height) target.height = height;
	const context = target.getContext("2d");
	if (!context) return false;
	context.drawImage(
		source,
		(to.left - from.left) * scaleX,
		(to.top - from.top) * scaleY,
		to.width * scaleX,
		to.height * scaleY,
		0,
		0,
		width,
		height,
	);
	return true;
}

/** A <liquid-glass> scene whose backdrop is the live map behind it. */
export function GlassScene({
	className,
	style,
	children,
}: ComponentProps<"div">) {
	const sceneRef = useRef<LiquidGlassElement>(null);
	const { subscribeRender, repaint } = useRestaurantMapContext();
	const themeRef = useRef(useResolvedTheme());

	useEffect(() => {
		const element = sceneRef.current;
		if (!element) return;
		const scene = element as unknown as SceneInternals;
		const copy = document.createElement("canvas");

		// Until the map paints, show a plain map-coloured base instead of the default aurora.
		scene.renderer?.setAurora([[1, 1, 1]], MAP_BASE[themeRef.current]);
		scene.renderer?.setSource("wait");
		scene.animatedScene = false;
		// Keep the highlight in its resting place instead of following the cursor.
		scene.movePointer = () => {};

		const unsubscribe = subscribeRender((canvas) => {
			if (!scene.renderer || !copyUnder(canvas, element, copy)) return;
			scene.renderer.setSource(copy, copy.width, copy.height);
			scene.animatedScene = false;
			scene.sceneDirty = true;
		});
		const resize = new ResizeObserver(repaint);
		resize.observe(element);
		return () => {
			unsubscribe();
			resize.disconnect();
			delete scene.movePointer;
		};
	}, [subscribeRender, repaint]);

	return (
		<liquid-glass
			ref={sceneRef}
			reduce-motion=""
			class={cn("block", className)}
			style={{
				minHeight: 0,
				background: "transparent",
				color: "inherit",
				...style,
			}}
		>
			{children}
		</liquid-glass>
	);
}

type GlassLook = CSSProperties & Record<`--glass-${string}`, string | number>;

const GLASS_TINT_ALPHA: Record<ResolvedTheme, number> = {
	light: 0.22,
	dark: 0.62,
};

const GLASS_BASE: Record<ResolvedTheme, [number, number, number]> = {
	light: [255, 255, 255],
	dark: [24, 24, 27],
};

/** Turn the saved appearance into the library's --glass-* properties. */
function glassLook({ liquidity }: Appearance, theme: ResolvedTheme): GlassLook {
	const t = liquidity / 100;
	const [r, g, b] = GLASS_BASE[theme];
	return {
		// White needs far less strength than dark to read as glass rather than milk.
		"--glass-tint": `rgb(${r} ${g} ${b} / ${GLASS_TINT_ALPHA[theme]})`,
		"--glass-frost": (0.85 - 0.75 * t).toFixed(3),
		"--glass-depth": (0.4 + 1.4 * t).toFixed(3),
		"--glass-dome": (0.3 + 1.7 * t).toFixed(3),
		"--glass-ior": (1.15 + 0.45 * t).toFixed(3),
		"--glass-chroma": (0.002 + 0.014 * t).toFixed(4),
		"--glass-press": 1,
		"--glass-pull": 0,
		"--glass-shadow": 0.6,
	};
}

/** A piece of glass inside a GlassScene. Layout and border-radius come from your classes. */
export function GlassPane({
	className,
	style,
	...props
}: ComponentProps<"div">) {
	const look = glassLook(useAppearance(), useResolvedTheme());
	return (
		<div
			glass=""
			className={cn("rounded-[32px]", className)}
			style={{ ...look, ...style }}
			{...props}
		/>
	);
}
