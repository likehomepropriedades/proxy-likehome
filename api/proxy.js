export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ error: "Método não permitido" });

  const GAS_URL = "https://script.google.com/macros/s/AKfycbxeZd1aI3qfUEm1_Drs5x05liUpu-eHBSIe5CEHuKH9el78SKFwoZNPXdCQ9k03bJNEkQ/exec";
  const TOKEN_SECRETO = "likehome_2025_admin_token";

  try {
    let response;

    if (req.method === "POST") {
      // Adiciona token no corpo do POST
      const dadosComToken = { ...req.body, token: TOKEN_SECRETO };

      response = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 LikeHomeProxy"
        },
        body: JSON.stringify(dadosComToken),
        redirect: "manual"
      });
    } else {
      // Adiciona token na URL do GET
      const urlComToken = `${GAS_URL}?token=${TOKEN_SECRETO}`;
      response = await fetch(urlComToken, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 LikeHomeProxy"
        },
        redirect: "manual"
      });
    }

    // Trata redirecionamento para login do Google
    if ([301, 302].includes(response.status)) {
      const location = response.headers.get("location");
      if (location && location.includes("accounts.google.com")) {
        return res.status(401).json({ error: "Redirecionado para login do Google. Verifique as permissões do GAS." });
      }
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
