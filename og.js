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
    const rawBody = searchParams.get('body') || '';
    const body = rawBody && rawBody.trim() !== title.trim() ? rawBody : '';
    const charCount = searchParams.get('len') || (rawBody ? String(rawBody.length) : '');

    const fontData = await loadJapaneseFont(title + body + '約文字0123456789');

    const titleSize = title.length > 22 ? 66 : title.length > 13 ? 78 : 94;

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#0F6E56',
            borderRadius: '40px',
            padding: '70px 96px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: titleSize,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
              fontFamily: 'Noto Sans JP',
              maxWidth: '1000px',
            }}
          >
            {title}
          </div>
          {body && (
            <div
              style={{
                display: 'flex',
                marginTop: 22,
                fontSize: 30,
                color: '#d8f5e8',
                fontFamily: 'Noto Sans JP',
                maxWidth: '960px',
              }}
            >
              {body}
            </div>
          )}

          {charCount && (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                left: 96,
                bottom: 60,
                fontSize: 26,
                fontWeight: 700,
                color: '#5a4600',
                backgroundColor: '#FFE066',
                borderRadius: '999px',
                padding: '14px 32px',
                fontFamily: 'Noto Sans JP',
              }}
            >
              約{charCount}文字
            </div>
          )}

          <div
            style={{
              display: 'flex',
              position: 'absolute',
              right: 96,
              bottom: 52,
              width: 76,
              height: 76,
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 150 150">
              <path
                d="M28,116 C28,78 30,52 46,52 C62,52 64,78 64,116 C64,78 66,52 82,52 C96,52 98,72 98,90 C102,78 108,68 118,56"
                fill="none"
                stroke="#ffffff"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="46" cy="52" r="6" fill="#ffffff" />
            </svg>
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
