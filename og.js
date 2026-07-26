import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

// Noto Sans JP (Google Fonts) を実行時に取得してフォント埋め込み
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

    // タイトルが長い場合はフォントサイズを自動で少し縮める
    const titleSize = title.length > 20 ? 48 : title.length > 12 ? 56 : 64;

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
            padding: '56px 64px',
          }}
        >
          {/* タイトル + 本文ブロック（上寄せ） */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: titleSize,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.35,
                fontFamily: 'Noto Sans JP',
                maxWidth: '1050px',
              }}
            >
              {title}
            </div>
            {body && (
              <div
                style={{
                  display: 'flex',
                  marginTop: 20,
                  fontSize: 28,
                  color: '#eaffee',
                  fontFamily: 'Noto Sans JP',
                  maxWidth: '1000px',
                }}
              >
                {body}
              </div>
            )}
          </div>

          {/* フッター：ロゴ + タグライン（下寄せ） */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 44,
                height: 44,
                background: '#ffffff',
                borderRadius: 12,
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: 30,
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
                fontSize: 20,
                color: '#eaffee',
                fontFamily: 'Noto Sans JP',
                marginLeft: 4,
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
