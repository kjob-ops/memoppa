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

function truncateTitle(title) {
  const MAX = 24;
  if (title.length <= MAX) return title;
  return title.slice(0, MAX - 1) + '…';
}

function truncateName(name) {
  const MAX = 12;
  if (!name) return '';
  if (name.length <= MAX) return name;
  return name.slice(0, MAX - 1) + '…';
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTitle = searchParams.get('title') || 'ちょっといいプロンプト、とっておこう。';
    const title = truncateTitle(rawTitle);
    const rawBody = searchParams.get('body') || '';
    const body = rawBody && rawBody.trim() !== rawTitle.trim() ? rawBody : '';
    const charCount = searchParams.get('len') || '';
    const isTruncated = searchParams.get('trunc') === '1';
    const sharedBy = truncateName(searchParams.get('by') || '');

    const fontData = await loadJapaneseFont(title + body + sharedBy + 'byつづきあり約文字0123456789');

    const titleSize = title.length > 18 ? 66 : title.length > 11 ? 78 : 94;

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            border: '28px solid #0F6E56',
            boxSizing: 'border-box',
            padding: '20px 68px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: titleSize,
              fontWeight: 700,
              color: '#0a5a45',
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
                position: 'relative',
                marginTop: 16,
                maxWidth: '1000px',
                maxHeight: 96,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  color: '#4b5563',
                  lineHeight: 1.5,
                  fontFamily: 'Noto Sans JP',
                }}
              >
                {body}
              </div>
              {isTruncated && (
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#0a5a45',
                    backgroundColor: '#e1f5ee',
                    borderRadius: '999px',
                    padding: '4px 18px',
                    fontFamily: 'Noto Sans JP',
                  }}
                >
                  つづきあり
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              marginTop: 24,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                backgroundColor: '#0F6E56',
                color: '#ffffff',
                fontSize: 30,
                fontWeight: 700,
                borderRadius: '999px',
                padding: '12px 12px 12px 36px',
                fontFamily: 'Noto Sans JP',
              }}
            >
              プロンプトを見る
              <div
                style={{
                  display: 'flex',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 150 150">
                  <path
                    d="M28,116 C28,78 30,52 46,52 C62,52 64,78 64,116 C64,78 66,52 82,52 C96,52 98,72 98,90 C102,78 108,68 118,56"
                    fill="none"
                    stroke="#0F6E56"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="46" cy="52" r="8" fill="#0F6E56" />
                </svg>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              {sharedBy && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#5f9b8a',
                    fontFamily: 'Noto Sans JP',
                  }}
                >
                  by {sharedBy}
                </div>
              )}
              {charCount && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#0F6E56',
                    fontFamily: 'Noto Sans JP',
                    marginTop: sharedBy ? 2 : 0,
                  }}
                >
                  約{charCount}文字
                </div>
              )}
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
