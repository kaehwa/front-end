import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Image, Pressable, Animated, Easing, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BRAND_BG = "#FFF2CC";
const BRAND_ACCENT = "#FB7431";
const BRAND_MUTE = "#7A958E";

/** props
 * expectedReadyAt: 결과 준비 예정 시각(ISO). 없으면 60분 카운트다운.
 * mode: 'promo' | 'work' | 'none'  → 단비 악세사리 테마
 */
export default function DanbiLoadingScreen({
  expectedReadyAt,
  mode = "promo",
  onCancel,
}: {
  expectedReadyAt?: string;
  mode?: "promo" | "work" | "none";
  onCancel?: () => void;
}) {
  // 1) 타이머/프로그레스 --------------------------
  const now = Date.now();
  const defaultEnd = now + 60 * 60 * 1000; // 기본 60분
  const endTs = useMemo(() => {
    const t = expectedReadyAt ? Date.parse(expectedReadyAt) : defaultEnd;
    return Number.isFinite(t) ? t : defaultEnd;
  }, [expectedReadyAt]);

  const [nowTs, setNowTs] = useState(now);
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remainMs = Math.max(endTs - nowTs, 0);
  const progress = 1 - remainMs / (endTs - now); // 0~1
  const { mm, ss } = msToMMSS(remainMs);

  // 2) 단비 모션(바운스+살짝 흔들림) ----------------
  const bob = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
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

  // 3) 진행 바 애니메이션 --------------------------
  const barW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barW, { toValue: progress, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, barW]);

  const barOuterW = Math.min(480, width - 48);

  // 4) 텍스트 스니펫(마이크로카피) ----------------
  const lines = useMemo(() => {
    if (progress < 0.25) return ["단비가 꽃잎을 모으는 중이에요", "조금만 기다려 주세요."];
    if (progress < 0.5)  return ["꽃향기를 고르고 있어요", "좀 더 포근하게 만들게요."];
    if (progress < 0.75) return ["메시지와 이미지를 결합 중…", "느낌을 더 살리고 있어요."];
    return ["마무리 다듬는 중이에요", "곧 완성됩니다!"];
  }, [progress]);

  // 5) 액세서리(👓/👔/🛠️ 등) -----------------------
  const accessories = (
    <>
      {mode === "promo" && (
        <>
          <Text style={[styles.emoji, { top: 36, left: 92, fontSize: 22 }]}>👓</Text>
          <Text style={[styles.emoji, { top: 124, left: 104, fontSize: 22 }]}>👔</Text>
        </>
      )}
      {mode === "work" && (
        <>
          <Text style={[styles.emoji, { top: 14, left: 128, fontSize: 20 }]}>🧢</Text>
          <Text style={[styles.emoji, { top: 124, left: 118, fontSize: 20 }]}>🛠️</Text>
        </>
      )}
    </>
  );

  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });
  const currentPercent = Math.round(progress * 100);

  return (
    <View style={styles.page}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>단비가 정성껏 준비 중…</Text>
        <Text style={styles.sub}>약 1시간 내에 결과가 완성돼요.</Text>
      </View>

      {/* 단비 일러스트 */}
      <Animated.View style={{ transform: [{ translateY: bob }, { rotate: rotate }] }}>
        <View style={styles.danbiWrap}>
          <Image
            source={{ uri: "https://picsum.photos/seed/danbi/360/360" }} // TODO: 단비 PNG로 교체
            style={styles.danbi}
            resizeMode="contain"
          />
          {accessories}
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={13} color="#fff" />
            <Text style={styles.badgeText}>{mm}:{ss}</Text>
          </View>
        </View>
      </Animated.View>

      {/* 진행 안내 텍스트 */}
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <Text style={styles.linePrimary}>{lines[0]}</Text>
        <Text style={styles.lineSecondary}>{lines[1]}</Text>
      </View>

      {/* 진행률 바 */}
      <View style={[styles.barOuter, { width: barOuterW }]}>
        <Animated.View style={[styles.barInner, { width: barW.interpolate({
          inputRange: [0, 1],
          outputRange: [0, barOuterW],
        }) }]} />
      </View>
      <Text style={styles.percent}>{currentPercent}%</Text>

      {/* 마일스톤 */}
      <View style={styles.milestones}>
        <Milestone label="분석" done={progress >= 0.25} />
        <Milestone label="조합" done={progress >= 0.5} />
        <Milestone label="다듬기" done={progress >= 0.75} />
        <Milestone label="완성" done={progress >= 0.99} />
      </View>

      {/* 하단 액션 */}
      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCancel}>
          <Ionicons name="home-outline" size={18} color={BRAND_ACCENT} />
          <Text style={styles.btnGhostText}>홈으로</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnPrimary]}>
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>완성 알림 받기</Text>
        </Pressable>
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

function msToMMSS(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return { mm: String(m).padStart(2, "0"), ss: String(s).padStart(2, "0") };
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  page: { flex: 1, paddingTop: 32, alignItems: "center", backgroundColor: BRAND_BG },
  header: { alignItems: "center", marginBottom: 8, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#222" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 4 },

  danbiWrap: {
    width: 200, height: 200, borderRadius: 24, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  danbi: { width: 160, height: 160 },
  emoji: { position: "absolute" },
  badge: {
    position: "absolute", bottom: 10, right: 10, backgroundColor: BRAND_ACCENT,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  linePrimary: { fontSize: 16, color: "#27333a", marginBottom: 2 },
  lineSecondary: { fontSize: 13, color: BRAND_MUTE },

  barOuter: {
    height: 12, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden", marginTop: 14,
  },
  barInner: { height: "100%", borderRadius: 999, backgroundColor: BRAND_ACCENT },

  percent: { marginTop: 6, color: "#374151", fontWeight: "700" },

  milestones: { flexDirection: "row", gap: 18, marginTop: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999 },
  btnPrimary: { backgroundColor: BRAND_ACCENT },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: BRAND_ACCENT },
  btnGhostText: { color: BRAND_ACCENT, fontWeight: "800" },
});

const ms = StyleSheet.create({
  item: { alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.15)" },
  dotDone: { backgroundColor: BRAND_ACCENT },
  text: { fontSize: 11, color: "#6b7280", marginTop: 4, fontWeight: "600" },
  textDone: { color: "#374151" },
});
