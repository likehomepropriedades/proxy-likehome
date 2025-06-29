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
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/data/dados.csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro ao buscar CSV: ${response.status}`);

      const text = await response.text();
      res.setHeader('Content-Type', 'text/csv');
      res.status(200).send(text);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  let data;
  try {
    data = req.body;
    if (typeof data === 'string') data = JSON.parse(data);
  } catch {
    res.status(400).json({ error: 'JSON inválido' });
    return;
  }

  if (!data.token || data.token !== TOKEN_SECRETO) {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }

  try {
    if (data.action === 'upload') {
      const { imagemBase64, nomeArquivo, campo } = data;
      if (!imagemBase64 || !nomeArquivo || !campo) {
        res.status(400).json({ error: 'Dados incompletos para upload' });
        return;
      }

      const base64 = imagemBase64.split(',')[1];
      const ext = nomeArquivo.split('.').pop();
      const timestamp = Date.now();
      const path = `img/${campo}-${timestamp}.${ext}`;

      const url = await commitToGitHub(path, base64, `Atualiza imagem ${campo}`);
      res.status(200).json({ success: true, imageUrl: url });
      return;
    }

    if (data.action === 'update') {
      if (!data.csv || typeof data.csv !== 'string') {
        res.status(400).json({ error: 'CSV inválido' });
        return;
      }

      const path = `data/dados.csv`;
      const content = Buffer.from('\uFEFF' + data.csv).toString('base64');
      const sha = await commitToGitHub(path, content, 'Atualiza dados.csv', true);
      res.status(200).json({ success: true, commitSha: sha });
      return;
    }

    res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('Erro no proxy:', err);
    res.status(500).json({ error: err.message });
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
