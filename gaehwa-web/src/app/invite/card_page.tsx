// app/invite/[id]/card_page.tsx
type Props = {
  id: string;
  title?: string;
  description?: string;
  image?: string; // 공개 HTTPS 이미지 (OG와 동일해도 OK)
};

export default function CardPage({
  id,
  title = "꽃카드가 도착했어요! 🌸",
  description = "보내온 마음을 확인해보세요.",
  image = "https://gaehwa.app/static/danbi.png",
}: Props) {
  const deeplink = `gaehwa://card?id=${id}`;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#FFF",
        padding: 24,
        fontFamily: 'system-ui, -apple-system, "Noto Sans KR", sans-serif',
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
        {/* 헤더 이미지 */}
        <div style={{ display: "flex", gap: 24, padding: 24, alignItems: "center" }}>
          {/* @ts-ignore */}
          <img
            src={image}
            alt="단비"
            width={120}
            height={120}
            style={{ borderRadius: 24, background: "#F1F5F9", flexShrink: 0 }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
            <p style={{ margin: "8px 0 0", color: "#374151" }}>{description}</p>
            <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 14 }}>카드 ID: {id}</p>
          </div>
        </div>

        {/* 본문/CTA */}
        <div style={{ padding: 24, borderTop: "1px solid #F1F3F5" }}>
          <a
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
        </div>
      </div>
    </main>
  );
}
