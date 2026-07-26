import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

async function loadJapaneseFont(text) {
  const fontUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(
    text
  )}`;
  const cssRes = await fetch(fontUrl);
  const css = await cssRes.text();
  const fontFileUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontFileUrl) throw new Error('font url not found');
  const fontRes = await fetch(fontFileUrl);
  return await fontRes.arrayBuffer();
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'ちょっといいプロンプト、とっておこう。';
    const body = searchParams.get('body') || '';
    const charCount = searchParams.get('len') || (body ? String(body.length) : '');

    const fontData = await loadJapaneseFont(title + body + 'memoppa約文字');

    const titleSize = title.length > 24 ? 40 : title.length > 14 ? 48 : 56;

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#0F6E56',
            padding: '40px 52px',
          }}
        >
          {/* ヘッダー：ブランド表記はここ1箇所のみ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                width: 30,
                height: 30,
                background: '#ffffff',
                borderRadius: 8,
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'Noto Sans JP',
              }}
            >
              memoppa
            </div>
          </div>

          {/* タイトル + 本文 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: titleSize,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.3,
                fontFamily: 'Noto Sans JP',
                maxWidth: '1090px',
              }}
            >
              {title}
            </div>
            {body && (
              <div
                style={{
                  display: 'flex',
                  marginTop: 14,
                  fontSize: 24,
                  color: '#eaffee',
                  fontFamily: 'Noto Sans JP',
                  maxWidth: '1030px',
                }}
              >
                {body}
              </div>
            )}
          </div>

          {/* フッター：文字数のみ */}
          {charCount && (
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                color: '#eaffee',
                fontFamily: 'Noto Sans JP',
              }}
            >
              約{charCount}文字
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Noto Sans JP',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      }
    );
  } catch (e) {
    return new Response(`OG image error: ${e.message}`, { status: 500 });
  }
}
