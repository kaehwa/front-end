// app/invite/[id]/page.tsx
import type { Metadata } from "next";
import Redirector from "./redirector";
import CardPage from "../card_page";

type Props = { params: { id: string } };

// 임시 데이터 로더 (원하면 DB 연동으로 교체)
async function getCard(id: string) {
  return {
    id,
    title: "꽃카드가 도착했어요! 🌸",
    description: "선아님이 보낸 꽃카드를 확인해보세요.",
    image: `https://gaehwa.app/og/${id}.png`, // 1200x630 권장
  };
}

// ✅ 카카오/메신저가 읽을 OG 메타 (SSR)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCard(params.id);
  const url = `https://gaehwa.app/invite/${c.id}`;
  return {
    title: c.title,
    description: c.description,
    openGraph: {
      title: c.title,
      description: c.description,
      images: [c.image],
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: c.title,
      description: c.description,
      images: [c.image],
    },
  };
}

export default async function InvitePage({ params }: Props) {
  const c = await getCard(params.id);

  return (
    <>
      {/* 1) 앱 설치 시 자동으로 gaehwa://card?id=... 시도 (실패해도 이 페이지에 남음) */}
      <Redirector id={c.id} />
      {/* 2) 웹 폴백 UI (컴포넌트 이름: card_page.tsx) */}
      <CardPage id={c.id} title={c.title} description={c.description} image={c.image} />
    </>
  );
}
