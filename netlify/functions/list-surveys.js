// Netlify Function: lists completed surveys filed by a given surveyor email.
// Reads the same GitHub repo submit-survey.js files into (surveys/<site>/<site>_<id>.json),
// walking the repo tree and filtering each record's surveyorEmail.
//
// Required environment variables (same repo as submit-survey.js):
//   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH (optional, defaults to "main")

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: cors(), body: 'Method not allowed' };
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return { statusCode: 500, headers: cors(), body: 'Server not configured: set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.' };
  }

  const email = String((event.queryStringParameters || {}).email || '').trim().toLowerCase();
  if (!email) {
    return { statusCode: 400, headers: cors(), body: 'Missing "email" query param.' };
  }

  const ghHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'fastsigns-site-survey',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    // 1. get the branch's tip commit tree sha, then walk it recursively
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: ghHeaders });
    if (!refRes.ok) throw new Error(`GitHub ${refRes.status} listing tree`);
    const tree = await refRes.json();
    const jsonFiles = (tree.tree || []).filter(t => t.type === 'blob' && t.path.startsWith('surveys/') && t.path.endsWith('.json'));

    // 2. fetch each json record (raw) and filter by surveyor email
    const results = [];
    for (const f of jsonFiles) {
      try {
        const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${f.path.split('/').map(encodeURIComponent).join('/')}`);
        if (!raw.ok) continue;
        const rec = await raw.json();
        if (String(rec.surveyorEmail || '').trim().toLowerCase() === email) {
          results.push({
            path: f.path,
            siteCode: rec.siteCode || null,
            surveyDate: rec.surveyDate || null,
            address: rec.address || null,
            submittedAt: rec.submittedAt || null,
            htmlUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${f.path.replace(/\.json$/, '.html')}`,
          });
        }
      } catch (e) { /* skip unreadable record */ }
    }

    results.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

    return {
      statusCode: 200,
      headers: { ...cors(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, surveys: results }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...cors(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(e.message || e) }),
    };
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
