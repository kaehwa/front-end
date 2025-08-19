import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, Image, ActivityIndicator, Pressable,
  Animated, Dimensions, ScrollView, Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const MAX_IMG_W = Math.min(480, width - 48);

const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.08)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const ACCENT = "#FB7431";

const BACKEND_URL = "http://<YOUR_BACKEND_HOST>:<PORT>"; // 준비되면 교체

/** ===== 로컬 더미 에셋 맵 =====
 *  프로젝트 경로에 맞게 이미지 파일만 넣어주면 바로 작동합니다.
 */
const LOCAL_BOUQUETS = {
  r1: require("../assets/bouquets/r1.jpg"),
  r2: require("../assets/bouquets/r2.jpg"),
  r3: require("../assets/bouquets/r3.jpg"),
  r4: require("../assets/bouquets/r4.jpg"),
} as const;

type LocalKey = keyof typeof LOCAL_BOUQUETS;

type Data = {
  uri?: string;           // 원격일 때
  localKey?: LocalKey;    // 로컬일 때
  title?: string;
  imageUrl: string;
  palette?: string[];
  floristName?: string;
};

export default function ConfirmSelectedBouquet() {
  const params = useLocalSearchParams<{ id?: string }>();
  const stableId = useMemo(
    () => (typeof params.id === "string" ? params.id : params.id ? String(params.id) : ""),
    [params.id]
  );
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 애니메이션
  const checkScale = useRef(new Animated.Value(0.2)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const msgY = useRef(new Animated.Value(20)).current;
  const msgOpacity = useRef(new Animated.Value(0)).current;
  const imgY = useRef(new Animated.Value(30)).current;
  const imgOpacity = useRef(new Animated.Value(0)).current;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runIntro = useCallback(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(checkOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(msgOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(msgY, { toValue: 0, duration: 360, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(imgOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(imgY, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    ]).start();
  }, [checkOpacity, checkScale, msgOpacity, msgY, imgOpacity, imgY]);

  const resetAnim = useCallback(() => {
    checkScale.setValue(0.2); checkOpacity.setValue(0);
    msgY.setValue(20); msgOpacity.setValue(0);
    imgY.setValue(30); imgOpacity.setValue(0);
  }, [checkScale, checkOpacity, msgY, msgOpacity, imgY, imgOpacity]);

  /** 로컬 더미 by id */
  const localFallbackFor = useCallback((id: string): Data => {
    const key: LocalKey = (["r1", "r2", "r3", "r4"].includes(id) ? id : "r1") as LocalKey;
    const meta: Record<LocalKey, Omit<Data, "localKey">> = {
      r1: { title: "라벤더 포에틱", palette: ["#b5a6d3","#f6f2ff","#7557a2"]  },
      r2: { title: "선셋 로즈믹스", palette: ["#ffb4a2","#ffd6a5","#ffadad"]  },
      r3: { title: "포레스트 브리즈", palette: ["#9dc9a5","#e6f4ea","#5f8f6b"]  },
      r4: { title: "아이보리 세레나데", palette: ["#f2efe9","#e2dcd0","#b3a893"]  },
    };
    return { localKey: key, ...meta[key] };
  }, []);

  /** 타임아웃 있는 fetch (백엔드 붙이면 사용) */
  const fetchWithTimeout = async (url: string, ms = 2500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  const loadData = useCallback(async (id: string) => {
    resetAnim();
    setErr(null);
    setLoading(true);

    // 1) 로컬 즉시 세팅(UX 빠르게)
    const local = localFallbackFor(id);
    if (mountedRef.current) setData(local);

    // 2) 백엔드가 준비되면 원격 교체(타임아웃 시 무시)
    try {
      // 실제 예시 (준비되면 주석 해제)
      // const res = await fetchWithTimeout(
      //   `${BACKEND_URL}/api/bouquets/${encodeURIComponent(id)}/gif`,
      //   2500
      // );
      // if (res.ok) {
      //   const json = (await res.json()) as { gifUrl?: string; title?: string; palette?: string[]; floristName?: string; };
      //   if (json.gifUrl && mountedRef.current) {
      //     setData({ uri: json.gifUrl, title: json.title ?? local.title, palette: json.palette ?? local.palette, floristName: json.floristName ?? local.floristName });
      //   }
      // }

      // 데모: 원격 없이 로컬 유지
    } catch {
      // 무시하고 로컬 유지
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        // 약간의 프레임 뒤에 애니메이션
        requestAnimationFrame(runIntro);
      }
    }
  }, [localFallbackFor, resetAnim, runIntro]);

  useEffect(() => {
    if (!stableId) {
      setLoading(false);
      setErr("잘못된 요청입니다. 다시 시도해 주세요.");
      return;
    }
    loadData(stableId);
  }, [stableId, loadData]);

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ marginTop: 12, color: SUB }}>꽃 한 송이의 순간을 불러오고 있어요…</Text>
        <View style={[styles.skeleton, { backgroundColor: "#f1eadb" }]} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <Text style={{ color: "#b91c1c", marginBottom: 16, textAlign: "center" }}>{err}</Text>
        <Pressable style={styles.retryBtn} onPress={() => stableId && loadData(stableId)}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>다른 추천 다시 보기</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  const source = data.localKey ? LOCAL_BOUQUETS[data.localKey] : { uri: data.uri! };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.headerWrap}>
          <Animated.View style={{ transform: [{ scale: checkScale }], opacity: checkOpacity }}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
          </Animated.View>

          <Animated.Text style={[styles.mainMsg, { opacity: msgOpacity, transform: [{ translateY: msgY }] }]}>
            꽃다발이 선택되었어요
          </Animated.Text>
          <Text style={styles.subMsg}>당신의 마음을 담아, 더 아름답게 준비할게요.</Text>
        </View>

        <Animated.View style={[styles.mediaWrap, { opacity: imgOpacity, transform: [{ translateY: imgY }] }]}>
          <Image source={source} style={styles.media} resizeMode="cover" />
        </Animated.View>

        <View style={styles.metaArea}>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.titleText} numberOfLines={1}>{data.title}</Text>
            {data.floristName && (
              <View style={styles.floristPill}>
                <Ionicons name="flower" size={12} color="#fff" />
                <Text style={styles.floristText}>{data.floristName}</Text>
              </View>
            )}
          </View>

          {data.palette?.length > 0 && (
            <View style={styles.paletteRow}>
              {data.palette.slice(0, 5).map((c) => <View key={c} style={[styles.swatch, { backgroundColor: c }]} />)}
            </View>
          )}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={[styles.actionsBar, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          style={[styles.cta, styles.ctaPrimary]}
          onPress={() => router.push({ pathname: "/letter", params: { id: stableId } })}
        >
          <Ionicons name="bag-handle" size={18} color="#fff" />
          <Text style={styles.ctaPrimaryText}>선택 완료</Text>
        </Pressable>

        <Pressable style={[styles.cta, styles.ctaGhost]} onPress={() => router.replace("/recommendations")}>
          <Ionicons name="albums-outline" size={18} color={ACCENT} />
          <Text style={[styles.ctaGhostText, { color: ACCENT }]}>다른 추천 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollBody: { paddingHorizontal: 20, paddingTop: 28 },
  headerWrap: { alignItems: "center", marginBottom: 10 },
  checkCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  mainMsg: { fontSize: 20, fontWeight: "800", color: TEXT, marginTop: 12 },
  subMsg: { fontSize: 13, color: SUB, marginTop: 6 },

  mediaWrap: {
    alignSelf: "center", width: MAX_IMG_W, height: Math.round(MAX_IMG_W * 1.05),
    backgroundColor: WHITE, borderRadius: 16, overflow: "hidden", marginTop: 14,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  media: { width: "100%", height: "100%" },

  metaArea: { marginTop: 18, alignItems: "center" },
  titleText: { fontSize: 16, fontWeight: "800", color: TEXT },
  floristPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 8,
  },
  floristText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  paletteRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  swatch: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },

  actionsBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    paddingHorizontal: 20, paddingTop: 10, gap: 10,
  },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 999, gap: 8 },
  ctaPrimary: { backgroundColor: ACCENT },
  ctaPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ctaGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: ACCENT },
  ctaGhostText: { fontSize: 14, fontWeight: "800" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: BG },
  skeleton: { width: MAX_IMG_W, height: Math.round(MAX_IMG_W * 1.05), borderRadius: 16, marginTop: 16 },

  linkBtn: { alignSelf: "center", backgroundColor: "transparent", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: ACCENT },
  linkBtnText: { color: ACCENT, fontSize: 14, fontWeight: "800" },
  retryText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  retryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
});
