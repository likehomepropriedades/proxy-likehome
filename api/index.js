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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const rawBody = (await buffer(req)).toString();
  const data = JSON.parse(rawBody);

  if (!data.token || data.token !== TOKEN_SECRETO) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    if (data.action === 'upload') {
      const { imagemBase64, nomeArquivo, campo } = data;
      if (!imagemBase64 || !nomeArquivo || !campo) return res.status(400).json({ error: 'Dados incompletos' });

      const base64 = imagemBase64.split(',')[1];
      const path = `img/${campo}.${nomeArquivo.split('.').pop()}`;
      const url = await commitToGitHub(path, base64, `Atualiza imagem ${campo}`);
      return res.status(200).json({ success: true, imageUrl: url });
    }

    if (data.action === 'update') {
      const path = `data/dados.csv`;
      const content = Buffer.from('\uFEFF' + data.csv).toString('base64');
      const sha = await commitToGitHub(path, content, 'Atualiza dados.csv', true);
      return res.status(200).json({ success: true, commitSha: sha });
    }

    res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function commitToGitHub(path, base64Content, message, getSha = false) {
  const apiURL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  let sha = null;
  if (getSha) {
    const resp = await fetch(apiURL, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
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
    ...(sha && { sha })
  };

  const res = await fetch(apiURL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const result = await res.json();

  if (!result.content?.path) throw new Error(`Erro ao salvar no GitHub: ${JSON.stringify(result)}`);
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${result.content.path}`;
}
