import { Slider } from "@animate-ui/react/primitives/base-ui/slider";
import { ToggleGroup } from "@animate-ui/react/primitives/base-ui/toggle-group";
import { MonitorIcon, MoonIcon, SunIcon } from "@animateicons/react/lucide";
import { Toggle } from "@base-ui/react/toggle";
import { type ComponentType, type ReactNode, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { resetAppearance, setAppearance, useAppearance } from "../store";

type ThemePreference = ReturnType<typeof useTheme>["theme"];

import { Button } from "@repo/ui/components/button";

interface IconHandle {
	startAnimation: () => void;
	stopAnimation: () => void;
}

const THEMES: {
	value: ThemePreference;
	label: string;
	icon: ComponentType<{ ref?: React.Ref<IconHandle>; size?: number }>;
}[] = [
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
	{ value: "system", label: "System", icon: MonitorIcon },
];

function liquidityLabel(value: number) {
	if (value < 25) return "Frosted";
	if (value < 60) return "Fluid";
	if (value < 85) return "Liquid";
	return "Molten";
}

export function SettingsPanel() {
	const appearance = useAppearance();
	const { theme, setTheme } = useTheme();

	return (
		<>
			<header className="px-6 pt-7 pb-4">
				<h1 className="text-2xl font-normal tracking-tight">Settings</h1>
			</header>
			<div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pt-1 pb-6">
				<Section title="Theme">
					<ToggleGroup
						aria-label="Theme"
						value={[theme]}
						onValueChange={([next]) => {
							if (next) setTheme(next as ThemePreference);
						}}
						className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
					>
						{THEMES.map((theme) => (
							<ThemeOption key={theme.value} {...theme} />
						))}
					</ToggleGroup>
				</Section>

				<Section
					title="Liquid"
					aside={
						<span className="text-sm text-muted-foreground tabular-nums">
							{liquidityLabel(appearance.liquidity)} · {appearance.liquidity}
						</span>
					}
				>
					<Slider.Root
						value={appearance.liquidity}
						min={0}
						max={100}
						step={1}
						onValueChange={(value) =>
							setAppearance({
								liquidity: Array.isArray(value) ? value[0] : value,
							})
						}
					>
						<Slider.Control className="flex h-6 w-full touch-none items-center select-none">
							<Slider.Track className="relative h-2 w-full rounded-full bg-muted">
								<Slider.Indicator className="rounded-full bg-foreground" />
								<Slider.Thumb
									aria-label="Liquid amount"
									className="size-5 rounded-full border-2 border-foreground bg-card shadow-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
								/>
							</Slider.Track>
						</Slider.Control>
					</Slider.Root>
					<div className="mt-2 flex justify-between text-xs text-muted-foreground">
						<span>Frosted</span>
						<span>Molten</span>
					</div>
				</Section>

				<Button
					onClick={() => {
						resetAppearance();
						setTheme("system");
					}}
					className="w-full p-5"
				>
					Reset to defaults
				</Button>
			</div>
		</>
	);
}

function Section({
	title,
	aside,
	children,
}: {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="rounded-3xl bg-card/85 p-5 shadow-sm">
			<div className="mb-4 flex items-baseline justify-between gap-3">
				<h2 className="text-[15px] font-medium">{title}</h2>
				{aside}
			</div>
			{children}
		</section>
	);
}

function ThemeOption({ value, label, icon: Icon }: (typeof THEMES)[number]) {
	const icon = useRef<IconHandle>(null);

	return (
		<Toggle
			value={value}
			onMouseEnter={() => icon.current?.startAnimation()}
			onMouseLeave={() => icon.current?.stopAnimation()}
			className="flex h-9 items-center justify-center gap-1.5 rounded-full text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
		>
			<Icon ref={icon} size={16} />
			{label}
		</Toggle>
	);
}
