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
// ── 왁스 씰 리소스 ──────────────────────────────────────────────────────────
 

type Palette = {
  shell: string;
  liner: string;
  seam: string;
  card: string;
  shadow: string;
  border: string;
  bg: string;
};

const DEFAULT_PAL: Palette = {
  shell: "#D7B693",
  liner: "#E7C9A6",
  seam: "rgba(0,0,0,0.08)",
  card: "#ffffffff",
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

  flapShellWRatio?: number;
  flapShellHRatio?: number;
  linerWRatio?: number;
  linerHRatio?: number;

  cardContent?: React.ReactNode;
  targetCardW?: number;
  targetCardH?: number;
  onReachFull?: () => void;

  /** 🔸 추가: 페이드아웃 속도 제어 */
  fadeOutDuration?: number;
};

export default function EnvelopeOverlay({
  onDone,
  width = Math.min(360, Math.round(W0 * 0.82)),
  palette: palProp,
  openDuration = 5000,
  riseDuration = 900,
  holdCardMs = 500,
  /** 확대 속도 느리게 기본값 상향 */
  enlargeDuration = 1800,
  autoDismiss = false,
  paperTextureUri,
  cardTextureUri,

  flapShellWRatio = 1.0,
  flapShellHRatio = 1.0,
  linerWRatio = 0.92,
  linerHRatio = 0.52,

  cardContent,
  targetCardW,
  targetCardH,
  onReachFull,

  /** 페이드아웃 느리게 */
  fadeOutDuration = 1200,
}: Props) {
  const pal = { ...DEFAULT_PAL, ...(palProp ?? {}) };

  const envH = Math.round(width * 0.62);
  const flapH = Math.round(envH * 0.36);
  const bodyTop = Math.round(flapH * 0.52);

  const CARD_W = Math.round(width * 1);
  const CARD_H = Math.round(CARD_W * 1.3);

  const shellTriW = Math.round(width * flapShellWRatio);
  const shellTriH = Math.round(flapH * flapShellHRatio);
  const linerTriW = Math.round(width * linerWRatio);
  const linerTriH = Math.round(flapH * linerHRatio);

  const flap = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(Math.round(CARD_H * 0.6))).current;
  const cardScaleY = useRef(new Animated.Value(0.55)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const linerShow = useRef(new Animated.Value(0)).current;

  const targetScale = useMemo(() => {
    if (targetCardW && targetCardW > 0) return targetCardW / CARD_W;
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

    
    /** ✅ openDuration이 끝나자마자 카드가 즉시 보이게 */
    const showCardQuick = Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 1,
      useNativeDriver: true,
    });

    /** 카드가 올라오고 펼쳐지는 동작(이제 opacity는 건드리지 않음) */
    const riseAndUnfold = Animated.parallel([
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

    /** 확대 속도 느리게 & 부드럽게 */
    const enlarge = Animated.timing(cardScale, {
      toValue: targetScale,
      duration: enlargeDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    /** 오버레이/카드 페이드아웃도 느리게 */
    const fadeOut = Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: fadeOutDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: fadeOutDuration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    Animated.sequence([openFlap, showCardQuick, riseAndUnfold, wait, enlarge]).start(() => {
      onReachFull?.();
      if (autoDismiss) {
        fadeOut.start(() => onDone?.());
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
    fadeOutDuration,
  ]);

  const flapDegX = flap.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-180deg"],
  });

  const flapShadow = flap.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.18],
  });

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

        {/* 속지 */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: bodyTop + 1,
            height: linerTriH,
            alignItems: "center",
            opacity: linerShow,
            zIndex: 1,
          }}
        >
          <Tri w={linerTriW} h={linerTriH} color={pal.liner} dir="down" />
        </Animated.View>

        {/* 좌/우 플랩 */}
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

        {/* 접합선 */}
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

        {/* 상단 플랩 */}
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
              { translateY: -flapH / 2 },
              { rotateX: flapDegX },
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
                { scale: cardScale },
              ],
              opacity: cardOpacity,
              zIndex: 9,
              ...Platform.select({ android: { elevation: 12 } }),
            },
          ]}
        >
          <ImageBackground
            source={cardTextureUri ? { uri: cardTextureUri } : undefined}
            imageStyle={{ borderRadius: 10 }}
            style={[styles.cardFill, { backgroundColor: pal.card, borderColor: pal.border }]}
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
