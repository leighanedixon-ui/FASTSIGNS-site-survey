// netlify/functions/surveys-api.js
// Lists surveys from the Fastsigns-survey GitHub repo and proxies
// individual HTML/JSON files for the dashboard viewer.
// Requires env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO,
//   GITHUB_BRANCH (optional, defaults to "main"), DASHBOARD_PASSWORD

const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-dashboard-password',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function githubGet(path, token) {
  return new Promise((resolve, reject) => {
    https.get(
      {
        hostname: 'api.github.com',
        path,
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'FASTSIGNS-Dashboard/1.0',
          Accept: 'application/vnd.github.v3+json'
        }
      },
      res => {
        let body = '';
        res.on('data', d => (body += d));
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('GitHub parse error: ' + body.slice(0, 200))); }
        });
      }
    ).on('error', reject);
  });
}

exports.handler = async function (event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // Password check
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
      body: JSON.stringify({ error: 'DASHBOARD_PASSWORD env var not configured.' })
    };
  }
  const supplied = (event.headers || {})['x-dashboard-password'];
  if (supplied !== expected) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', ...CORS },
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const token  = process.env.GITHUB_TOKEN;
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const qs     = event.queryStringParameters || {};
  const action = qs.action || 'list';

  try {
    /* ── LIST ── */
    if (action === 'list') {
      const tree = await githubGet(
        `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        token
      );

      if (tree.message) throw new Error(`GitHub: ${tree.message}`);

      const surveys = (tree.tree || [])
        .filter(
          f =>
            f.type === 'blob' &&
            f.path.startsWith('surveys/') &&
            f.path.endsWith('.json')
        )
        .map(f => {
          const parts    = f.path.split('/');
          const siteCode = parts[1] || '';
          const filename = parts[2] || '';
          const base     = filename.replace(/\.json$/, '');
          const m        = base.match(/_([0-9]{8})_([0-9]{4})$/);
          return {
            siteCode,
            filename,
            nameWithoutExt: base,
            jsonPath: f.path,
            htmlPath: f.path.replace(/\.json$/, '.html'),
            date: m ? m[1] : null,
            time: m ? m[2] : null
          };
        })
        .sort((a, b) => {
          const ak = (a.date || '') + (a.time || '');
          const bk = (b.date || '') + (b.time || '');
          return bk.localeCompare(ak);
        });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...CORS },
        body: JSON.stringify(surveys)
      };
    }

    /* ── GET HTML or JSON ── */
    if (action === 'get-html' || action === 'get-json') {
      const filePath = qs.path || '';
      if (!filePath.startsWith('surveys/')) {
        return { statusCode: 400, headers: CORS, body: 'Invalid path' };
      }

      const file = await githubGet(
        `/repos/${owner}/${repo}/contents/${filePath}`,
        token
      );

      if (file.message) throw new Error(`GitHub: ${file.message}`);

      const decoded = Buffer.from(
        (file.content || '').replace(/\n/g, ''),
        'base64'
      ).toString('utf8');

      const ct = action === 'get-html' ? 'text/html; charset=utf-8' : 'application/json';

      return {
        statusCode: 200,
        headers: { 'Content-Type': ct, ...CORS },
        body: decoded
      };
    }

    return { statusCode: 400, headers: CORS, body: 'Unknown action' };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
      body: JSON.stringify({ error: err.message })
    };
  }
};
