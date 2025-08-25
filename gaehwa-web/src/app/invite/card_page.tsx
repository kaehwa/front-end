// app/invite/[id]/card_page.tsx
import Head from "next/head";

type Props = {
  id: string;
  title?: string;
  description?: string;
  image?: string; // 공개 HTTPS 이미지 (OG 썸네일)
};

export default function CardPage({
  id,
  title = "꽃카드가 도착했어요! 🌸",
  description = "보내온 마음을 확인해보세요.",
  image = "https://gaehwa.app/static/danbi.png",
}: Props) {
  // ----- 환경설정 / URL 구성 -----
  const ORIGIN =
    process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") || "https://gaehwa.app";
  const pageUrl = `${ORIGIN}/invite/${id}`;        // 공유될 웹 주소(카카오가 스크랩)
  const deeplink = `gaehwa://card?id=${id}`;       // 앱 딥링크

  const IOS_STORE =
    process.env.NEXT_PUBLIC_IOS_STORE_URL || `${ORIGIN}/download`;
  const AND_STORE =
    process.env.NEXT_PUBLIC_ANDROID_STORE_URL || `${ORIGIN}/download`;
  const IOS_APP_ID = process.env.NEXT_PUBLIC_IOS_APP_ID || ""; // 숫자만

  // 클릭 시 딥링크 → 1.5초 내 복귀 없으면 스토어로 폴백 (인앱브라우저 대비)
  const openAppScript = `
    (function () {
      var btn = document.getElementById('open-app');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var start = Date.now();
        // iOS/Android 모두 우선 딥링크 시도
        window.location.href = '${deeplink}';
        // 1.5초 내 포커스가 유지되면(앱 미설치로 추정) 스토어 열기
        setTimeout(function () {
          var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          var store = isIOS ? '${IOS_STORE}' : '${AND_STORE}';
          // 사용자가 이미 앱으로 전환했으면 이 코드가 실행되지 않음
          if (Date.now() - start < 1600 && store) {
            window.location.href = store;
          }
        }, 1500);
      });
    })();
  `;

  return (
    <>
      <Head>
        {/* --- 기본/OG/Twitter 메타 (카카오 미리보기) --- */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={pageUrl} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />

        {/* --- 앱링크 메타(카카오/모바일 브라우저 힌트) --- */}
        <meta property="al:ios:url" content={deeplink} />
        {IOS_APP_ID && <meta property="al:ios:app_store_id" content={IOS_APP_ID} />}
        <meta property="al:ios:app_name" content="gaehwa" />
        <meta property="al:android:url" content={deeplink} />
        <meta property="al:android:package" content="app.gaehwa" />
        <meta property="al:android:app_name" content="gaehwa" />

        {/* --- iOS Smart App Banner (있으면 상단 배너 표시) --- */}
        {IOS_APP_ID && (
          <meta
            name="apple-itunes-app"
            content={`app-id=${IOS_APP_ID}, app-argument=${deeplink}`}
          />
        )}

        {/* --- 버튼 클릭시 딥링크→스토어 폴백 스크립트 --- */}
        <script
          dangerouslySetInnerHTML={{ __html: openAppScript }}
        />
      </Head>

      <main
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#FFF",
          padding: 24,
          fontFamily:
            'system-ui, -apple-system, "Noto Sans KR", sans-serif',
        }}
      >
        <div
          style={{
            width: "min(720px, 92vw)",
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* 헤더 이미지/텍스트 */}
          <div
            style={{
              display: "flex",
              gap: 24,
              padding: 24,
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="단비"
              width={120}
              height={120}
              style={{ borderRadius: 24, background: "#F1F5F9", flexShrink: 0 }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
              <p style={{ margin: "8px 0 0", color: "#374151" }}>
                {description}
              </p>
              <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 14 }}>
                카드 ID: {id}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: 24, borderTop: "1px solid #F1F3F5" }}>
            <a
              id="open-app"
              href={deeplink}
              style={{
                display: "inline-block",
                padding: "14px 18px",
                background: "#111827",
                color: "#FFF",
                borderRadius: 12,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              앱으로 열기
            </a>
            <a
              href={pageUrl}
              style={{
                marginLeft: 10,
                display: "inline-block",
                padding: "14px 18px",
                background: "#F3F4F6",
                color: "#111827",
                borderRadius: 12,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              링크 열기
            </a>

            <p style={{ marginTop: 12, color: "#6B7280", fontSize: 12 }}>
              * 카카오톡 인앱 브라우저에서는 자동 열림이 제한될 수 있어요.{" "}
              <b>‘앱으로 열기’</b>를 눌러주세요. 미설치 시 스토어로 이동합니다.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
