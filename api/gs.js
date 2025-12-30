export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const GAS_URL = process.env.GAS_URL;
    if (!GAS_URL) return res.status(500).json({ ok: false, error: "GAS_URL no definida" });

    const url = new URL(GAS_URL);

    if (req.method === "GET") {
      const q = req.query || {};

      // ✅ ALIAS: si viene action y no viene accion, copia action -> accion
      if (q.action && !q.accion) q.accion = q.action;

      for (const [k, v] of Object.entries(q)) {
        if (Array.isArray(v)) url.searchParams.set(k, String(v[v.length - 1]));
        else if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    let body = null;
    if (req.method !== "GET") body = await readBody(req);

    const gasRes = await fetch(url.toString(), {
      method: req.method,
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "follow",
    });

    const text = await gasRes.text();

    // JSON normal
    const parsed = tryParseJSON(text);
    if (parsed !== null) return res.status(200).json(parsed);

    // JSONP unwrap
    const unjsonp = tryUnwrapJSONP(text);
    if (unjsonp !== null) return res.status(200).json(unjsonp);

    return res.status(200).json({
      ok: false,
      error: `Respuesta no-JSON de GAS (status ${gasRes.status})`,
      raw: text?.slice(0, 1200),
      gas_status: gasRes.status,
    });

  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({ raw: data }); }
    });
  });
}

function tryParseJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function tryUnwrapJSONP(text) {
  const s = String(text || "").trim();
  const m = s.match(/^[a-zA-Z_$][\w$]*\(([\s\S]*)\)\s*;?\s*$/);
  if (!m) return null;
  const inside = (m[1] || "").trim();
  if (!inside) return null;
  try { return JSON.parse(inside); } catch { return null; }
}
