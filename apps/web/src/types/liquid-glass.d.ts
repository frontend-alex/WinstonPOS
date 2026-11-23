import type { LiquidGlassElement } from "@zerowing/liquid-glass";
import type { CSSProperties, ReactNode, Ref } from "react";

declare module "react" {
	interface HTMLAttributes<T> {
		/** Marks a descendant of <liquid-glass> as a glass pane. */
		glass?: "";
		"glass-drag"?: "";
	}

	namespace JSX {
		interface IntrinsicElements {
			"liquid-glass": {
				ref?: Ref<LiquidGlassElement>;
				class?: string;
				style?: CSSProperties;
				children?: ReactNode;
				backdrop?: string;
				dim?: number | string;
				colors?: string;
				"inner-light"?: "";
				"reduce-motion"?: "";
			};
		}
	}
}
