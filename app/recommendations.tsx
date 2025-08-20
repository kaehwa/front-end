import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Image as RNImage,         // ← 로컬 자산 URL 변환용
  Pressable,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { resolveDiscoveryAsync } from "expo-auth-session";

const { width } = Dimensions.get("window");
const H_PADDING = 16;
const GAP = 12;
const CARD_W = Math.floor((width - H_PADDING * 2 - GAP) / 2);
const CARD_H = Math.floor(CARD_W * 1.35);

const BACKEND_URL = "http://4.240.103.29:8080"; // TODO: 실제 주소로 교체
const ID = "1"

const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.06)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const ACCENT = "#7A958E";

// --- Mascot & Local Images ---
const DANBI = require("./../assets/mascot/danbi.jpg");

// 로컬 부케 이미지(프로젝트 경로에 맞게 조정)
const LOCAL_BOUQUETS = {
  r1: require("./../assets/bouquets/r1.jpg"),
  r2: require("./../assets/bouquets/r2.jpg"),
  r3: require("./../assets/bouquets/r3.jpg"),
  r4: require("./../assets/bouquets/r4.jpg"),
} as const;

type LocalBouquetKey = keyof typeof LOCAL_BOUQUETS;

type Bouquet = {
  id: string;
  title: string;
  imageUrl?: string;
  imageLocal?: LocalBouquetKey;
  imageBase64?: string;   
  price?: number;
  tags?: string[];
  palette?: string[];
  floristName?: string;
  score?: number;
};

export default function Recommendations() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // URL 파라미터 > 백엔드 응답 > 기본값
  const [meta, setMeta] = useState({
    giver: (params.giver as string) || "보내는 분",
    receiver: (params.receiver as string) || "받는 분",
    occasion: (params.occasion as string) || "특별한 날",
  });

  const [items, setItems] = useState<Bouquet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  // 하트 탭 애니메이션 값
  const scales = useRef<Record<string, Animated.Value>>({}).current;
  const getScale = (id: string) => {
    if (!scales[id]) scales[id] = new Animated.Value(1);
    return scales[id];
  };

  // 메타데이터(보내는분/받는분/특별한날) 백엔드에서 보완
  useEffect(() => {
    (async () => {
      try {
        // const res = await fetch(`${BACKEND_URL}/api/reco-meta`);
        // const remote = await res.json(); // { giver, receiver, occasion }
        const remote: Partial<typeof meta> = {}; // 데모
        setMeta((prev) => ({
          giver: prev.giver || remote.giver || "보내는 분",
          receiver: prev.receiver || remote.receiver || "받는 분",
          occasion: prev.occasion || remote.occasion || "특별한 날",
        }));
      } catch {
        // 무시
      }
    })();
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/flowers/${ID}/similar`
      );
      setLoading(true)
      console.log(res)
      
      
      const raw: any[] = await res.json();
      setLoading(false)
      console.log(raw)
      const resData: Bouquet[] = raw.map((r) => ({
        id: r.id,
        title: r.name,                   // name → title
        imageBase64: r.imageBase64,      // base64 이미지
        // palette: r.rgb || [],            // rgb 배열
        palette: r.rgb ? r.rgb.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`) : [],
      }));
      
      console.log("resData")
      console.log(resData)

      setItems(resData.slice(0, 4));
    } catch (e: any) {
      setError("추천을 불러오는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      console.log(e)
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, [meta.giver, meta.receiver, meta.occasion]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  }, [fetchRecommendations]);

  // ✅ 카드 탭 → 결제(toss)로 바로 이동 + 이미지/이름/금액 전달
  const onPressCard = (item: Bouquet) => {
    const orderId = `order_${Date.now()}_${item.id}`;
    const amount = item.price ?? 0;
    const orderName = item.title;

    // 이미지 URL(로컬이면 resolveAssetSource로 변환)
    const imgUri = item.imageLocal
      ? RNImage.resolveAssetSource(LOCAL_BOUQUETS[item.imageLocal]).uri
      : item.imageUrl || "";

    router.push({
      pathname: "/toss",
      params: {
        orderId,
        amount: String(amount),
        orderName,
        image: encodeURIComponent(imgUri),        // 썸네일로 사용
        successUrl: "gaehwa://payments/success", // 앱 복귀 스킴
        failUrl: "gaehwa://payments/fail",
      },
    });
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    const sv = getScale(id);
    Animated.sequence([
      Animated.timing(sv, { toValue: 1.2, duration: 80, useNativeDriver: true }),
      Animated.spring(sv, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const Header = useMemo(
    () => (
      <View style={styles.heroWrap}>
        <Text style={styles.heroTitle}>당신을 위한 추천</Text>

        <View style={styles.bubbleRow}>
          <Image source={DANBI} style={styles.danbiAvatar} />
          <View style={styles.bubble}>
            <Text style={styles.heroSub}>
              {meta.giver}님이 {meta.receiver}님께 전하는 {meta.occasion}에 어울리는
              꽃다발을 큐레이션했어요.
            </Text>
            <View style={styles.bubbleTail} />
          </View>
        </View>
      </View>
    ),
    [meta]
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ marginTop: 12, color: SUB }}>추천을 준비하고 있어요…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <Text style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={fetchRecommendations} accessibilityLabel="다시 시도">
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <Text style={{ color: "#444", marginBottom: 6 }}>아직 보여줄 추천이 없어요.</Text>
        <Text style={{ color: SUB }}>기록을 조금만 더 남겨 주시면 딱 맞게 찾아드릴게요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}

      <FlatList
        contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 24 }}
        data={items}
        numColumns={2}
        keyExtractor={(it) => it.id}
        columnWrapperStyle={{ gap: GAP }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        renderItem={({ item }) => (
          <Card
            item={item}
            liked={!!liked[item.id]}
            onPress={() => onPressCard(item)}
            onToggleLike={() => toggleLike(item.id)}
            scale={getScale(item.id)}
          />
        )}
      />
    </View>
  );
}

