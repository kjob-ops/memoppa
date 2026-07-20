// ルートへのアクセスで ?share=xxx がある場合、index.htmlのOGPタグを
// 共有プロンプトのタイトル・内容に差し替えて返す（Xなどのクローラー対応）

async function fetchSharedPromptViaRest(env, uid, docId) {
  const projectId = env.FIREBASE_PROJECT_ID || 'pepper-c6683';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/sharedPrompts/${docId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const fields = data.fields || {};
  return {
    title: fields.title?.stringValue || '無題のプロンプト',
    content: fields.content?.stringValue || '',
  };
}

function decodeShareId(shareId) {
  try {
    const decoded = atob(shareId);
    const idx = decoded.indexOf('_');
    return { uid: decoded.slice(0, idx), docId: decoded.slice(idx + 1) };
  } catch (e) {
    return null;
  }
}

function escapeHtmlAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(str, len) {
  const plain = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const shareId = url.searchParams.get('share');

  // share パラメータがない、またはルート以外は素通り
  if (!shareId || url.pathname !== '/') {
    return next();
  }

  const decoded = decodeShareId(shareId);
  if (!decoded) return next();

  const prompt = await fetchSharedPromptViaRest(env, decoded.uid, decoded.docId);
  if (!prompt) return next();

  // 元のindex.htmlを取得してOGPタグだけ書き換える
  const originalResponse = await next();
  let html = await originalResponse.text();

  const title = `⚡ ${prompt.title} — memoppa`;
  const description = truncate(prompt.content, 100);
  const ogImageUrl = `https://memoppa.app/og?id=${encodeURIComponent(shareId)}`;

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtmlAttr(title)}</title>`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${escapeHtmlAttr(title)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${escapeHtmlAttr(description)}">`)
    .replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${ogImageUrl}">`)
    .replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${escapeHtmlAttr(title)}">`)
    .replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${escapeHtmlAttr(description)}">`)
    .replace(/<meta name="twitter:image" content=".*?">/, `<meta name="twitter:image" content="${ogImageUrl}">`)
    .replace(/<meta name="twitter:card" content=".*?">/, `<meta name="twitter:card" content="summary_large_image">`);

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}
