import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, Image, ActivityIndicator, Pressable,
  Animated, Dimensions, ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const MAX_IMG_W = Math.min(480, width - 48);
const BACKEND_URL = "http://<YOUR_BACKEND_HOST>:<PORT>"; // TODO: 실제로 교체

type GifResponse = {
  gifUrl: string;
  title?: string;
  palette?: string[];
  floristName?: string;
};

export default function ConfirmSelectedBouquet() {
  const params = useLocalSearchParams<{ id?: string }>();
  const stableId = useMemo(() => (typeof params.id === "string" ? params.id : params.id ? String(params.id) : ""), [params.id]);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<GifResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 애니메이션 값들 (ref로 고정)
  const checkScale = useRef(new Animated.Value(0.2)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const msgY = useRef(new Animated.Value(20)).current;
  const msgOpacity = useRef(new Animated.Value(0)).current;
  const imgY = useRef(new Animated.Value(30)).current;
  const imgOpacity = useRef(new Animated.Value(0)).current;

  // 가드들
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);    // 같은 id에서 중복 fetch 방지
  const animatedRef = useRef(false);   // 소개 애니메이션 1회만

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runIntroAnimOnce = useCallback(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(checkOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(msgOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(msgY, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(imgOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(imgY, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
    ]).start();
  }, [checkOpacity, checkScale, msgOpacity, msgY, imgOpacity, imgY]);

  const resetAnimValues = useCallback(() => {
    animatedRef.current = false;
    checkScale.setValue(0.2);
    checkOpacity.setValue(0);
    msgY.setValue(20);
    msgOpacity.setValue(0);
    imgY.setValue(30);
    imgOpacity.setValue(0);
  }, [checkScale, checkOpacity, msgY, msgOpacity, imgY, imgOpacity]);

  const fetchGif = useCallback(async (idForFetch: string) => {
    if (!idForFetch) {
      if (mountedRef.current) {
        setLoading(false);
        setErr("잘못된 요청입니다. 다시 시도해 주세요.");
      }
      return;
    }
    if (fetchedRef.current) return; // 같은 id에서 1회만
    fetchedRef.current = true;

    setErr(null);
    setLoading(true);
    try {
      // 실제 연동 예시
      // const res = await fetch(`${BACKEND_URL}/api/bouquets/${encodeURIComponent(idForFetch)}/gif`);
      // if (!res.ok) throw new Error("failed");
      // const json: GifResponse = await res.json();

      // 데모용
      const json: GifResponse = {
        gifUrl: `https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif?seed=${idForFetch}`,
        title: "선택한 꽃다발",
        palette: ["#e7e0d8", "#c4a7a1", "#7A958E"],
        floristName: "플로리스트 라온",
      };

      if (!mountedRef.current) return;
      setData(json);
      // 성공했을 때만 1회 애니메이션
      requestAnimationFrame(runIntroAnimOnce);
    } catch (e) {
      if (!mountedRef.current) return;
      setErr("선택한 꽃다발 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      setData(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [runIntroAnimOnce]);

  // id 변경 시: 가드/애니메이션 리셋 후 새로 fetch
  useEffect(() => {
    // 새로운 id에 대해 다시 허용
    fetchedRef.current = false;
    resetAnimValues();

    if (stableId) {
      fetchGif(stableId);
    } else {
      setLoading(false);
      setErr("잘못된 요청입니다. 다시 시도해 주세요.");
    }
  }, [stableId, fetchGif, resetAnimValues]);

  // 로딩 화면
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: "#666" }}>꽃 한 송이의 순간을 불러오고 있어요…</Text>
        <View style={styles.skeleton} />
      </View>
    );
  }

  // 에러 화면
  if (err) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#b91c1c", marginBottom: 16, textAlign: "center" }}>{err}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            // 재시도 시에도 가드/애니메이션 리셋
            fetchedRef.current = false;
            resetAnimValues();
            if (stableId) fetchGif(stableId);
          }}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
        <Pressable style={[styles.linkBtn, { marginTop: 12 }]} onPress={() => router.replace("/recommendations")}>
          <Text style={styles.linkBtnText}>다른 추천 다시 보기</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.headerWrap}>
          <Animated.View style={{ transform: [{ scale: checkScale }], opacity: checkOpacity }}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </View>
          </Animated.View>

          <Animated.Text
            style={[styles.mainMsg, { opacity: msgOpacity, transform: [{ translateY: msgY }] }]}
          >
            꽃다발이 선택되었어요
          </Animated.Text>

          <Text style={styles.subMsg}>당신의 마음을 담아, 더 아름답게 준비할게요.</Text>
        </View>

        <Animated.View style={[styles.mediaWrap, { opacity: imgOpacity, transform: [{ translateY: imgY }] }]}>
          <Image source={{ uri: data.gifUrl }} style={styles.media} resizeMode="contain" />
        </Animated.View>

        <View style={styles.metaArea}>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.titleText} numberOfLines={1}>
              {data.title ?? "선택한 꽃다발"}
            </Text>
            {data.floristName && (
              <View style={styles.floristPill}>
                <Ionicons name="flower" size={12} color="#fff" />
                <Text style={styles.floristText}>{data.floristName}</Text>
              </View>
            )}
          </View>

          {Array.isArray(data.palette) && data.palette.length > 0 && (
            <View style={styles.paletteRow}>
              {data.palette.slice(0, 5).map((c) => (
                <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
              ))}
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
          <Text style={styles.ctaPrimaryText}>주문하러 가기</Text>
        </Pressable>

        <Pressable style={[styles.cta, styles.ctaGhost]} onPress={() => router.replace("/recommendations")}>
          <Ionicons name="albums-outline" size={18} color="#7A958E" />
          <Text style={styles.ctaGhostText}>다른 추천 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollBody: { paddingHorizontal: 20, paddingTop: 28 },
  headerWrap: { alignItems: "center", marginBottom: 10 },
  checkCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#7A958E",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  mainMsg: { fontSize: 20, fontWeight: "800", color: "#222", marginTop: 12 },
  subMsg: { fontSize: 13, color: "#6b7280", marginTop: 6 },
  mediaWrap: {
    alignSelf: "center", width: MAX_IMG_W, height: Math.round(MAX_IMG_W * 1.1),
    backgroundColor: "#f7f7f7", borderRadius: 16, overflow: "hidden", marginTop: 14,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  media: { width: "100%", height: "100%" },
  metaArea: { marginTop: 18, alignItems: "center" },
  titleText: { fontSize: 16, fontWeight: "800", color: "#222" },
  floristPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 8,
  },
  floristText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  paletteRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  swatch: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  actionsBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255,255,255,0.94)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 20, paddingTop: 10, gap: 10,
  },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 999, gap: 8 },
  ctaPrimary: { backgroundColor: "#7A958E" },
  ctaPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ctaGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#7A958E" },
  ctaGhostText: { color: "#7A958E", fontSize: 14, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  skeleton: { width: MAX_IMG_W, height: Math.round(MAX_IMG_W * 1.1), backgroundColor: "#f2f2f2", borderRadius: 16, marginTop: 16 },
  linkBtn: { alignSelf: "center", backgroundColor: "transparent", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: "#7A958E" },
  linkBtnText: { color: "#7A958E", fontSize: 14, fontWeight: "800" },
  retryText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  retryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#7A958E", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
});
