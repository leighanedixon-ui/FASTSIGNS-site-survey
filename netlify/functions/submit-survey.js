// Netlify Function: receives a completed survey and commits it to a GitHub repo.
// Files written:  surveys/<SITE>/<SITE>_<date>_<time>.html  (self-contained, photos baked in)
//                 surveys/<SITE>/<SITE>_<date>_<time>.json  (machine-readable record)
//
// Required environment variables (set in Netlify → Site settings → Environment variables):
//   GITHUB_TOKEN   fine-grained PAT with Contents: Read & write on the surveys repo
//   GITHUB_OWNER   GitHub user or org that owns the surveys repo  (e.g. "fastsigns-everett")
//   GITHUB_REPO    the surveys repo name                          (e.g. "site-surveys")
//   GITHUB_BRANCH  optional, defaults to "main"
//
// Optional (confirmation email to the surveyor when filing):
//   RESEND_API_KEY  API key from resend.com
//   RESEND_FROM     verified sender, e.g. "Site Survey <survey@yourdomain.com>"
//
// Recommendation: point GITHUB_REPO at a SEPARATE repo from the one hosting this site,
// so filing a survey never triggers a website rebuild.

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: 'Method not allowed' };
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return { statusCode: 500, headers: cors(), body: 'Server not configured: set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.' };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors(), body: 'Bad JSON body' }; }

  const { base, html, json, surveyorEmail, surveyor, address, site } = payload;
  if (!base || !html) {
    return { statusCode: 400, headers: cors(), body: 'Missing "base" or "html".' };
  }  // sanitise the path: only the surveys/ tree, no traversal
  const safeBase = String(base).replace(/\.\.+/g, '').replace(/^\/+/, '');
  if (!safeBase.startsWith('surveys/')) {
    return { statusCode: 400, headers: cors(), body: 'Path must be under surveys/.' };
  }

  async function getSha(path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'fastsigns-site-survey',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.status === 200) { const j = await res.json(); return j.sha; }
    return null; // 404 → new file
  }

  async function commit(path, content, message) {
    const sha = await getSha(path); // upsert: include sha when the file already exists
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'fastsigns-site-survey',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message,
        branch,
        content: Buffer.from(content, 'utf8').toString('base64'),
        ...(sha ? { sha } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub ${res.status}: ${t.slice(0, 300)}`);
    }
    return res.json();
  }

  try {
    const result = await commit(`${safeBase}.html`, html, `Site survey: ${safeBase}`);
    if (json) await commit(`${safeBase}.json`, json, `Site survey data: ${safeBase}`);
    const link = result && result.content && result.content.html_url;

    // Best-effort confirmation email to the surveyor — never blocks filing on failure.
    try { await sendConfirmationEmail({ surveyorEmail, surveyor, address, site: site || safeBase }, link); } catch (e) { /* swallow */ }

    return {
      statusCode: 200,
      headers: { ...cors(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, path: `${safeBase}.html`, url: link || null }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...cors(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(e.message || e) }),
    };
  }
}

// Sends a plain confirmation email via Resend (https://resend.com), if configured.
// Required env vars: RESEND_API_KEY, RESEND_FROM (a verified sender, e.g. "Site Survey <survey@yourdomain.com>").
async function sendConfirmationEmail(payload, recordLink) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = payload.surveyorEmail;
  if (!apiKey || !from || !to) return;

  const site = payload.site || 'site';
  const subject = `Site Survey filed — ${site}`;
  const text = [
    `Your site survey has been filed.`,
    ``,
    `Site: ${site}`,
    payload.address ? `Address: ${payload.address}` : null,
    payload.surveyor ? `Surveyor: ${payload.surveyor}` : null,
    recordLink ? `Record: ${recordLink}` : null,
    ``,
    `You can look up all your filed surveys any time from the Site Survey app using this email address.`,
  ].filter(Boolean).join('\n');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
