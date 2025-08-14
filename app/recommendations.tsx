 import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

const { width } = Dimensions.get("window");
const H_PADDING = 16;
const GAP = 12;
const CARD_W = Math.floor((width - H_PADDING * 2 - GAP) / 2);
const CARD_H = Math.floor(CARD_W * 1.35);

const BACKEND_URL = "http://<YOUR_BACKEND_HOST>:<PORT>"; // TODO: 실제 주소로 교체

type Bouquet = {
  id: string;
  title: string;
  imageUrl: string;
  price?: number;
  tags?: string[];
  palette?: string[]; // 추천 색상 팔레트 (선택)
  floristName?: string;
  score?: number; // 알고리즘 매칭 점수(0~1 또는 0~100)
};

export default function Recommendations() {
  const params = useLocalSearchParams(); // 필요 시 userId, mood 등 전달 가능
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

  const fetchRecommendations = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // 실제 API 예시:
      // const res = await fetch(`${BACKEND_URL}/api/recommendations?userId=${params.userId ?? ""}`);
      // const data: Bouquet[] = await res.json();

      // 데모/폴백 데이터 (4개 보장)
      const data: Bouquet[] = [
        {
          id: "r1",
          title: "라벤더 포에틱",
          imageUrl: "https://picsum.photos/seed/bouquet1/1000/1400",
          price: 59000,
          tags: ["은은함", "라벤더", "편안함"],
          floristName: "플로리스트 이브",
          score: 0.91,
          palette: ["#b5a6d3", "#f6f2ff", "#7557a2"],
        },
        {
          id: "r2",
          title: "선셋 로즈믹스",
          imageUrl: "https://picsum.photos/seed/bouquet2/1000/1400",
          price: 72000,
          tags: ["축하", "장미", "따뜻함"],
          floristName: "로즈가든",
          score: 0.88,
          palette: ["#ffb4a2", "#ffd6a5", "#ffadad"],
        },
        {
          id: "r3",
          title: "포레스트 브리즈",
          imageUrl: "https://picsum.photos/seed/bouquet3/1000/1400",
          price: 64000,
          tags: ["그린", "싱그러움", "위로"],
          floristName: "그린앤리프",
          score: 0.86,
          palette: ["#9dc9a5", "#e6f4ea", "#5f8f6b"],
        },
        {
          id: "r4",
          title: "아이보리 세레나데",
          imageUrl: "https://picsum.photos/seed/bouquet4/1000/1400",
          price: 68000,
          tags: ["감성", "미니멀", "우아"],
          floristName: "빈티지라운지",
          score: 0.84,
          palette: ["#f2efe9", "#e2dcd0", "#b3a893"],
        },
      ];

      // 상위 4개만 사용 (혹시 백엔드가 더 보내도 안전)
      setItems(data.slice(0, 4));
    } catch (e: any) {
      setError("추천을 불러오는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  }, [fetchRecommendations]);

  const onPressCard = (item: Bouquet) => {
    // 상세 페이지로 이동 (동적 라우트 예: app/bouquet/[id].tsx)
    router.push({
      pathname: "/confirm",
      params: { id: item.id, title: item.title },
    });
  };

  const toggleLike = (id: string) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

    const sv = getScale(id);
    Animated.sequence([
      Animated.timing(sv, { toValue: 1.25, duration: 80, useNativeDriver: true }),
      Animated.spring(sv, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const Header = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>당신을 위한 추천</Text>
        <Text style={styles.headerSub}>기분, 색감, 기록을 바탕으로 큐레이션했어요.</Text>
      </View>
    ),
    []
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: "#666" }}>추천을 준비하고 있어요…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
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
      <View style={styles.center}>
        <Text style={{ color: "#444", marginBottom: 6 }}>아직 보여줄 추천이 없어요.</Text>
        <Text style={{ color: "#777" }}>기록을 조금만 더 남겨 주시면 딱 맞게 찾아드릴게요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}

      <FlatList
        contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 20 }}
        data={items}
        numColumns={2}
        keyExtractor={(it) => it.id}
        columnWrapperStyle={{ gap: GAP }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item, index }) => (
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
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityLabel={`${item.title} 상세보기`}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            // 필요 시 로컬 플레이스홀더로 교체 가능
          }}
        />
        {/* 좋아요 버튼 */}
        <Animated.View style={[styles.likeBtn, { transform: [{ scale }] }]}>
          <Pressable onPress={onToggleLike} hitSlop={10} accessibilityLabel="찜하기">
            <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#e11d48" : "#ffffff"} />
          </Pressable>
        </Animated.View>

        {/* 매칭 점수 / 플로리스트 배지 */}
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

        {/* 태그 핀 */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.slice(0, 3).map((t) => (
              <View key={t} style={styles.tagPill}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerRow}>
          {typeof item.price === "number" ? (
            <Text style={styles.price}>{item.price.toLocaleString()}원</Text>
          ) : (
            <Text style={styles.priceMuted}>가격 상담</Text>
          )}

          <Pressable style={styles.cta} onPress={onPress} accessibilityLabel="자세히 보기">
            <Text style={styles.ctaText}>자세히</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/** ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: H_PADDING,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
  },
  headerSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7A958E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },

  card: {
    width: CARD_W,
    borderRadius: 14,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginTop: 12,
    // 그림자 (iOS/Android)
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
    fontWeight: "700",
    color: "#222",
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
  },
  tagText: {
    fontSize: 11,
    color: "#5b6470",
    fontWeight: "600",
  },

  footerRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "800",
  },
  priceMuted: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7A958E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
});

// 벡엔드 연동 방법 
// - 위 코드의 BACKEND_URL을 실제 주소로 교체하고, fetch 부분 주석을 풀면 됨
// - 쿼리 파라미터(예: userId, mood, palette)를 useLocalSearchParams()로 받아 API에 붙여 전달
// - 서버가 4개 이상을 줘도 slice(0,4)로 안전하게 제한