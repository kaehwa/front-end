import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image, //as Image, // 로컬 자산 URL 변환
  Pressable,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

const { width } = Dimensions.get("window");
const H_PADDING = 16;
const GAP = 12;
const CARD_W = Math.floor((width - H_PADDING * 2 - GAP) / 2);
const CARD_H = Math.floor(CARD_W * 1.35);

// ── Config ────────────────────────────────────────────────────────
const BACKEND_URL = "http://4.240.103.29:8080" // TODO: 실제 주소로 교체
const ID = 22

const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.06)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const ACCENT = "#7A958E";

// ── Assets ────────────────────────────────────────────────────────
const DANBI = require("./../assets/mascot/danbi.jpg");

const LOCAL_BOUQUETS = {
  r1: require("./../assets/bouquets/r1.jpg"),
  r2: require("./../assets/bouquets/r2.jpg"),
  r3: require("./../assets/bouquets/r3.jpg"),
  r4: require("./../assets/bouquets/r4.jpg"),
} as const;

type LocalBouquetKey = keyof typeof LOCAL_BOUQUETS;

// ── Types ─────────────────────────────────────────────────────────
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

type BackendReco = {
  id: string | number;
  name: string;
  imageBase64?: string;
  imageUrl?: string;
  rgb?: [number, number, number][];
  floristName?: string;
  score?: number;
  tags?: string[];
  price?: number;
};

