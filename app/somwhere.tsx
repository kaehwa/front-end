// app/somewhere.tsx (예시)
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import EnvelopeOverlay from "../app/EnvelopeOverlay";
import CardPreview from "../app/CardPreview"; // card.tsx와 동일 스타일, 경량 프리뷰

// card.tsx에서 쓰는 실제 카드 사이즈(동일 상수로 export 해두면 더 좋음)
export const CARD_W = 340; // 실제 card.tsx의 값
export const CARD_H = Math.round(CARD_W * 0.9); // 실제 비율 사용

export default function Intro() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F5EFE3" }}>
      {/* 배경 등... */}

      <EnvelopeOverlay
        // ▼ 오버레이 안에서 보일 카드 내용 (프리뷰)
        cardContent={<CardPreview /* props */ />}
        // ▼ 최종 목표 카드 사이즈 (card.tsx의 카드 실제 크기)
        targetCardW={CARD_W}
        targetCardH={CARD_H}
        // 확대 완료 → 장면 전환
        onReachFull={() => {
          router.replace({
            pathname: "/card",
            params: {
              // 필요한 쿼리/파라미터 넘기기
              id: "123",
              letter: encodeURIComponent("사랑하는 사람에게,\n..."),
            },
          });
        }}
        // 기타 애니메이션 옵션
        openDuration={1200}
        riseDuration={800}
        holdCardMs={300}
        enlargeDuration={640}
        autoDismiss={false} // 화면 전환으로 처리할 거라면 false가 자연스러움
        palette={{ bg: "transparent" }}
      />
    </View>
  );
}
