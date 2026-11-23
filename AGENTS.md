# Opening Radar — Agent Instructions

## Read first

1. `docs/PRD.md` — product source of truth, researched constraints, requirements, and acceptance criteria.
2. `docs/MVP.md` — current execution scope: an automatically discovering local demonstration due 24 November 2026.
3. `docs/ROADMAP.md` — the full delivery sequence and later release gates.

This project helps Winston POS discover and review upcoming restaurant openings. It is **not** a new POS application or an automated outreach product.

## Document authority

- Follow the user's latest explicit instructions.
- The PRD governs product requirements, source policy, and safety constraints.
- The MVP plan narrows what is implemented first; omitted features remain deferred, not cancelled.
- The roadmap sequences the complete product and does not authorize building every phase immediately.
- If these documents conflict, flag the conflict and resolve it explicitly. Never quietly weaken evidence, privacy, or authorization requirements to meet a deadline.
- Update the relevant plans when implementation status or an approved decision changes. Do not mark planned work as completed without verification.

## Current scope

Build the smallest trustworthy vertical slice:

`scan configured source → discover articles → retrieve permitted content → structured extraction → evidence validation → persisted candidate → human review`

- Read `docs/MVP.md` before choosing the next task.
- No application has been implemented merely because these plans exist.
- Prefer working behavior and a reproducible demonstration over visual polish.
- At least one automatic source discovery/retrieval connector is required in the one-day scope. The reviewer must not have to supply individual article URLs or pasted text.
- A “Scan now” trigger is sufficient for day one: the subsequent discovery and processing are automatic. Unattended scheduling is later scope.
- Manual import is only a developer testing/recovery aid, never a substitute for discovery or the main screen.
- Do not add broad crawling, scheduling, CRM sync, email, outreach, or production infrastructure to the one-day scope.
- A local demo without authentication must bind only to loopback and must not be deployed or shared through a public tunnel.

## Documentation locations

- `docs/PRD.md`: canonical product specification.
- `docs/MVP.md`: tomorrow's implementation order, scope cuts, and demo acceptance.
- `docs/ROADMAP.md`: complete project phases, dependencies, and release gates.
- `.firecrawl/`: ignored research cache, not application data or an approved ingestion dataset.

Keep the PRD in Markdown. Do not recreate the removed Word export or document-generation script unless requested.
