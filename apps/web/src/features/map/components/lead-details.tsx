import type { Lead, LeadFact } from "@repo/contracts";
import type { ReactNode } from "react";

const FACT_LABELS: Record<LeadFact, string> = {
	businessName: "Business",
	concept: "Concept",
	openingWindow: "Opening timing",
	address: "Address",
	city: "City",
	website: "Business website",
	phone: "Business phone",
	email: "Business email",
	contactName: "Contact person",
	contactRole: "Role",
	summary: "Source excerpt",
	location: "Map coordinates",
};

function Fact({ label, children }: { label: string; children?: ReactNode }) {
	return (
		<div>
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-0.5 break-words text-sm">{children || "Unknown"}</dd>
		</div>
	);
}

export function LeadDetails({ lead }: { lead: Lead }) {
	const details = lead.details;
	return (
		<div className="space-y-5">
			<p className="text-xs text-muted-foreground">
				Candidate signal—not a verified opening. Check the evidence before
				contacting the business.
			</p>
			<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
				<Fact label="Business">{details?.businessName}</Fact>
				<Fact label="Concept">{details?.concept}</Fact>
				<Fact label="Opening timing">{details?.openingWindow}</Fact>
				<Fact label="City">{lead.city}</Fact>
				<Fact label="Address">{lead.address}</Fact>
				<Fact label="Business website">
					{details?.website && (
						<a
							href={details.website}
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2"
						>
							{details.website}
						</a>
					)}
				</Fact>
				<Fact label="Public business phone">{details?.phone}</Fact>
				<Fact label="Public business email">{details?.email}</Fact>
				<Fact label="Named business contact">{details?.contactName}</Fact>
				<Fact label="Contact role">{details?.contactRole}</Fact>
			</dl>
			<div className="space-y-1 text-sm">
				<h3 className="font-medium">Why review this?</h3>
				<p className="text-muted-foreground">
					{lead.source === "news"
						? "Opening-related coverage may indicate a venue planning its operations. Verify the opening date, operator and current POS arrangements."
						: "Hospitality permit activity may indicate an opening, a transfer or an existing business. Establish which before treating it as a sales opportunity."}
				</p>
			</div>
			{details?.summary && (
				<div className="space-y-1 text-sm">
					<h3 className="font-medium">Source excerpt</h3>
					<p className="text-muted-foreground">{details.summary}</p>
				</div>
			)}
			<div className="space-y-1 text-xs text-muted-foreground">
				<p>
					{details?.status === "enriched"
						? "Source page read"
						: "Source metadata only"}
				</p>
				{details?.note && <p>{details.note}</p>}
				{!details && <p>Rescan this source to extract sales details.</p>}
				{lead.issuingAuthority && (
					<p>Issuing authority: {lead.issuingAuthority}</p>
				)}
				<p>
					{lead.source === "news" ? "Published" : "Source last modified"}:{" "}
					{new Date(lead.publishedAt).toLocaleDateString("en-GB")}
				</p>
				<p>
					Source checked:{" "}
					{details
						? new Date(details.checkedAt).toLocaleString("en-GB")
						: "Unknown"}
				</p>
			</div>
			{Boolean(details?.evidence.length) && (
				<details className="text-sm">
					<summary className="cursor-pointer font-medium">
						Evidence ({details?.evidence.length})
					</summary>
					<ul className="mt-3 space-y-3">
						{details?.evidence.map((item) => (
							<li key={item.field} className="space-y-1">
								<p className="text-xs font-medium">{FACT_LABELS[item.field]}</p>
								<blockquote className="border-l-2 border-foreground/20 pl-3 text-muted-foreground">
									{item.quote}
								</blockquote>
								<a
									href={item.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs underline underline-offset-2"
								>
									View evidence source
								</a>
							</li>
						))}
					</ul>
				</details>
			)}
			<a
				href={lead.url}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-block text-sm font-medium underline underline-offset-2"
			>
				Read original source
			</a>
		</div>
	);
}
