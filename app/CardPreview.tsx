// components/CardPreview.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
} from "react-native";

/** 카드 프리뷰용 Props
 * - coverUri: 포스터/커버 이미지
 * - recipientName: 하단 캡션에 들어갈 수신자 이름
 * - date: Date 또는 문자열 (기본=오늘)
 * - paperTextureUri: 카드 종이 텍스처(선택)
 * - cornerTapeSource: 모서리 테이프 이미지(선택)
 * - style: 바깥 래퍼 스타일(선택) — 보통 부모가 width/height를 정해줌
 */
type Props = {
  coverUri?: string;
  recipientName?: string;
  date?: Date | string;
  paperTextureUri?: string;
  cornerTapeSource?: ImageSourcePropType;
  style?: any;
};

/** card.tsx에서 쓰던 포맷 유지 */
function formatKoDate(d: Date | string | undefined) {
  const date = d
    ? typeof d === "string"
      ? new Date(d)
      : d
    : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}.`;
}

// 기본 리소스 (card.tsx와 동일 경로 사용)
const DEFAULT_PAPER_TEXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGXRFWHRTb2Z0d2FyZQBwYXBlci1ub2lzZS1nZW4gMS4wAAAAPElEQVQYV2NkYGD4z8DAwPCfGQYGBgYmBqYyYGBg8H8YjEGEhQm8Dg0EwYGBgYGJgYBgYGBoYH8AEgkAQt1mA1kAAAAASUVORK5CYII=";
const DEFAULT_TAPE = require("../assets/images/tape.png");

/** ✅ 가벼운 프리뷰: 부모가 width/height를 정해주면 내부가 그 비율에 맞춰 동일 레이아웃 렌더 */
export default function CardPreview({
  coverUri = "https://via.placeholder.com/1200x1600.png?text=Poster",
  recipientName = "",
  date,
  paperTextureUri,
  cornerTapeSource = DEFAULT_TAPE,
  style,
}: Props) {
  // 부모 width를 받아 포토영역 높이 = width * 0.9 로 계산 (card.tsx와 동일 로직)
  const [containerW, setContainerW] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== containerW) setContainerW(w);
  }, [containerW]);

  const photoH = useMemo(() => Math.round(containerW * 0.9), [containerW]);
  const dateText = useMemo(() => formatKoDate(date), [date]);

  return (
    <View style={[styles.cardBase, style]} onLayout={onLayout}>
      {/* 종이 질감 */}
      <Image
        source={{ uri: paperTextureUri || DEFAULT_PAPER_TEXTURE }}
        style={styles.cardPaper}
      />

      {/* 폴라로이드 묶음 (card.tsx와 동일 구조/스타일) */}
      <View style={styles.polaroidWrap}>
        <View style={styles.polaroidInner}>
          <Image
            source={{ uri: paperTextureUri || DEFAULT_PAPER_TEXTURE }}
            style={styles.paperGrain}
          />

          {/* 포토/커버 영역 (영상 대신 정적 이미지만) */}
          <View
            style={[
              styles.photoArea,
              photoH ? { height: photoH } : null, // 부모 width 파악 전엔 빈값
            ]}
          >
            <Image source={{ uri: coverUri }} style={styles.photoFill} />
          </View>

          {/* 하단 캡션 */}
          <View style={styles.bottomCaption}>
            <Text style={styles.bottomCaptionText}>
              {dateText} 사랑하는 {recipientName}에게
            </Text>
          </View>

          {/* 모서리 테이프 4개 (동일 스타일) */}
          <Image source={cornerTapeSource} style={[styles.cornerTape, styles.tapeTL]} />
          <Image source={cornerTapeSource} style={[styles.cornerTape, styles.tapeTR]} />
          <Image source={cornerTapeSource} style={[styles.cornerTape, styles.tapeBL]} />
          <Image source={cornerTapeSource} style={[styles.cornerTape, styles.tapeBR]} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- styles: card.tsx와 동일 톤 ---------------- */
const styles = StyleSheet.create({
  cardBase: {
    position: "relative",
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    padding: 16,
  },
  cardPaper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.13,
    resizeMode: "repeat" as any,
    pointerEvents: "none",
  },

  polaroidWrap: {
    width: "100%",
    alignItems: "center",
    paddingTop: 8,
  },
  polaroidInner: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  paperGrain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
    resizeMode: "repeat" as any,
    pointerEvents: "none",
    borderRadius: 6,
  },
  photoArea: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    borderWidth: 1,
    borderColor: "#FFF",
    transform: [{ rotate: "-0.2deg" }],
    // 높이는 onLayout 이후 photoH로 주입
  },
  photoFill: { width: "100%", height: "100%" },

  bottomCaption: { marginTop: 12, paddingVertical: 10, alignItems: "center" },
  bottomCaptionText: { fontSize: 14, color: "#000" },

  cornerTape: {
    position: "absolute",
    width: 300,
    height: 200,
    resizeMode: "contain",
    zIndex: 0,
    opacity: 0.95,
  },
  tapeTL: { top: -60, left: -150, transform: [{ rotate: "-15deg" }] },
  tapeTR: { top: -90, right: -120, transform: [{ rotate: "75deg" }] },
  tapeBL: { bottom: -90, left: -150, transform: [{ rotate: "75deg" }] },
  tapeBR: { bottom: -110, right: -135, transform: [{ rotate: "-15deg" }] },
});
