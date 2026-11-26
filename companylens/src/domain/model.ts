/** CompanyLens canonical domain contracts.
 * Keep reported observations separate from calculations and analyst interpretation.
 * Monetary values are stored in their source currency and source unit; do not convert silently.
 */
export type EvidenceStatus = "reported" | "derived" | "estimate" | "unavailable" | "demo";
export type FilingType = "10-K" | "10-Q" | "8-K" | "20-F" | "40-F" | "annual-report" | "quarterly-report" | "other";
export type ExchangeVerification = "verified" | "pending" | "not-listed" | "unknown";

export interface Listing {
  exchangeMic: string;
  exchangeName: string;
  ticker: string;
  countryCode: string;
  currency: string;
  verifiedAt: string;
  verificationSourceUrl: string;
  status: ExchangeVerification;
}

export interface Company {
  id: string;
  legalName: string;
  commonName: string;
  jurisdiction: string;
  sector?: string;
  industry?: string;
  listings: Listing[];
  registryIds: Array<{ scheme: "CIK" | "LEI" | "ISIN" | "LOCAL" | "OTHER"; value: string }>;
}

export interface FilingSource {
  id: string;
  companyId: string;
  issuerName: string;
  filingType: FilingType;
  fiscalPeriodStart?: string;
  fiscalPeriodEnd: string;
  publishedAt: string;
  retrievedAt: string;
  sourceUrl: string;
  regulatorOrExchange: string;
  accessionNumber?: string;
  contentHash?: string;
}

export interface MetricObservation {
  id: string;
  companyId: string;
  metric: string;
  value: number | null;
  unit: string;
  currency?: string;
  fiscalPeriodStart?: string;
  fiscalPeriodEnd: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  sourceId: string | null;
  sourceConcept?: string;
  status: EvidenceStatus;
  methodologyNote?: string;
}

export interface AnalysisClaim {
  id: string;
  text: string;
  classification: "reported-fact" | "derived-calculation" | "analyst-interpretation" | "hypothesis";
  supportingSourceIds: string[];
  supportingMetricIds: string[];
  confidence: "high" | "medium" | "low" | "insufficient-evidence";
  caveats: string[];
}

export interface SwotItem {
  category: "strength" | "weakness" | "opportunity" | "threat";
  text: string;
  rationale: string;
  claimId: string;
}

export interface ComparisonReport {
  id: string;
  companyIds: string[];
  generatedAt: string;
  asOfDate: string;
  reportingPeriodNotes: string[];
  metricObservations: MetricObservation[];
  claims: AnalysisClaim[];
  swotByCompany: Record<string, SwotItem[]>;
  sourceLedger: FilingSource[];
  limitations: string[];
}

export interface AnalystMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  claimIds: string[];
  sourceIds: string[];
}
