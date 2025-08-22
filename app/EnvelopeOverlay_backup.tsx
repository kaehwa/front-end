// components/EnvelopeOverlay.tsx
import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  ImageBackground,
} from "react-native";

const { width: W0 } = Dimensions.get("window");

type Palette = {
  shell: string;   // 봉투 겉면(연한 갈색)
  liner: string;   // 속지/내피
  seam: string;    // 접합선
  card: string;    // 편지지(회색)
  shadow: string;  // 그림자 색
  border: string;  // 경계선
  bg: string;      // 오버레이 배경
};

const DEFAULT_PAL: Palette = {
  shell: "#D7B693",
  liner: "#E7C9A6",
  seam: "rgba(0,0,0,0.08)",
  card: "#D9D9D9",
  shadow: "#000",
  border: "rgba(0,0,0,0.08)",
  bg: "transparent",
};

type Props = {
  onDone?: () => void;
  width?: number;
  palette?: Partial<Palette>;
  openDuration?: number;
  riseDuration?: number;
  holdCardMs?: number;
  enlargeDuration?: number;
  autoDismiss?: boolean;
  paperTextureUri?: string;
  cardTextureUri?: string;

  // ▼ 삼각형 크기 조절
  flapShellWRatio?: number;
  flapShellHRatio?: number;
  linerWRatio?: number;
  linerHRatio?: number;

  /** ✅ 새로 추가: 카드 내용 & 목표 사이즈 & 완료 콜백 */
  cardContent?: React.ReactNode;     // 회색 사각형 대신 그릴 카드 JSX
  targetCardW?: number;              // card.tsx 카드의 실제 너비
  targetCardH?: number;              // card.tsx 카드의 실제 높이
  onReachFull?: () => void;          // 목표 사이즈 확대 완료 시 호출
};

