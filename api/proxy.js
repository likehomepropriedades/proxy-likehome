export default async function handler(req, res) {
  // Libera CORS para todos os métodos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Somente POST permitido além de OPTIONS
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbxYTOj-NdzndaUqi263xYb_NEBKd2IBINhmneeUm7raSnhJrEWZvjNmsrfRz2-9suLD_w/exec", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const contentType = response.headers.get("content-type");

    // Se resposta for JSON, retorna como JSON
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json(data);
    }

    // Caso contrário, trata como texto
    const text = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(text);

  } catch (err) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ error: err.message });
  }
}
