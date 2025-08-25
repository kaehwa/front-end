import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Image, Animated, Easing, Dimensions, 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {router , useLocalSearchParams } from "expo-router";

const { width } = Dimensions.get("window");
const BRAND_BG = "#FFF2CC";
const BRAND_ACCENT = "#FB7431";
const BRAND_MUTE = "#7A958E";

// ✅ 실제 준비 상태를 확인할 대상 URL (필요 시 변경)
const TARGET_URL = "http://localhost:8081/card?orderID=";
const BACK_SWAGGER_URL = "api";

// 로컬 GIF (경로는 프로젝트 구조에 맞게 조정)
const DANBI_GIF = require("../assets/mascot/danbi_loading.gif");

/** props
 * mode: 'promo' | 'work' | 'none'  → 단비 악세사리 테마
 */
export default function DanbiLoadingScreen({
  mode = "promo",
}: {
  mode?: "promo" | "work" | "none";
}) {
  // ──────────────────────────────────────────────
  // 1) 단비 모션(바운스+살짝 흔들림)
  // ──────────────────────────────────────────────
  const bob = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const { orderID } = useLocalSearchParams<{ orderID: string }>();
  useEffect(() => {
    const bobAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -6, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const tiltAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bobAnim.start(); tiltAnim.start();
    return () => { bobAnim.stop(); tiltAnim.stop(); };
  }, [bob, tilt]);
  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });

  // ──────────────────────────────────────────────
  // 2) 실제 준비 상태 폴링 + 진행률 표시
  //    - 준비 전: 95%까지 점진 증가(초반 빠르게 → 후반 느리게)
  //    - 준비 감지: 100%까지 채움
  // ──────────────────────────────────────────────
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0); // 0.0 ~ 1.0

  // 바 너비 애니메이션 값
  const barW = useRef(new Animated.Value(0)).current;
  const barOuterW = Math.min(480, width - 48);

  // 진행률 숫자/스니펫
  const currentPercent = Math.round(progress * 100);
  const lines = useMemo(() => {
    if (progress < 0.25) return ["단비가 꽃잎을 모으는 중이에요", "조금만 기다려 주세요."];
    if (progress < 0.5)  return ["꽃향기를 고르고 있어요", "좀 더 포근하게 만들게요."];
    if (progress < 0.75) return ["메시지와 이미지를 결합 중…", "느낌을 더 살리고 있어요."];
    return ["마무리 다듬는 중이에요", "곧 완성됩니다!"];
  }, [progress]);

  // 바 너비 애니메이션 반영
  useEffect(() => {
    Animated.timing(barW, {
      toValue: progress,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // % 증가 루프 (준비 전: 95%까지 / 준비 후: 100%까지)
  useEffect(() => {
    let mounted = true;
    const tick = () => {
      setProgress(prev => {
        if (!mounted) return prev;
        if (isReady) {
          // 준비되면 부드럽게 100%로
          return Math.min(prev + 0.05, 1);
        } else {
          // 준비 전: 초반 빠르게, 후반 느리게, 최대 0.95
          const cap = 0.95;
          const inc = prev < 0.6 ? 0.025 : prev < 0.85 ? 0.012 : 0.004;
          return Math.min(prev + inc, cap);
        }
      });
    };
    const t = setInterval(tick, 150);
    return () => { mounted = false; clearInterval(t); };
  }, [isReady]);

  // 준비 상태 폴링 (HEAD → 실패 시 GET)
  useEffect(() => {
    let active = true;

    const checkUrlReachable = async (url: string, timeoutMs = 2500) => {
      const withTimeout = (p: Promise<Response>) =>
        Promise.race([
          p,
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
        ]);

      try {
        const resHead = await withTimeout(fetch(url, { method: "HEAD" } as any));
        if (resHead && resHead.ok) return true;
      } catch (_) { /* noop */ }

      try {
        const resGet = await withTimeout(fetch(url));
        return !!resGet && resGet.ok;
      } catch (_) {
        return false;
      }
    };

    const checkReady = async (url: string) => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        return data.ready === true;
      } catch {
        return false;
      }
    };


  const loop = async () => {
    while (active && !isReady) {
      const ok = await checkUrlReachable(`${TARGET_URL}${orderID}`, 2500);
      console.log(`const ok => ${ok}`)
      if (!active) break;

      // 진행률이 충분히 찼는지 확인 (예: 95% 이상)
      if (ok && progress >= 0.95) {
        console.log(`ok && progress => ${progress}`)
        setIsReady(true);

        // 애니메이션 끝나고 100% 채우기
        setProgress(1);

        // 약간의 딜레이 후 이동 (0.3~0.5초 정도)
        setTimeout(() => {
          router.push({ pathname: "/card", params: { orderID: orderID ?? "" } });
        }, 400);

        break;
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  };


    loop();
    return () => { active = false; };
  }, [isReady]);

  return (
    <View style={styles.page}>
      {/* 헤더 (1시간 문구 제거) */}
      <View style={styles.header}>
        <Text style={styles.title}>단비가 정성껏 준비 중…</Text>
        <Text style={styles.sub}>필요한 파일을 준비하고 있어요.</Text>
      </View>

      {/* 단비 일러스트 (GIF) */}
      <Animated.View style={{ transform: [{ translateY: bob }, { rotate }] }}>
        <View >
          <Image source={DANBI_GIF} style={styles.danbi} resizeMode="contain" />
        </View>
      </Animated.View>

      {/* 진행 안내 텍스트 */}
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <Text style={styles.linePrimary}>{lines[0]}</Text>
        <Text style={styles.lineSecondary}>{lines[1]}</Text>
      </View>

      {/* 진행률 바 + % */}
      <View style={[styles.barOuter, { width: barOuterW }]}>
        <Animated.View
          style={[
            styles.barInner,
            {
              width: barW.interpolate({
                inputRange: [0, 1],
                outputRange: [0, barOuterW],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.percent}>{currentPercent}%</Text>

      {/* 마일스톤: 25/50/75/100%에서 불 켜짐 */}
      <View style={styles.milestones}>
        <Milestone label="분석" done={progress >= 0.25} />
        <Milestone label="조합" done={progress >= 0.50} />
        <Milestone label="다듬기" done={progress >= 0.75} />
        <Milestone label="완성" done={progress >= 1.00} />
      </View>
    </View>
  );
}

function Milestone({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={ms.item}>
      <View style={[ms.dot, done && ms.dotDone]} />
      <Text style={[ms.text, done && ms.textDone]}>{label}</Text>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 32, alignItems: "center", backgroundColor: BRAND_BG },
  header: { alignItems: "center", marginBottom: 8, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#222" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4 },

 
  danbi: { width: 300, height: 300 },
  emoji: { position: "absolute" },

  linePrimary: { fontSize: 16, color: "#27333a", marginBottom: 2 },
  lineSecondary: { fontSize: 13, color: BRAND_MUTE },

  barOuter: {
    height: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden", marginTop: 14,
  },
  barInner: { height: "100%", borderRadius: 999, backgroundColor: BRAND_ACCENT },

  percent: { marginTop: 6, color: "#374151", fontWeight: "700" },

  milestones: { flexDirection: "row", gap: 18, marginTop: 10 },
});

const ms = StyleSheet.create({
  item: { alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.15)" },
  dotDone: { backgroundColor: BRAND_ACCENT },
  text: { fontSize: 11, color: "#6b7280", marginTop: 4, fontWeight: "600" },
  textDone: { color: "#374151" },
});
