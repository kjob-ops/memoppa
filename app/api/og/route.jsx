import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const FIREBASE_PROJECT = 'pepper-c6683';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

async function fetchPrompt(shareId) {
  try {
    const decoded = atob(shareId);
    const idx = decoded.indexOf('_');
    if (idx === -1) return null;
    const uid = decoded.slice(0, idx);
    const docId = decoded.slice(idx + 1);
    const res = await fetch(`${FIRESTORE_BASE}/users/${uid}/sharedPrompts/${docId}`);
    if (!res.ok) return null;
    const json = await res.json();
    const f = json.fields || {};
    const title = f.title?.stringValue || 'プロンプト';
    const raw = f.content?.stringValue || '';
    const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const preview = text.slice(0, 70) + (text.length > 70 ? '…' : '');
    return { title, preview };
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('share');

  let title = 'ちょっといいプロンプト、とっておこう。';
  let preview = 'プロンプト専用メモ帳';

  if (shareId) {
    const data = await fetchPrompt(shareId);
    if (data) {
      title = data.title;
      preview = data.preview;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0F6E56',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 88px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '6px',
            height: '100%',
            background: '#0a5a45',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '36px',
              height: '36px',
              background: '#ffffff',
              borderRadius: '9px',
              marginRight: '12px',
            }}
          />
          <div style={{ display: 'flex', color: '#FFE066', fontSize: '20px', fontWeight: 700, letterSpacing: '3px' }}>
            memoppa
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            color: '#ffffff',
            fontSize: title.length > 20 ? '48px' : '58px',
            fontWeight: 900,
            lineHeight: 1.3,
            maxWidth: '950px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            color: '#FFE066',
            fontSize: '26px',
            marginTop: '20px',
            maxWidth: '900px',
          }}
        >
          {preview}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
