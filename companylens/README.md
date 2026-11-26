# CompanyLens

CompanyLens is an independent company-comparison product preview currently staged at `/companylens/` within the Ifeoma Degge portfolio repository. A separate repository and deployment remain the intended production architecture.

## Product direction

An AI company comparison analyst for publicly listed companies worldwide, including African and Nigerian issuers. The intended report covers company profiles, financial performance, workforce and operations, competitive positioning, SWOT, innovation, risks, sources and methodology, plus a conversational analyst.

## Current implementation

- Responsive research workspace, report navigation, illustrative charts/tables, SWOT layout and local demonstration analyst.
- Print-friendly report output.
- SEC EDGAR pilot Cloudflare Pages Functions:
  - `/api/companylens/search?q=...` — SEC ticker-directory search.
  - `/api/companylens/facts?cik=...` — standard XBRL company facts and recent annual filing links.
- Typed domain contracts in `src/domain/model.ts`.
- Connector configuration and caveats in `src/server/sec-edgar.md`.

## Important limitations

All demo metrics are illustrative placeholders, not current financial information or actual disclosures. Demo SWOT statements are generic prompts. The local analyst is not connected to a live AI model.

The SEC connector is US-only and is deliberately disabled until a monitored contact identity is configured in Cloudflare Pages as `SEC_USER_AGENT`. Set a genuine application name and monitored contact email in both Preview and Production environments; do not use an invented address. Until configured and deployed, the SEC lookup panel will return a clear configuration message.

A ticker-directory match is not conclusive exchange-listing verification. SEC XBRL concepts may omit custom tags, and each metric's latest annual observation can have a different period. No cross-company comparison should be treated as verified until period, unit, currency and issuer eligibility checks pass.

No live AI model, Nigerian/African exchange connectors, user accounts, saved reports, email delivery or server-side persistence are connected yet.

## Next engineering milestones

1. Configure and validate the SEC pilot, then add unit/period validation and exchange verification.
2. Add public exchange registries and filing sources for NGX and other African markets.
3. Build the secure server-side AI analyst grounded in retrieved filing evidence and the source ledger.
4. Add report persistence, secure accounts, consent-based email capture and feedback handling.
5. Create a dedicated CompanyLens repository and independent production deployment.
6. Add automated tests, accessibility checks, source integrity checks and deployment monitoring.

## Deployment

The parent repository is a static Cloudflare Pages site with Pages Functions. The preview route is `/companylens/`; the API routes are under `/api/companylens/`. The deployment has not been verified in production in this work session.