export default function EnvelopeOverlay({
  onDone,
  width = Math.min(360, Math.round(W0 * 0.82)),
  palette: palProp,
  openDuration = 5000,
  riseDuration = 900,
  holdCardMs = 500,
  enlargeDuration = 800,
  autoDismiss = false,
  paperTextureUri,
  cardTextureUri,

  flapShellWRatio = 1.0,
  flapShellHRatio = 1.0,
  linerWRatio = 0.92,
  linerHRatio = 0.52,

  /** 새 props */
  cardContent,
  targetCardW,
  targetCardH,
  onReachFull,
}: Props) {
  const pal = { ...DEFAULT_PAL, ...(palProp ?? {}) };

  // 봉투 비율
  const envH = Math.round(width * 0.62);
  const flapH = Math.round(envH * 0.36);
  const bodyTop = Math.round(flapH * 0.52);

  // 오버레이 내부 기본 카드(미니) 기준 크기
  const CARD_W = Math.round(width * 1);
  const CARD_H = Math.round(CARD_W * 1.3);

  // 삼각형 실제 픽셀 크기
  const shellTriW = Math.round(width * flapShellWRatio);
  const shellTriH = Math.round(flapH * flapShellHRatio);
  const linerTriW = Math.round(width * linerWRatio);
  const linerTriH = Math.round(flapH * linerHRatio);

  // Anim values
  const flap = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(Math.round(CARD_H * 0.6))).current;
  const cardScaleY = useRef(new Animated.Value(0.55)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const linerShow = useRef(new Animated.Value(0)).current;

  /** 🎯 목표 스케일 계산:
   *  - 너비 기준으로 목표 스케일을 계산 (높이 비율도 맞으면 좋지만, 카드 비율이 동일하다는 가정)
   *  - targetCardW가 없으면 기존 1.15배 확대를 기본값으로 사용
   */
  const targetScale = useMemo(() => {
    if (targetCardW && targetCardW > 0) {
      return targetCardW / CARD_W;
    }
    return 1.15;
  }, [targetCardW, CARD_W]);

  useEffect(() => {
    const openFlap = Animated.parallel([
      Animated.timing(flap, {
        toValue: 1,
        duration: openDuration,
        easing: Easing.bezier(0.2, 0.9, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(linerShow, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const riseAndUnfold = Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardY, {
        toValue: -Math.round(CARD_H * 0.22),
        duration: riseDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cardScaleY, {
        toValue: 1,
        bounciness: 6,
        speed: 9,
        useNativeDriver: true,
      }),
    ]);

    const wait = Animated.delay(holdCardMs);

    const enlarge = Animated.timing(cardScale, {
      toValue: targetScale,
      duration: enlargeDuration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    const fadeOverlay = Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    Animated.sequence([openFlap, riseAndUnfold, wait, enlarge]).start(() => {
      // 목표 크기 도달 → 먼저 화면 전환(or 콜백), 필요하면 페이드아웃
      onReachFull?.();
      if (autoDismiss) {
        fadeOverlay.start(() => onDone?.());
      } else {
        onDone?.();
      }
    });
  }, [
    flap,
    linerShow,
    cardOpacity,
    cardY,
    cardScaleY,
    cardScale,
    overlayOpacity,
    onDone,
    openDuration,
    riseDuration,
    holdCardMs,
    enlargeDuration,
    autoDismiss,
    CARD_H,
    targetScale,
    onReachFull,
  ]);

  const flapDegX = flap.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-180deg"],
  });

  const flapShadow = flap.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.18],
  });

  // 삼각형 helper
  const Tri = (p: {
    w: number;
    h: number;
    color: string;
    dir: "up" | "down" | "left" | "right";
    style?: any;
  }) => {
    const { w, h, color, dir, style } = p;
    const s: any = {
      width: 0,
      height: 0,
      backgroundColor: "transparent",
      borderStyle: "solid",
    };
    if (dir === "up")
      Object.assign(s, {
        borderLeftWidth: w / 2,
        borderRightWidth: w / 2,
        borderBottomWidth: h,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: color,
      });
    if (dir === "down")
      Object.assign(s, {
        borderLeftWidth: w / 2,
        borderRightWidth: w / 2,
        borderTopWidth: h,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: color,
      });
    if (dir === "left")
      Object.assign(s, {
        borderTopWidth: h / 2,
        borderBottomWidth: h / 2,
        borderRightWidth: w,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: color,
      });
    if (dir === "right")
      Object.assign(s, {
        borderTopWidth: h / 2,
        borderBottomWidth: h / 2,
        borderLeftWidth: w,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: color,
      });
    return <View style={[s, style]} />;
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { backgroundColor: pal.bg, opacity: overlayOpacity }]}
    >
      <View style={{ width, height: envH, position: "relative" }}>
        {/* 봉투 몸통 */}
        <ImageBackground
          source={paperTextureUri ? { uri: paperTextureUri } : undefined}
          imageStyle={{ borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
          style={[
            styles.body,
            {
              top: bodyTop,
              height: envH - bodyTop,
              backgroundColor: pal.shell,
              borderColor: pal.border,
            },
          ]}
        />

        {/* 속지(내피) - 삼각형 + 빠른 등장 */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: bodyTop + 1,   // 겉지에 딱 붙어 보이지 않게 1px 내림
            height: linerTriH,
            alignItems: "center",
            opacity: linerShow,
            zIndex: 1,          // 플랩(3)보다 아래
          }}
        >
          <Tri w={linerTriW} h={linerTriH} color={pal.liner} dir="down" />
        </Animated.View>

        {/* 좌/우 플랩(사선) */}
        <Tri
          w={Math.round(width * 0.6)}
          h={Math.round(envH * 0.46)}
          color={pal.shell}
          dir="left"
          style={{ position: "absolute", left: 0, bottom: 0 }}
        />
        <Tri
          w={Math.round(width * 0.6)}
          h={Math.round(envH * 0.46)}
          color={pal.shell}
          dir="right"
          style={{ position: "absolute", right: 0, bottom: 0 }}
        />

        {/* 하단 덮개 */}
        <Tri
          w={width}
          h={Math.round(envH * 0.34)}
          color={pal.shell}
          dir="up"
          style={{ position: "absolute", left: 0, bottom: 0 }}
        />

        {/* 접합선 디테일 */}
        <View
          style={[
            styles.seam,
            {
              backgroundColor: pal.seam,
              transform: [{ rotate: "-35deg" }],
              left: Math.round(width * 0.18),
              bottom: Math.round(envH * 0.2),
              width: Math.round(width * 0.52),
            },
          ]}
        />
        <View
          style={[
            styles.seam,
            {
              backgroundColor: pal.seam,
              transform: [{ rotate: "35deg" }],
              right: Math.round(width * 0.18),
              bottom: Math.round(envH * 0.2),
              width: Math.round(width * 0.52),
            },
          ]}
        />

        {/* 상단 플랩(겉지 삼각형만) : 3D로 위로 펴짐 */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: bodyTop,
            height: flapH,
            alignItems: "center",
            zIndex: 3,
            transform: [
              { perspective: 1200 },
              { translateY: -flapH / 2 }, // 회전축을 윗변으로
              { rotateX: flapDegX },      // 0deg → -180deg
              { translateY: flapH / 2 },
            ],
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOpacity: flapShadow as any,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 10 },
              },
              android: { elevation: 6 },
            }),
          }}
        >
          <Tri w={shellTriW} h={shellTriH} color={pal.shell} dir="down" />
        </Animated.View>

        {/* 회색 편지지(맨 앞) */}
        <Animated.View
          style={[
            styles.cardBase,
            {
              width: CARD_W,
              height: CARD_H,
              left: (width - CARD_W) / 2,
              top: bodyTop - Math.round(CARD_H * 0.35),
              transform: [
                { translateY: cardY },
                { translateY: -CARD_H * 0.5 },
                { scaleY: cardScaleY },
                { translateY: CARD_H * 0.5 },
                { scale: cardScale }, // 마지막 확대
              ],
              opacity: cardOpacity,
              zIndex: 9, // ★ 항상 최상단
              ...Platform.select({ android: { elevation: 12 } }),
            },
          ]}
          
        >
          <ImageBackground
            source={cardTextureUri ? { uri: cardTextureUri } : undefined}
            imageStyle={{ borderRadius: 10 }}
            style={[
              styles.cardFill,
              { backgroundColor: pal.card, borderColor: pal.border },
            ]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  body: {
    position: "absolute",
    left: 0,
    right: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 1 },
    }),
  },
  seam: {
    position: "absolute",
    height: 1,
    opacity: 0.5,
  },
  cardBase: {
    position: "absolute",
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    }),
  },
  cardFill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
