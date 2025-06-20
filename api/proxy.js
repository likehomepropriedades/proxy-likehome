export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbyBrjGDgYLo4QWbg8iTZgOOsrixm_dAwuqLTEa4iDVsLG6hugZirgMegtnZrzmzBBqVLQ/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: err.message });
  }
}
