const CONCEPTS = {
  revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss"],
  assets: ["Assets"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  researchAndDevelopment: ["ResearchAndDevelopmentExpense"],
  capitalExpenditure: ["PaymentsToAcquireProductiveAssets", "PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquirePropertyPlantAndEquipmentAndIntangibleAssets"]
};
const INSTANT_METRICS = new Set(["assets"]);

export async function onRequestGet({ request, env }) {
  const userAgent = env.SEC_USER_AGENT;
  if (!userAgent || !/\S+@\S+\.\S+/.test(userAgent)) {
    return json({ error: "SEC connector is not configured. Set SEC_USER_AGENT to an application name and monitored contact email before enabling requests." }, 503);
  }
  const raw = (new URL(request.url).searchParams.get("cik") || "").trim();
  if (!/^\d{1,10}$/.test(raw)) return json({ error: "Provide a valid SEC CIK." }, 400);
  const cik = raw.padStart(10, "0");
  const endpoint = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  try {
    const cache = caches.default;
    const key = new Request(endpoint);
    let response = await cache.match(key);
    if (!response) {
      response = await fetch(endpoint, { headers: { "User-Agent": userAgent, "Accept": "application/json" } });
      if (!response.ok) return json({ error: response.status === 404 ? "No SEC XBRL company facts were found for this CIK." : "SEC company facts are temporarily unavailable." }, response.status === 404 ? 404 : 502);
      const copy = new Response(await response.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" } });
      await cache.put(key, copy.clone());
      response = copy;
    }
    const facts = await response.json();
    const usGaap = facts.facts?.["us-gaap"] || {};
    const metrics = {};
    for (const [metric, candidates] of Object.entries(CONCEPTS)) {
      const observations = candidates
        .filter(concept => usGaap[concept])
        .map(concept => latestAnnualObservation(usGaap[concept], metric, concept))
        .filter(Boolean);
      observations.sort((a, b) =>
        String(b.fiscalPeriodEnd).localeCompare(String(a.fiscalPeriodEnd)) ||
        candidates.indexOf(a.concept) - candidates.indexOf(b.concept)
      );
      metrics[metric] = observations[0] || null;
    }

    let recentFilings = [];
    try {
      const subResponse = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: { "User-Agent": userAgent, "Accept": "application/json" } });
      if (subResponse.ok) {
        const recent = (await subResponse.json()).filings?.recent || {};
        recentFilings = (recent.form || []).map((form, i) => ({
          form, filingDate: recent.filingDate?.[i], reportDate: recent.reportDate?.[i],
          accessionNumber: recent.accessionNumber?.[i], primaryDocument: recent.primaryDocument?.[i]
        })).filter(x => ["10-K", "20-F", "40-F"].includes(x.form)).slice(0, 8)
          .map(x => ({ ...x, url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${x.accessionNumber.replace(/-/g, "")}/${x.primaryDocument}` }));
      }
    } catch { /* Optional filing links do not block facts. */ }

    const filingByAccession = new Map(recentFilings.map(filing => [filing.accessionNumber, filing]));
    for (const value of Object.values(metrics)) {
      if (value) {
        const filing = filingByAccession.get(value.accessionNumber);
        value.filingUrl = filing?.url || null;
      }
    }

    const latestAnnualEnd = Object.values(metrics).filter(Boolean)
      .map(x => x.fiscalPeriodEnd).sort().at(-1) || null;
    for (const value of Object.values(metrics)) {
      if (!value || !latestAnnualEnd) continue;
      const ageDays = (Date.parse(latestAnnualEnd) - Date.parse(value.fiscalPeriodEnd)) / 86400000;
      if (ageDays > 430) {
        value.status = "stale";
        value.warning = "Latest available annual observation is more than 430 days older than the newest annual observation returned for this issuer.";
      }
    }

    return json({
      issuer: { cik, name: facts.entityName || null },
      metrics,
      recentFilings,
      source: { name: "SEC EDGAR Company Facts API", url: endpoint, retrievedAt: new Date().toISOString() },
      limitations: [
        "US SEC registrants only; not global exchange coverage.",
        "Custom tags, non-GAAP metrics and some disclosures may be absent.",
        "Annual flow metrics are filtered to approximately 300–400 day durations; instant balance-sheet metrics are selected separately.",
        "A metric more than 430 days older than the newest returned annual observation is flagged stale and must not be used as a current-period comparison.",
        "Different fiscal year ends and currencies still require explicit alignment before comparison.",
        "This endpoint does not verify exchange-listing eligibility."
      ]
    });
  } catch {
    return json({ error: "Unable to retrieve SEC company facts right now." }, 502);
  }
}

function latestAnnualObservation(concept, metric, conceptName) {
  const units = concept.units || {};
  const unitNames = Object.keys(units);
  const preferredUnit = unitNames.includes("USD") ? "USD" : unitNames[0];
  if (!preferredUnit) return null;
  const instant = INSTANT_METRICS.has(metric);
  const observations = unitNames.flatMap(unitName =>
    (units[unitName] || []).filter(item => {
      if (!["10-K", "20-F", "40-F"].includes(item.form) || !item.end || !Number.isFinite(item.val)) return false;
      if (instant) return !item.start;
      if (!item.start) return false;
      const days = (Date.parse(item.end) - Date.parse(item.start)) / 86400000;
      return days >= 300 && days <= 400;
    }).map(item => ({ item, unitName }))
  ).sort((a, b) => String(b.item.end).localeCompare(String(a.item.end)));
  const selected = observations.find(x => x.unitName === preferredUnit) || observations[0];
  if (!selected) return null;
  const item = selected.item;
  return {
    value: item.val,
    unit: selected.unitName,
    fiscalPeriodStart: item.start || null,
    fiscalPeriodEnd: item.end,
    durationDays: item.start ? Math.round((Date.parse(item.end) - Date.parse(item.start)) / 86400000) : null,
    fiscalYear: item.fy ?? null,
    fiscalPeriod: item.fp ?? null,
    form: item.form,
    filedAt: item.filed || null,
    frame: item.frame || null,
    accessionNumber: item.accn || null,
    status: "reported",
    concept: conceptName
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
