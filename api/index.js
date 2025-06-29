export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'likehomepropriedades';
const REPO = 'rentabilizar';
const BRANCH = 'main';
const TOKEN_SECRETO = 'likehome_2025_admin_token';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ================================
  // GET => Lê dados.csv via GitHub API
  // ================================
  if (req.method === 'GET') {
    try {
      const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/dados.csv?ref=${BRANCH}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(`Erro ao buscar via API: ${response.status} - ${msg}`);
      }

      const json = await response.json();
      const content = Buffer.from(json.content, 'base64').toString('utf-8');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(content);
    } catch (err) {
      console.error("Erro GET via API GitHub:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ================================
  // POST => Recebe update ou upload
  // ================================
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  // ================================
  // Segurança por token secreto
  // ================================
  if (data.token !== TOKEN_SECRETO) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    // Upload de imagem (base64)
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

    // Atualiza dados.csv
    if (data.action === 'update') {
      if (!data.csv || typeof data.csv !== 'string') {
        return res.status(400).json({ error: 'CSV inválido' });
      }

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

// ================================
// Função de commit genérico
// ================================
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
    } else if (resp.status !== 404) {
      const errorText = await resp.text();
      throw new Error(`Erro GitHub ao obter SHA ${resp.status}: ${errorText}`);
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