// ── Screen ────────────────────────────────────────────────────────
export default function Recommendations() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { orderID } = useLocalSearchParams<{ orderID: string }>();

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

  // 하트 애니메이션 값
  const scales = useRef<Record<string, Animated.Value>>({}).current;
  const getScale = (id: string) => {
    if (!scales[id]) scales[id] = new Animated.Value(1);
    return scales[id];
    };

  // (옵션) 메타데이터 백엔드에서 보완
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/flowers/${orderID}/from-to`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const remote: Partial<typeof meta> = await res.json();

        console.log("remote fetched:", remote);

        setMeta({
          giver: remote.flowerFrom ?? meta.giver,
          receiver: remote.flowerTo ?? meta.receiver,
          occasion: remote.occasion ?? meta.occasion,
        });
        console.log(`meta.giver => ${meta.giver}`)
      } catch (err) {
        console.error("fetch meta failed:", err);
      }
    })();
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/flowers/${orderID}/bouquet-similar`);
      if (res.status == 200){
        console.log(`success from ${BACKEND_URL}/flowers/${orderID}/bouquet-similar`)
      }
      const raw: BackendReco[] = await res.json();
      console.log(`${BACKEND_URL}/flowers/${orderID}/bouquet-similar`)
      console.log("raw")
      console.log(raw)
      const resData: Bouquet[] = raw.map((r: BackendReco) => ({
        id: String(r.id),
        title: r.name,
        imageBase64: r.imageBase64,
        imageUrl: r.imageUrl,
        palette: Array.isArray(r.rgb)
          ? r.rgb.map(([rr, gg, bb]: [number, number, number]) => `rgb(${rr}, ${gg}, ${bb})`)
          : [],
        floristName: r.floristName,
        score: typeof r.score === "number" ? r.score : undefined,
        tags: r.tags,
        price: r.price,
      }));
      setItems(resData.slice(0, 4));

    } catch (e) {
      setError("추천을 불러오는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  }, [fetchRecommendations]);

  // 카드 탭 → 결제(toss)로 이동
  async function onPressCard (item: Bouquet)  {
    //const orderId = `order_${Date.now()}_${item.id}`;
    const amount = item.price ?? 0;
    const orderName = item.title;
    const imageBase64 = item.imageBase64
    console.log("imageBase64")
    console.log(imageBase64)
    
    // 이미지 URL(로컬이면 resolveAssetSource로 변환)
    const imgUri = item.imageBase64
      ? LOCAL_BOUQUETS.r1
      : item.imageUrl || "";
      
      ////////////////////////부켓 선택시 해당 id로 가도록 POST/////////////////////////
      try {
        console.log(`Fetch To ${BACKEND_URL}/flowers/${orderID}/bouquet-selection`)
        console.log(`item.id => ${item.id}`)
        console.log(`imgUri => ${imgUri}`)

        const payload = {
          selectedBouquetId: item.id,
        };
        const response = await fetch(`${BACKEND_URL}/flowers/${orderID}/bouquet-selection`, 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const res = await response;
        console.log(res)

        if (res.status == 201) {
          // const data = res.json();
          console.log("POST 성공:");
          
        } else {
          console.log(" 데이터 응답 본문 없음");
          
}
        //console.log("ID:", data.id);
      } catch (e) {
        console.log("POST 실패:");
        console.log(e);
      }
      //////////////////////////////////////////////////////////////////////////////
    const bg = pickLightestFromPalette(item.palette, "#F5EFE3");

    router.push({
      pathname: "/confirm",
      params: {
        id: String(item.id),
        orderID : orderID,
        title: item.title ?? "",
        localKey: item.imageLocal ?? "",
        imgUri : imageBase64,
        imageUrl: item.imageUrl ? encodeURIComponent(item.imageUrl) : "",
        palette: JSON.stringify(item.palette ?? []),bg,
      },
    });
  };

  // router.push({
  //     pathname: "/toss",
  //     params: {
  //       orderId,
  //       amount: String(amount),
  //       orderName,
  //       image: encodeURIComponent(imgUri),
  //       successUrl: "gaehwa://payments/success",
  //       failUrl: "gaehwa://payments/fail",
  //     },
  //   });
  // };

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


// ── Card ─────────────────────────────────────────────────────────
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
  const imgSource: ImageSourcePropType | undefined =
    item.imageBase64
      ? { uri: `data:image/jpeg;base64,${item.imageBase64}` }
      : item.imageUrl
      ? { uri: item.imageUrl }
      : item.imageLocal
      ? LOCAL_BOUQUETS[item.imageLocal]
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

        {/* 좌상단 좋아요 버튼 (예시) */}
        <Animated.View style={[styles.likeBtn, { transform: [{ scale }] }]}>
          <Pressable onPress={onToggleLike} accessibilityLabel={liked ? "찜 해제" : "찜"}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color="#fff" />
          </Pressable>
        </Animated.View>

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

/** ---- Color utils: pick lightest from backend palette ---- */
const HEX_RE = /^#?([a-f\d]{3}|[a-f\d]{6})$/i;

function hexToRgbAny(hex: string) {
  const m = String(hex).trim().match(HEX_RE);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map(x => x + x).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}
function parseRgb(str: string) {
  const m = String(str).trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(",").map(s => s.trim());
  if (parts.length < 3) return null;
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  if ([r,g,b].some(v => Number.isNaN(v))) return null;
  return { r, g, b, a };
}
function hslToRgb(h:number, s:number, l:number){
  const c = (1 - Math.abs(2*l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r,g,b] = [0,0,0];
  if (0<=hp && hp<1) [r,g,b]=[c,x,0];
  else if (1<=hp && hp<2) [r,g,b]=[x,c,0];
  else if (2<=hp && hp<3) [r,g,b]=[0,c,x];
  else if (3<=hp && hp<4) [r,g,b]=[0,x,c];
  else if (4<=hp && hp<5) [r,g,b]=[x,0,c];
  else if (5<=hp && hp<6) [r,g,b]=[c,0,x];
  const m = l - c/2;
  return { r:(r+m)*255, g:(g+m)*255, b:(b+m)*255 };
}
function parseHsl(str:string){
  const m = String(str).trim().match(/^hsla?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(",").map(s => s.trim().replace("%",""));
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
  if ([h,s,l].some(v => Number.isNaN(v))) return null;
  const {r,g,b} = hslToRgb(h,s,l);
  return { r, g, b, a };
}
function parseColorAny(c:string){
  return hexToRgbAny(c) || parseRgb(c) || parseHsl(c);
}
function compositeOnWhite({r,g,b,a=1}:{r:number,g:number,b:number,a?:number}){
  const A = Math.max(0, Math.min(1, a));
  return {
    r: Math.round(r* A + 255*(1-A)),
    g: Math.round(g* A + 255*(1-A)),
    b: Math.round(b* A + 255*(1-A)),
  };
}
function srgbToLin(v:number){ v/=255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
function luminanceRGB({r,g,b}:{r:number,g:number,b:number}){
  const R=srgbToLin(r), G=srgbToLin(g), B=srgbToLin(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}
/** item.palette(백엔드)에서 가장 밝은 색 선택 */
function pickLightestFromPalette(palette?: string[], fallback="#F5EFE3"){
  const list = Array.isArray(palette) ? palette : [];
  if (list.length === 0) return fallback;
  let best = { col: fallback, lum: -1 };
  for (const c of list){
    const parsed = parseColorAny(c);
    if (!parsed) continue;
    const rgb = compositeOnWhite(parsed); // rgba도 흰배경으로 합성
    const L = luminanceRGB(rgb);
    if (L > best.lum) best = { col: c, lum: L };
  }
  return best.lum >= 0 ? best.col : fallback;
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /** Hero */
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
