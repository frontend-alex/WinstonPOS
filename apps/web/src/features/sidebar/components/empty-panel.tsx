export function EmptyPanel({ title }: { title: string }) {
	return (
		<>
			<h1 className="px-6 pt-7 text-2xl font-normal tracking-tight">{title}</h1>
			<p className="px-6 pt-2 text-sm text-muted-foreground">
				Nothing here yet.
			</p>
		</>
	);
}
