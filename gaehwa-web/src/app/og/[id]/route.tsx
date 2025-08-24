// app/og/[id]/route.tsx
import { ImageResponse } from "next/server"; // "next/og" 대신 "next/server" 사용

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export async function GET(
  _: Request,
  { params }: { params: { id: string } } // params를 Promise가 아닌 객체로
) {
  const { id } = params;
  const title = "꽃카드가 도착했어요! 🌸";
  const desc = "선아님이 보낸 꽃카드를 확인해보세요.";
  const danbi = "https://gaehwa.app/static/danbi.png"; // 공개 이미지

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFF5D9",
          padding: 60
        }}
      >
        <img
          src={danbi}
          width={240}
          height={240}
          style={{ borderRadius: 32, marginRight: 40 }}
          alt="Danbi Icon" // alt 속성 추가
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 34, marginTop: 16 }}>{desc}</div>
          <div style={{ fontSize: 24, marginTop: 24, opacity: 0.7 }}>ID: {id}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
