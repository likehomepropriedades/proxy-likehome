import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'likehomepropriedades';
const REPO = 'rentabilizar';
const BRANCH = 'main';
const TOKEN_SECRETO = 'likehome_2025_admin_token';

export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // ou coloque seu domínio específico
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Resposta rápida para preflight
  }

  if (req.method === 'GET') {
    try {
      const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/data/dados.csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro ao buscar CSV: ${response.status}`);

      const text = await response.text();
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(text);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  let rawBody;
  try {
    rawBody = (await buffer(req)).toString();
  } catch {
    return res.status(400).json({ error: 'Erro ao ler o corpo da requisição' });
  }

  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (!data.token || data.token !== TOKEN_SECRETO) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    console.log(`[${new Date().toISOString()}] Ação: ${data.action}`);

    if (data.action === 'upload') {
      const { imagemBase64, nomeArquivo, campo } = data;
      if (!imagemBase64 || !nomeArquivo || !campo) {
        return res.status(400).json({ error: 'Dados incompletos para upload' });
      }

      const base64 = imagemBase64.split(',')[1];
      const ext = nomeArquivo.split('.').pop();
      const timestamp = Date.now();
      const path = `img/${campo}-${timestamp}.${ext}`;

      const url = await commitToGitHub(path, base64, `Atualiza imagem ${campo}`);
      return res.status(200).json({ success: true, imageUrl: url });
    }

    if (data.action === 'update') {
      const path = `data/dados.csv`;
      const content = Buffer.from('\uFEFF' + data.csv).toString('base64');
      const sha = await commitToGitHub(path, content, 'Atualiza dados.csv', true);
      return res.status(200).json({ success: true, commitSha: sha });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('Erro no proxy:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function commitToGitHub(path, base64Content, message, getSha = false) {
  const apiURL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  let sha = null;
  if (getSha) {
    const resp = await fetch(apiURL, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    if (resp.ok) {
      const json = await resp.json();
      sha = json.sha;
    }
  }

  const body = {
    message,
    content: base64Content,
    branch: BRANCH,
    ...(sha && { sha }),
  };

  const res = await fetch(apiURL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro GitHub ${res.status}: ${errorText}`);
  }

  const result = await res.json();
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${result.content.path}`;
}
