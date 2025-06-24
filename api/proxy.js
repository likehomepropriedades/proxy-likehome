export default async function handler(req, res) {
  // Libera CORS para todos os métodos usados
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responde preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Aceita somente POST e GET
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    let response;

    if (req.method === "POST") {
      // Repassa POST para GAS com corpo JSON
      response = await fetch("https://script.google.com/macros/s/AKfycbxp3MKFjBnVP4wrJ4RNumQIghWDE_zIyfYMY83QjsOx/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });
    } else {
      // GET simples para GAS
      response = await fetch("https://script.google.com/macros/s/AKfycbxp3MKFjBnVP4wrJ4RNumQIghWDE_zIyfYMY83QjsOx/exec");
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json(data);
    }

    const text = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(text);

  } catch (err) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ error: err.message });
  }
}
