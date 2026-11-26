const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_UA = "CompanyLens research preview contact: support@companylens.app";

export async function onRequestGet({ request, env }) {\n  const userAgent = env.SEC_USER_AGENT;\n  if (!userAgent || !/\\S+@\\S+\\.\\S+/.test(userAgent)) return json({ error: "SEC connector is not configured. Set SEC_USER_AGENT to an application name and monitored contact email before enabling requests." }, 503);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return json({ results: [], notice: "Enter at least two characters." });
  if (q.length > 80) return json({ error: "Search query is too long." }, 400);

  try {
    const cache = caches.default;
    const cacheKey = new Request(SEC_TICKERS_URL);
    let response = await cache.match(cacheKey);
    if (!response) {
      response = await fetch(SEC_TICKERS_URL, {
        headers: { "User-Agent": userAgent, "Accept": "application/json" }
      });
      if (!response.ok) return json({ error: "The SEC company ticker directory is temporarily unavailable." }, 502);
      const copy = new Response(await response.text(), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" }
      });
      await cache.put(cacheKey, copy.clone());
      response = copy;
    }
    const directory = await response.json();
    const results = Object.values(directory)
      .filter(item => String(item.ticker || "").toLowerCase().includes(q) ||
        String(item.title || "").toLowerCase().includes(q))
      .slice(0, 12)
      .map(item => ({
        cik: String(item.cik_str).padStart(10, "0"),
        ticker: item.ticker,
        name: item.title,
        jurisdiction: "United States",
        registry: "SEC company ticker directory",
        eligibility: "Ticker-directory match; verify current exchange listing and issuer status before inclusion",
        exchange: null
      }));
    return json({ results, count: results.length, coverage: "US SEC ticker directory only", asOf: new Date().toISOString() });
  } catch {
    return json({ error: "Unable to search the SEC ticker directory right now." }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
