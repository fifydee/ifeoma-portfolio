const FORMS = ["10-K", "20-F", "40-F"];

export async function onRequestGet({ request, env }) {
  const userAgent = env.SEC_USER_AGENT;
  if (!userAgent || !/\\S+@\\S+\\.\\S+/.test(userAgent)) {
    return json({ error: "SEC connector is not configured. Set SEC_USER_AGENT to an application name and monitored contact email." }, 503);
  }
  const cikRaw = (new URL(request.url).searchParams.get("cik") || "").trim();
  if (!/^\\d{1,10}$/.test(cikRaw)) return json({ error: "Provide a valid SEC CIK." }, 400);
  const cik = cikRaw.padStart(10, "0");
  try {
    const submissionsResponse = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: { "User-Agent": userAgent, "Accept": "application/json" } });
    if (!submissionsResponse.ok) return json({ error: "SEC issuer submissions are unavailable." }, 502);
    const submissions = await submissionsResponse.json();
    const recent = submissions.filings?.recent || {};
    const index = (recent.form || []).findIndex(form => FORMS.includes(form));
    if (index < 0) return json({ error: "No recent annual SEC filing was found for this issuer." }, 404);
    const form = recent.form[index], filedAt = recent.filingDate[index], reportDate = recent.reportDate[index];
    const accession = recent.accessionNumber[index], document = recent.primaryDocument[index];
    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, "")}/${document}`;
    const filingResponse = await fetch(filingUrl, { headers: { "User-Agent": userAgent, "Accept": "text/html" } });
    if (!filingResponse.ok) return json({ error: "The latest annual filing document could not be retrieved." }, 502);
    const html = await filingResponse.text();
    const text = html
      .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
      .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
      .replace(/<(?:br|\\/p|\\/div|\\/tr|\\/li|\\/h[1-6])\\b[^>]*>/gi, ". ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/\\s+/g, " ").trim();
    const sentences = text.split(/(?<=[.!?])\\s+/).map(s => s.trim()).filter(s => s.length > 55 && s.length < 900);
    const groups = {
      businessModel: pick(sentences, /membership|warehouse|omni.?channel|e.?commerce|business model|operating segment|net sales|merchandise|subscription/i, 8),
      competition: pick(sentences, /compet(e|ition|itive)|market share|pricing|price leadership|customer experience|market position|retail landscape/i, 8),
      strategy: pick(sentences, /strategy|strategic|investment in|automation|digital|artificial intelligence|\bAI\b|technology|innovation|growth initiative/i, 10),
      risks: pick(sentences, /risk|may adversely|could adversely|uncertaint|supply chain|cyber|regulat|litigation|labor|wage|inflation|consumer demand/i, 12),
      innovation: pick(sentences, /research and development|\bR&D\b|artificial intelligence|\bAI\b|technology|automation|patent|digital platform|machine learning/i, 10)
    };
    return json({
      issuer: { cik, name: submissions.name || null },
      filing: { form, filedAt, reportDate, url: filingUrl },
      sections: groups,
      methodology: "Rule-assisted extraction of relevant passages from the issuer's latest annual SEC filing. These are source excerpts, not an AI conclusion or an exhaustive extraction of the filing.",
      limitations: ["Some filings use complex tables, inline XBRL or unusual headings; this extraction can miss context.", "The filing describes risks and strategy as stated by management; it does not independently verify those statements.", "Competitive conclusions require comparable market and peer evidence beyond one issuer filing."]
    });
  } catch {
    return json({ error: "Unable to retrieve and process the annual SEC filing." }, 502);
  }
}

function pick(sentences, pattern, limit) {
  const seen = new Set(), out = [];
  for (const sentence of sentences) {
    if (pattern.test(sentence)) {
      const key = sentence.toLowerCase().slice(0, 120);
      if (!seen.has(key)) { seen.add(key); out.push(sentence); }
      if (out.length >= limit) break;
    }
  }
  return out;
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
