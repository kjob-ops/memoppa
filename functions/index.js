// Cloudflare Pages Function — dynamic OGP for memoppa share URLs
// Route: / with ?share=<base64(uid_docId)>
// Injects per-prompt title + description into index.html OGP tags
// og:image stays static (SVG not supported by X card crawler)

const FIREBASE_PROJECT = 'pepper-c6683';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const shareId = url.searchParams.get('share');
  if (!shareId) return context.next();

  return handleSharePage(context, shareId, url);
}

async function fetchPromptData(shareId) {
  try {
    const decoded = atob(shareId);
    const idx = decoded.indexOf('_');
    if (idx === -1) return null;
    const uid = decoded.slice(0, idx);
    const docId = decoded.slice(idx + 1);

    const firestoreUrl = `${FIRESTORE_BASE}/users/${uid}/sharedPrompts/${docId}`;
    const res = await fetch(firestoreUrl, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;

    const json = await res.json();
    const fields = json.fields || {};

    const title = fields.title?.stringValue || 'プロンプト';
    const rawContent = fields.content?.stringValue || '';
    const content = rawContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const preview = content.slice(0, 100) + (content.length > 100 ? '…' : '');

    return { title, preview };
  } catch (e) {
    return null;
  }
}

async function handleSharePage(context, shareId, url) {
  const data = await fetchPromptData(shareId);
  if (!data) return context.next();

  const { title, preview } = data;
  const ogTitle = `${title} — memoppa`;
  const ogDesc = preview || 'プロンプトシェア専用メモ帳 memoppa';

  const indexRes = await context.next();
  const html = await indexRes.text();

  const patched = html
    .replace(/(<title>)[^<]*(<\/title>)/, `$1${esc(ogTitle)}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,   `$1${esc(ogTitle)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/,`$1${esc(ogDesc)}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/,     `$1${esc(url.href)}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,  `$1${esc(ogTitle)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,`$1${esc(ogDesc)}$2`);

  return new Response(patched, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
