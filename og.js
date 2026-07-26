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

    const fontData = await loadJapaneseFont(title + body + 'memoppa プロンプトシェア専用メモ帳');

    const titleSize = title.length > 24 ? 42 : title.length > 14 ? 50 : 58;

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
            padding: '44px 56px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: titleSize,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.3,
                fontFamily: 'Noto Sans JP',
                maxWidth: '1080px',
              }}
            >
              {title}
            </div>
            {body && (
              <div
                style={{
                  display: 'flex',
                  marginTop: 16,
                  fontSize: 26,
                  color: '#eaffee',
                  fontFamily: 'Noto Sans JP',
                  maxWidth: '1020px',
                }}
              >
                {body}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                width: 36,
                height: 36,
                background: '#ffffff',
                borderRadius: 10,
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'Noto Sans JP',
              }}
            >
              memoppa
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                color: '#eaffee',
                fontFamily: 'Noto Sans JP',
                marginLeft: 2,
              }}
            >
              プロンプトシェア専用メモ帳
            </div>
          </div>
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
