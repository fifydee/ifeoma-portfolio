# SEC EDGAR pilot connector

Cloudflare Pages Functions are implemented in:

- `/api/companylens/search?q=...` — searches the SEC company ticker directory.
- `/api/companylens/facts?cik=...` — retrieves SEC XBRL company facts and recent annual filing links.

## Required deployment configuration

Set the Cloudflare Pages environment variable:

- `SEC_USER_AGENT`: an application name followed by a monitored contact email, e.g. `CompanyLens research contact: your-monitored-email@example.com`.

The value is intentionally not hard-coded. Do not use an invented email address. Set it in both Preview and Production environments before enabling the connector.

## Data and eligibility caveats

- This is a US SEC pilot only; it is not global coverage.
- SEC company ticker directory results are candidates. The directory does not provide exchange names in this response and is not by itself sufficient to assert current listing eligibility.
- The company-facts endpoint returns standard US-GAAP concepts where available. Custom tags, non-GAAP measures, and some company-specific disclosures may be absent.
- The latest annual observation for each concept is selected independently. Fiscal-period alignment must be checked before cross-company comparison.
- Facts are returned with concept, unit, period end, filing form and filing date. Missing concepts return null; they are never filled with estimates.
- The connector does not calculate currency conversions or claim that reporting periods are comparable.
- SEC rate limits and fair-access requirements must be respected. Add request throttling and operational monitoring before public launch.

## Next steps

1. Add authoritative exchange-listing verification (including Nasdaq/NYSE and non-US exchange registries).
2. Add concept-level unit and duration validation, amended filing handling, and comparative-period selection.
3. Add jurisdiction-specific connectors for Nigerian Exchange and other African exchanges.
4. Persist a source ledger and immutable observation history.
5. Add automated contract tests with mocked SEC responses and manual review of sample issuers.
