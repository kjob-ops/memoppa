import { ImageResponse } from 'workers-og';

// Firestore REST APIで共有プロンプトを取得（Admin SDK不要の軽量アクセス）
async function fetchSharedPrompt(env, uid, docId) {
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

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(str, len) {
  const plain = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const shareId = url.searchParams.get('id');

  let title = 'memoppa — AIプロンプトが育つメモ帳';
  let preview = 'ChatGPT・Claude・Geminiのプロンプトを登録して、タブを開いて2秒でコピー。';

  if (shareId) {
    const decoded = decodeShareId(shareId);
    if (decoded) {
      const prompt = await fetchSharedPrompt(env, decoded.uid, decoded.docId);
      if (prompt) {
        title = prompt.title;
        preview = truncate(prompt.content, 90);
      }
    }
  }

  const html = `
  <div style="display:flex;flex-direction:column;width:1200px;height:630px;background:linear-gradient(135deg,#0F6E56 0%,#0a4f3e 100%);padding:64px;font-family:sans-serif;position:relative;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:40px;">
      <div style="display:flex;align-items:center;justify-content:center;width:56px;height:56px;background:white;border-radius:14px;font-size:28px;font-weight:800;color:#0F6E56;">m</div>
      <div style="font-size:32px;font-weight:800;color:white;">memoppa</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.15);border-radius:999px;padding:10px 22px;width:fit-content;margin-bottom:28px;">
      <div style="font-size:22px;color:#FFD166;">⚡</div>
      <div style="font-size:22px;color:white;font-weight:600;">共有されたプロンプト</div>
    </div>
    <div style="display:flex;font-size:52px;font-weight:800;color:white;line-height:1.3;margin-bottom:28px;max-width:1000px;">${escapeXml(title)}</div>
    <div style="display:flex;font-size:26px;color:rgba(255,255,255,0.75);line-height:1.6;max-width:960px;">${escapeXml(preview)}</div>
    <div style="display:flex;position:absolute;bottom:56px;right:64px;font-size:22px;color:rgba(255,255,255,0.6);">memoppa.app でコピー →</div>
  </div>`;

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
  });
}