/** ====== 개별 카드 컴포넌트 ====== */
function Card({
  item,
  liked,
  onPress,
  onToggleLike,
  scale,
}: {
  item: Bouquet;
  liked: boolean;
  onPress: () => void;
  onToggleLike: () => void;
  scale: Animated.Value;
}) {
  // const imgSource =
  //   item.imageLocal
  //     ? LOCAL_BOUQUETS[item.imageLocal]
  //     : item.imageUrl
  //     ? { uri: item.imageUrl }
  //     : undefined;
  const imgSource = item.imageBase64
    ? { uri: `data:image/jpeg;base64,${item.imageBase64}` }
    : item.imageUrl
    ? { uri: item.imageUrl }
    : undefined;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { transform: [{ scale: 0.98 }], shadowOpacity: 0.06, elevation: 1 },
      ]}
      onPress={onPress}
      accessibilityLabel={`${item.title} 상세보기`}
    >
      <View style={styles.imageWrap}>
        {imgSource ? (
          <Image source={imgSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: SUB, fontSize: 12 }}>이미지 없음</Text>
          </View>
        )}

        {/* 좌하단 배지들 */}
        <View style={styles.badgeRow}>
          {typeof item.score === "number" && (
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.badgeText}>{Math.round(item.score * 100)}%</Text>
            </View>
          )}
          {item.floristName && (
            <View style={[styles.badge, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
              <Ionicons name="flower" size={12} color="#fff" />
              <Text style={styles.badgeText}>{item.floristName}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        {/* 태그 */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 2).map((t) => (
              <View key={t} style={styles.tagPill}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 팔레트 스와치 */}
        {item.palette && item.palette.length > 0 && (
          <View style={styles.paletteRow}>
            {item.palette.slice(0, 4).map((c) => (
              <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /** Hero (카드 제거, 말풍선만) */
  heroWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: 18,
    paddingBottom: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 10,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  danbiAvatar: {
    width: 55,
    height: 55,
  },
  bubble: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  bubbleTail: {
    position: "absolute",
    left: -6,
    top: 14,
    width: 12,
    height: 12,
    backgroundColor: WHITE,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: BORDER,
    transform: [{ rotate: "45deg" }],
  },
  heroSub: {
    fontSize: 13,
    color: SUB,
    lineHeight: 19,
  },

  /** 공통 센터 */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },

  /** 카드 */
  card: {
    width: CARD_W,
    borderRadius: 16,
    backgroundColor: WHITE,
    overflow: "hidden",
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  imageWrap: {
    width: "100%",
    height: CARD_H,
    backgroundColor: "#f2f2f2",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  likeBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    padding: 6,
  },
  badgeRow: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(122,149,142,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  info: {
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tagPill: {
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  tagText: {
    fontSize: 11,
    color: "#5b6470",
    fontWeight: "700",
  },

  paletteRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
});
