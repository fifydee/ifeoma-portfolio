const CONCEPTS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  operatingIncome: ["OperatingIncomeLoss"], netIncome: ["NetIncomeLoss"], assets: ["Assets"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  researchAndDevelopment: ["ResearchAndDevelopmentExpense"],
  capitalExpenditure: ["PaymentsToAcquirePropertyPlantAndEquipment"]
};
export async function onRequestGet({ request, env }) {
  const userAgent = env.SEC_USER_AGENT;
  if (!userAgent || !/\S+@\S+\.\S+/.test(userAgent)) return json({ error: "SEC connector is not configured. Set SEC_USER_AGENT to an application name and monitored contact email before enabling requests." }, 503);
  const raw = (new URL(request.url).searchParams.get("cik") || "").trim();
  if (!/^\d{1,10}$/.test(raw)) return json({ error: "Provide a valid SEC CIK." }, 400);
  const cik = raw.padStart(10, "0"), endpoint = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  try {
    const cache = caches.default, key = new Request(endpoint);
    let response = await cache.match(key);
    if (!response) {
      response = await fetch(endpoint, { headers: { "User-Agent": userAgent, "Accept": "application/json" } });
      if (!response.ok) return json({ error: response.status === 404 ? "No SEC XBRL company facts were found for this CIK." : "SEC company facts are temporarily unavailable." }, response.status === 404 ? 404 : 502);
      const copy = new Response(await response.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" } });
      await cache.put(key, copy.clone()); response = copy;
    }
    const facts = await response.json(), usGaap = facts.facts?.["us-gaap"] || {}, metrics = {};
    for (const [metric, candidates] of Object.entries(CONCEPTS)) {
      let found = null;
      for (const concept of candidates) if (usGaap[concept]) { found = { concept, data: usGaap[concept] }; break; }
      metrics[metric] = found ? latestAnnualObservation(found.data) : null;
      if (metrics[metric]) metrics[metric].concept = found.concept;
    }
    let recentFilings = [];
    try {
      const subResponse = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: { "User-Agent": userAgent, "Accept": "application/json" } });
      if (subResponse.ok) {
        const recent = (await subResponse.json()).filings?.recent || {};
        recentFilings = (recent.form || []).map((form, i) => ({
          form, filingDate: recent.filingDate?.[i], reportDate: recent.reportDate?.[i],
          accessionNumber: recent.accessionNumber?.[i], primaryDocument: recent.primaryDocument?.[i]
        })).filter(x => ["10-K", "10-Q", "20-F", "40-F"].includes(x.form)).slice(0, 8)
          .map(x => ({ ...x, url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${x.accessionNumber.replace(/-/g, "")}/${x.primaryDocument}` }));
      }
    } catch { /* Optional filing links do not block facts. */ }
    return json({
      issuer: { cik, name: facts.entityName || null }, metrics, recentFilings,
      source: { name: "SEC EDGAR Company Facts API", url: endpoint, retrievedAt: new Date().toISOString() },
      limitations: ["US SEC registrants only; not global exchange coverage.", "Custom tags, non-GAAP metrics and some disclosures may be absent.", "Each concept's latest annual observation may have a different fiscal period.", "This endpoint does not verify exchange-listing eligibility."]
    });
  } catch { return json({ error: "Unable to retrieve SEC company facts right now." }, 502); }
}
function latestAnnualObservation(concept) {
  const units = concept.units || {}, unitName = Object.keys(units).find(x => x === "USD") || Object.keys(units)[0];
  if (!unitName) return null;
  const observations = (units[unitName] || []).filter(x =>
    ["10-K", "20-F", "40-F"].includes(x.form) && x.end && Number.isFinite(x.val)
  ).sort((a, b) => String(b.end).localeCompare(String(a.end)));
  const item = observations[0]; if (!item) return null;
  return { value: item.val, unit: unitName, fiscalPeriodEnd: item.end, fiscalYear: item.fy ?? null,
    fiscalPeriod: item.fp ?? null, form: item.form, filedAt: item.filed || null,
    frame: item.frame || null, accessionNumber: item.accn || null, status: "reported" };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
