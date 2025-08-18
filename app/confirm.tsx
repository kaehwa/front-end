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

type BouquetItem = {
  id: string;
  title?: string;
  imageUrl: string;
  palette?: string[];
  floristName?: string;
};

export default function ConfirmSelectedBouquet() {
  const params = useLocalSearchParams<{ id?: string; title?: string; imageUrl?: string }>();
  const stableId = useMemo(
    () => (typeof params.id === "string" ? params.id : params.id ? String(params.id) : ""),
    [params.id]
  );
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<BouquetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 애니메이션 값들
  const checkScale = useRef(new Animated.Value(0.2)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const msgY = useRef(new Animated.Value(20)).current;
  const msgOpacity = useRef(new Animated.Value(0)).current;
  const imgY = useRef(new Animated.Value(30)).current;
  const imgOpacity = useRef(new Animated.Value(0)).current;
  const animatedRef = useRef(false);

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

  useEffect(() => {
    console.log("debug param")
    console.log(params)
    console.log("debug imageUrl")
    console.log(params.imageUrl)
    if (params.imageUrl) {
      setData({
        id: stableId,
        imageUrl: params.imageUrl,
        title: params.title ?? "선택한 꽃다발",
        floristName: "플로리스트 라온",
        palette: ["#e7e0d8", "#c4a7a1", "#7A958E"],
      });
      requestAnimationFrame(runIntroAnimOnce);
      setLoading(false);
    } else {
      setErr("잘못된 요청입니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  }, [params.imageUrl, params.title, stableId, runIntroAnimOnce]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: "#666" }}>꽃 한 송이의 순간을 불러오고 있어요…</Text>
        <View style={styles.skeleton} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#b91c1c", marginBottom: 16, textAlign: "center" }}>{err}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => router.replace("/recommendations")}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>다른 추천 다시 보기</Text>
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
          <Image source={data.imageUrl} style={styles.media} resizeMode="contain" />
        </Animated.View>

        <View style={styles.metaArea}>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.titleText} numberOfLines={1}>
              {data.title}
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

// (styles는 기존 ConfirmSelectedBouquet와 동일)
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
  retryText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  retryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#7A958E", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
});
