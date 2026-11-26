const SEC_UA = "CompanyLens research preview contact: support@companylens.app";
const CONCEPTS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss"],
  assets: ["Assets"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  researchAndDevelopment: ["ResearchAndDevelopmentExpense"],
  capitalExpenditure: ["PaymentsToAcquirePropertyPlantAndEquipment"]
};

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get("cik") || "").trim();
  if (!/^\\d{1,10}$/.test(raw)) return json({ error: "Provide a valid SEC CIK." }, 400);
  const cik = raw.padStart(10, "0");
  const endpoint = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

  try {
    const cache = caches.default;
    const key = new Request(endpoint);
    let response = await cache.match(key);
    if (!response) {
      response = await fetch(endpoint, { headers: { "User-Agent": SEC_UA, "Accept": "application/json" } });
      if (!response.ok) return json({ error: response.status === 404 ? "No SEC XBRL company facts were found for this CIK." : "SEC company facts are temporarily unavailable." }, response.status === 404 ? 404 : 502);
      const body = await response.text();
      const copy = new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" } });
      await cache.put(key, copy.clone());
      response = copy;
    }
    const facts = await response.json();
    const usGaap = facts.facts?.["us-gaap"] || {};
    const metrics = {};
    for (const [metric, candidates] of Object.entries(CONCEPTS)) {
      let found = null;
      for (const concept of candidates) {
        if (usGaap[concept]) { found = { concept, data: usGaap[concept] }; break; }
      }
      metrics[metric] = found ? latestAnnualObservation(found.data) : null;
      if (metrics[metric]) metrics[metric].concept = found.concept;
    }
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    let recentFilings = [];
    try {
      const subResponse = await fetch(submissionsUrl, { headers: { "User-Agent": SEC_UA, "Accept": "application/json" } });
      if (subResponse.ok) {
        const sub = await subResponse.json();
        const r = sub.filings?.recent || {};
        recentFilings = (r.form || []).map((form, i) => ({
          form,
          filingDate: r.filingDate?.[i],
          reportDate: r.reportDate?.[i],
          accessionNumber: r.accessionNumber?.[i],
          primaryDocument: r.primaryDocument?.[i]
        })).filter(x => ["10-K", "10-Q", "20-F", "40-F"].includes(x.form)).slice(0, 8)
          .map(x => ({ ...x, url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${x.accessionNumber.replace(/-/g, "")}/${x.primaryDocument}` }));
      }
    } catch { /* Filing links are optional; facts response remains useful. */ }

    return json({
      issuer: { cik, name: facts.entityName || null },
      metrics,
      recentFilings,
      source: { name: "SEC EDGAR Company Facts API", url: endpoint, retrievedAt: new Date().toISOString() },
      limitations: [
        "US SEC registrants only; this endpoint does not provide global exchange coverage.",
        "SEC XBRL company facts may omit custom tags, non-GAAP metrics and some disclosures.",
        "The latest observation for each concept may have a different fiscal period; compare periods explicitly.",
        "No exchange-listing eligibility conclusion is made by this endpoint."
      ]
    });
  } catch {
    return json({ error: "Unable to retrieve SEC company facts right now." }, 502);
  }
}

function latestAnnualObservation(concept) {
  const units = concept.units || {};
  const unitName = Object.keys(units).find(name => name === "USD") || Object.keys(units)[0];
  if (!unitName) return null;
  const observations = (units[unitName] || [])
    .filter(x => x.form === "10-K" || x.form === "20-F" || x.form === "40-F")
    .filter(x => x.end && Number.isFinite(x.val))
    .sort((a, b) => String(b.end).localeCompare(String(a.end)));
  const item = observations[0];
  if (!item) return null;
  return {
    value: item.val,
    unit: unitName,
    fiscalPeriodEnd: item.end,
    fiscalYear: item.fy ?? null,
    fiscalPeriod: item.fp ?? null,
    form: item.form,
    filedAt: item.filed || null,
    frame: item.frame || null,
    accessionNumber: item.accn || null,
    status: "reported"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
