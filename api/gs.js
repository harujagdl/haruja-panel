export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const GAS_URL = process.env.GAS_URL;
    if (!GAS_URL) {
      return res.status(500).json({ ok: false, error: "GAS_URL no definida" });
    }

    const url = new URL(GAS_URL);

    // Pasar query params en GET
    if (req.method === "GET") {
      Object.entries(req.query || {}).forEach(([k, v]) =>
        url.searchParams.set(k, v)
      );
    }

    let body = null;
    if (req.method !== "GET") {
      body = await readBody(req);
    }

    const gasRes = await fetch(url.toString(), {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "follow",
    });

    const text = await gasRes.text();

    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      return res.status(200).json({ ok: true, raw: text });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({ raw: data });
      }
    });
  });
}
