# CompanyLens

CompanyLens is an independent company-comparison product preview currently staged at `/companylens/` within the Ifeoma Degge portfolio repository. A separate repository and deployment remain the intended production architecture.

## Product direction

An AI company comparison analyst for publicly listed companies worldwide, including African and Nigerian issuers. The intended report covers company profiles, financial performance, workforce and operations, competitive positioning, SWOT, innovation, risks, sources and methodology, plus a conversational analyst.

## Current implementation

- Responsive research workspace with live SEC financial retrieval for supported US issuers, report navigation, source-linked financial tables and period-aware comparison warnings.
- Financial sections show no invented sample values before source retrieval. Missing facts remain unavailable; reported values carry period, filing type and filed date.
- Print-friendly report output.
- SEC EDGAR pilot Cloudflare Pages Functions:
  - `/api/companylens/search?q=...` — SEC ticker-directory search.
  - `/api/companylens/facts?cik=...` — standard XBRL company facts and recent annual filing links.
- Typed domain contracts in `src/domain/model.ts`.
- Connector configuration and caveats in `src/server/sec-edgar.md`.

## Important limitations

The financial comparison no longer displays invented sample figures. Supported issuer facts are retrieved from SEC Company Facts and labelled as reported XBRL; calculated values are labelled as derived. The SEC makes standard-taxonomy XBRL facts available from company filings, but these facts remain filer-submitted disclosures and are not an SEC audit or guarantee of accuracy. SWOT and competitive analysis remain unpopulated until sourced evidence is available. The local analyst is not connected to a live AI model.

The SEC connector is US-only. It requires `SEC_USER_AGENT` in Cloudflare Pages Preview and Production environments, with an application name and monitored contact email. Do not hardcode this identity in client-side code.

A ticker-directory match is not conclusive exchange-listing verification. SEC XBRL concepts may omit custom tags, and each metric's latest annual observation can have a different period. No cross-company comparison should be treated as verified until period, unit, currency and issuer eligibility checks pass.

No live AI model, Nigerian/African exchange connectors, user accounts, saved reports, email delivery or server-side persistence are connected yet.

## Next engineering milestones

1. Expand the live SEC pilot beyond the initial supported issuers; strengthen unit/period validation, filing-level source links and exchange verification.
2. Add public exchange registries and filing sources for NGX and other African markets.
3. Build the secure server-side AI analyst grounded in retrieved filing evidence and the source ledger.
4. Add report persistence, secure accounts, consent-based email capture and feedback handling.
5. Create a dedicated CompanyLens repository and independent production deployment.
6. Add automated tests, accessibility checks, source integrity checks and deployment monitoring.

## Deployment

The parent repository is a static Cloudflare Pages site with Pages Functions. The preview route is `/companylens/`; the API routes are under `/api/companylens/`. The deployment has not been verified in production in this work session.

## Live SEC comparison pilot

The comparison workspace now has a **Generate comparison** action wired to the SEC Company Facts endpoint for the default US issuers Microsoft (CIK 0000789019), NVIDIA (CIK 0001045810), and Dell Technologies (CIK 0001571996). It retrieves each issuer's latest annual standard XBRL facts and updates the executive overview and financial comparison tables with reported values, filing dates, and period-end dates.

Important boundaries:
- This is a latest-available-annual comparison, not a common-calendar-period or same-fiscal-year comparison. Fiscal year ends differ; the interface displays period dates and warns users before interpreting cross-company differences.
- Values are displayed in USD billions only when the SEC unit is USD. Other units are displayed as returned.
- Operating margin is calculated only when revenue and operating income have the same period end for that issuer.
- Company profiles use basic registry metadata. Competitive position and SWOT now remain unpopulated until sourced evidence is available; the analyst remains a limited local response engine, not live AI.
- Other companies in the preview registry (currently SAP) are not yet enabled for the live comparison button. Their data should be added only after a verified SEC CIK and successful endpoint test.
- SEC Company Facts aggregates standard taxonomy facts; company-specific custom tags and disclosures may be missing. See the SEC API documentation: https://www.sec.gov/search-filings/edgar-application-programming-interfaces.

## Issuer profile and metric provenance updates

The SEC facts endpoint now also returns issuer registration metadata from the SEC submissions response: SIC code/description, reported ticker symbols and exchanges, fiscal-year-end code, and state of incorporation. The Company profiles tab presents these as filing-entity metadata and does not turn them into unsupported business or competitive claims.

Each selected metric observation includes its period start (where applicable), period end, duration, accession number, filing type, filing date, and a direct filing URL when the accession is present in the recent submissions index. When multiple observations share the same period end, selection prefers the most recently filed observation.

Observations flagged stale are visibly identified in the report and excluded from revenue/operating-income charts and derived operating-margin calculations. They remain visible in the detailed metric table with their source context so users can inspect rather than silently lose the disclosure.

The interface distinguishes SEC-reported registration details from the catalogue's broad research category. No static SWOT or competitive advantage claims are used as company-specific evidence.

## Comparison selector: SEC directory search

The comparison workspace allows users to remove any selected issuer, including reducing the selection below two while rebuilding a comparison. The Generate Comparison action remains disabled until at least two companies are selected.

The Add company control now searches the SEC company ticker directory by company name or ticker and can add returned issuer candidates directly to the comparison. Candidate records carry their CIK and are passed through the same SEC company-facts retrieval path. The directory is US SEC-focused, does not prove current exchange listing eligibility, and is not a substitute for global exchange coverage. Users should search by a distinctive company name or ticker; exchange identity still requires verification.
