export default async function handler(req, res) {
  // Libera CORS para todos os métodos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responde diretamente a requisição OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Somente POST permitido além de OPTIONS
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbyBrjGDgYLo4QWbg8iTZgOOsrixm_dAwuqLTEa4iDVsLG6hugZirgMegtnZrzmzBBqVLQ/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
