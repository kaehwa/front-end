// app/card.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  Pressable, Dimensions, Animated, Share, Alert, Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

const { width } = Dimensions.get("window");
const H_PADDING = 20;
const CARD_W = Math.min(380, width - H_PADDING * 2);
const CARD_RADIUS = 24;
const BACKEND_URL = "http://<YOUR_BACKEND_HOST>:<PORT>"; // TODO: 실제 주소로 교체

type CardPayload = {
  id: string;
  letter: string;
  bouquetTitle?: string;
  bouquetImageUrl?: string;
  bouquetGif?: string;
  videoUrl?: string | null;
  shareUrl?: string;
  badgeText?: string;
};

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<CardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 애니메이션 값 (ref로 재사용)
  const cardY = useRef(new Animated.Value(16)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // 중복 실행 가드 & 언마운트 가드
  const fetchedRef = useRef(false);
  const animatedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runIntroOnce = useCallback(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    Animated.parallel([
      Animated.timing(cardY, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardY]);

  const fetchCard = useCallback(async (cardId: string) => {
    if (!cardId) return;
    if (fetchedRef.current) return; // 한 번만
    fetchedRef.current = true;

    setErr(null);
    setLoading(true);
    try {
      // 실제 API 예시
      // const res = await fetch(`${BACKEND_URL}/api/cards/${encodeURIComponent(cardId)}`);
      // if (!res.ok) throw new Error("fetch_failed");
      // const json: CardPayload = await res.json();

      // 데모 데이터
      const json: CardPayload = {
        id: String(cardId),
        letter:
          "사랑하는 당신에게,\n\n" +
          "오늘 내 마음을 꽃으로 전해요. 바쁜 하루 속에서도\n" +
          "이 카드가 작은 쉼표가 되길 바라요.\n\n" +
          "늘 곁에 있을게요.\n그대, 화(花)야와 함께.",
        bouquetTitle: "라벤더 포에틱",
        bouquetImageUrl: "https://picsum.photos/seed/finalbouquet/1200/1600",
        videoUrl: null,
        shareUrl: `https://gaehwa.app/card/${cardId}`,
        badgeText: "완성",
      };

      if (!mountedRef.current) return;
      setData(json);
      // 애니메이션은 한 번만
      requestAnimationFrame(runIntroOnce);
    } catch (e) {
      if (!mountedRef.current) return;
      setErr("카드 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      setData(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [runIntroOnce]);

  // 의존성: 오직 id (문자열로 고정)
  const stableId = useMemo(() => (typeof id === "string" ? id : id ? String(id) : ""), [id]);

  useEffect(() => {
    // id가 바뀌면 다음 요청을 허용하도록 리셋 (다른 페이지에서 재사용될 때 대비)
    fetchedRef.current = false;
    animatedRef.current = false;
    cardY.setValue(16);
    cardOpacity.setValue(0);

    if (stableId) fetchCard(stableId);
    else {
      // id 없을 때도 로딩 종료 처리
      setLoading(false);
      setErr("잘못된 카드 주소입니다.");
    }
  }, [stableId, fetchCard, cardY, cardOpacity]);

  const onShare = async () => {
    if (!data?.shareUrl) {
      Alert.alert("공유 불가", "공유 링크가 준비되지 않았습니다.");
      return;
    }
    try {
      await Share.share({ message: data.shareUrl });
    } catch {
      Alert.alert("공유 실패", "다시 시도해 주세요.");
    }
  };

  const onCopy = async () => {
    if (!data?.shareUrl) return;
    await Clipboard.setStringAsync(data.shareUrl);
    Alert.alert("복사됨", "공유 링크가 복사되었어요.");
  };

  const goPurchase = () => {
    router.push({ pathname: "/checkout", params: { id: data?.id ?? stableId } });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>카드를 준비하고 있어요…</Text>
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{err}</Text>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => {
            // 수동 재시도 시에도 중복 방지 ref 리셋
            fetchedRef.current = false;
            animatedRef.current = false;
            cardY.setValue(16);
            cardOpacity.setValue(0);
            if (stableId) fetchCard(stableId);
          }}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  const imgUri = useMemo(
    () =>
      data.bouquetGif ??
      data.bouquetImageUrl ??
      "https://via.placeholder.com/800x1200?text=Bouquet",
    [data.bouquetGif, data.bouquetImageUrl]
  );

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={styles.bgGradient} />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.card,
            { width: CARD_W, opacity: cardOpacity, transform: [{ translateY: cardY }] },
          ]}
        >
          <View style={styles.cardTop}>
            {data.badgeText ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTextText}>{data.badgeText}</Text>
              </View>
            ) : (
              <View style={{ height: 22 }} />
            )}
            <Pressable style={styles.smallIconBtn} onPress={onCopy} accessibilityLabel="링크 복사">
              <Ionicons name="link-outline" size={16} color="#6b7280" />
            </Pressable>
          </View>

          <Image source={{ uri: imgUri }} style={styles.heroImage} resizeMode="cover" />

          <View style={styles.divider} />

          <View style={styles.textWrap}>
            <Text
              style={[
                styles.letter,
                Platform.OS === "web" && ({ whiteSpace: "pre-wrap" } as any),
              ]}
            >
              {data.letter}
            </Text>

            {!!data.bouquetTitle && (
              <View style={styles.metaRow}>
                <Ionicons name="flower" size={14} color="#7A958E" />
                <Text style={styles.metaText}>{data.bouquetTitle}</Text>
              </View>
            )}
          </View>

          <View style={styles.videoBlock}>
            <Ionicons name="videocam-outline" size={16} color="#6b7280" />
            <Text style={styles.videoText}>영상은 곧 준비됩니다.</Text>
          </View>
        </Animated.View>

        <View style={[styles.noticeBox, { width: CARD_W }]}>
          <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.noticeText}>
            화면에 보이는 꽃다발과 실제 꽃다발은 계절·공급 상황에 따라 일부 차이가 있을 수 있어요.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.actionsBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={[styles.actionBtn, styles.actionGhost]} onPress={onShare}>
          <Ionicons name="share-social-outline" size={18} />
          <Text style={styles.actionGhostText}>링크 공유</Text>
        </Pressable>

        <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={goPurchase}>
          <Ionicons name="bag-handle" size={18} color="#fff" />
          <Text style={styles.actionPrimaryText}>구매하러 가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center", backgroundColor: "#F5EFE3" },
  bgGradient: {
    position: "absolute", top: -120, width: "120%", height: 280, alignSelf: "center",
    borderBottomLeftRadius: 240, borderBottomRightRadius: 240, backgroundColor: "#EBD7B2", opacity: 0.5,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: "#666" },
  skeletonCard: {
    width: CARD_W, height: Math.round(CARD_W * 1.6), backgroundColor: "#f2f2f2",
    borderRadius: CARD_RADIUS, marginTop: 16,
  },
  errorText: { color: "#b91c1c", textAlign: "center", marginBottom: 12 },
  card: {
    marginTop: 28, backgroundColor: "#fff", borderRadius: CARD_RADIUS, paddingBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 3, overflow: "hidden", alignItems: "center",
  },
  cardTop: {
    width: "100%", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  badge: { backgroundColor: "#0a84ff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeTextText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  smallIconBtn: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
  heroImage: { width: "88%", height: Math.round(CARD_W * 0.95), borderRadius: 18, backgroundColor: "#eaeaea" },
  divider: { width: "92%", height: 1, backgroundColor: "#F0F2F5", marginTop: 14 },
  textWrap: { width: "86%", marginTop: 14, alignItems: "center" },
  letter: { fontSize: 16, lineHeight: 26, color: "#2b2b2b", textAlign: "center" },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#5c6a68", fontWeight: "700" },
  videoBlock: {
    marginTop: 16, backgroundColor: "#F8FAFB", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8,
  },
  videoText: { color: "#6b7280", fontSize: 12 },
  noticeBox: {
    marginTop: 16, backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center",
  },
  noticeText: { color: "#4b5563", fontSize: 12, flexShrink: 1 },
  actionsBar: {
    position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: "rgba(255,255,255,0.96)", flexDirection: "row", gap: 10, justifyContent: "center",
    alignItems: "center", borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  actionPrimary: { backgroundColor: "#0a84ff" },
  actionPrimaryText: { color: "#fff", fontWeight: "800" },
  actionGhost: { backgroundColor: "#eef2ff" },
  actionGhostText: { color: "#0a84ff", fontWeight: "800" },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  btnPrimary: { backgroundColor: "#7A958E" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
