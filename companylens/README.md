# CompanyLens

CompanyLens is an independent company-comparison product preview hosted at `/companylens/` within the Ifeoma Degge portfolio repository.

## Product direction

CompanyLens is designed as an AI company comparison analyst for publicly listed companies worldwide, including African and Nigerian issuers. The intended report covers company profiles, financial performance, workforce and operations, competitive positioning, SWOT, innovation, risks, sources and methodology, plus a conversational analyst.

## Current preview status

This first committed preview is a static, browser-only prototype. It demonstrates the product identity, comparison workspace, report navigation, sample charts and tables, SWOT layout, and a local demonstration analyst.

**Important:** all numeric sample values are illustrative placeholders, not current financial information or actual disclosures for the named issuers. SWOT statements are generic demonstration prompts. No live filing retrieval, external AI model, email delivery, user accounts, saved reports or server-side persistence are connected. The interface discloses these limitations.

## Next engineering milestones

1. Create a dedicated CompanyLens GitHub repository and independent deployment.
2. Add a typed backend data model for issuers, listings, filings, metric observations, evidence and analyst claims.
3. Implement public-company registry and exchange-aware ticker search.
4. Integrate SEC EDGAR/XBRL for US-listed issuers and add jurisdiction-specific exchange/regulator sources for other markets.
5. Persist source provenance: filing URL, filing type, period, currency, units, publication date and retrieval date.
6. Add secure server-side AI analysis grounded only in retrieved evidence; keep API keys out of browser code.
7. Add report persistence, PDF generation, consent-based email capture and feedback submission with clear privacy controls.
8. Test data accuracy, period alignment, source links, responsive behavior, accessibility and deployment.

## Deployment

The parent repository is a plain static HTML/CSS/JavaScript Cloudflare Pages site connected to GitHub branch `main`. The CompanyLens preview is therefore available under the `companylens/` path after the parent Pages deployment completes. This is a staging arrangement, not yet the independent deployment planned for the finished product.
