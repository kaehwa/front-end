import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Share,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
 
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_W = Math.min(380, width - 32);

type Params = {
  id?: string;               // 주문/카드 id
  orderId?: string;          // 주문번호 (선택)
  recipient?: string;        // 받는 분 이름
  deliveryDate?: string;     // ISO 또는 YYYY-MM-DD
  title?: string;            // 상품명
  imageUrl?: string;         // 썸네일
  shareUrl?: string;         // 카드 공유 링크
  buyerName?: string;        // 보낸 사람 이름(예: 용자님)
};

export default function PurchaseSuccess() {
  const insets = useSafeAreaInsets();
  const {
    id,
    orderId,
    recipient,
    deliveryDate,
    title,
    imageUrl,
    shareUrl,
    buyerName,
  } = useLocalSearchParams<Params>();

  // 날짜 MM.DD 포맷
  const mmdd = useMemo(() => {
    if (!deliveryDate) return "00.00";
    const d = new Date(deliveryDate);
    if (isNaN(d.getTime())) return "00.00";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}.${dd}`;
  }, [deliveryDate]);

  // 축하 애니메이션 (체크 아이콘)
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]),
      Animated.timing(scale, { toValue: 1.05, duration: 140, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  const composeShareText = () => {
    const sender = buyerName ? `${buyerName}` : "보낸 사람";
    const who = recipient ? `${recipient}님` : "소중한 분께";
    const link = shareUrl ? `\n\n카드 보러가기: ${shareUrl}` : "";
    return `${sender}이(가) 꽃다발과 음성 메시지 카드를 선물하셨습니다.\n${mmdd} 일에 배송으로 받아보실 수 있습니다.${link}`;
  };

  const onShare = async () => {
    try {
      await Share.share({ message: composeShareText() });
    } catch {
      Alert.alert("공유 실패", "다시 시도해 주세요.");
    }
  };

  const goCard = () => {
    router.replace({ pathname: "/card", params: { id } });
  };

  return (
    <View style={styles.page}>

      {/* 상단 축하 영역 */}
      <View style={styles.hero}>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={28} color="#fff" />
          </View>
        </Animated.View>
        <Text style={styles.title}>구매가 완료되었습니다. 감사합니다</Text>
        <Text style={styles.subtitle}>
          {mmdd} 배송 예정{recipient ? ` • 받는 분 ${recipient}` : ""}
        </Text>
      </View>

      {/* 주문 요약 카드 */}
      <View style={[styles.card, { width: CARD_W }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>주문 요약</Text>
          {orderId ? <Text style={styles.orderId}>#{orderId}</Text> : null}
        </View>

        <View style={styles.row}>
          <Image
            source={{ uri: imageUrl ?? "https://via.placeholder.com/100x100?text=Bouquet" }}
            style={styles.thumb}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.product} numberOfLines={1}>
              {title ?? "선택한 꽃다발"}
            </Text>
            <Text
              style={styles.desc}
              numberOfLines={2}
            >
              카드가 준비되었어요. {recipient ? `${recipient}님께 ` : ""}{mmdd}에 마음을 전합니다.
            </Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.noticeText}>
            화면에 보이는 꽃다발과 실제 꽃다발은 계절·공급 상황에 따라 일부 차이가 있을 수 있어요.
          </Text>
        </View>
      </View>

      {/* 하단 고정 액션 바 */}
      <View style={[styles.actionsBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={[styles.actionBtn, styles.actionGhost]} onPress={onShare}>
          <Ionicons name="share-social-outline" size={18} color="#0a84ff" />
          <Text style={styles.actionGhostText}>공유하기</Text>
        </Pressable>

        <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={goCard}>
          <Ionicons name="card-outline" size={18} color="#fff" />
          <Text style={styles.actionPrimaryText}>카드 보러가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F7F6F2",
    alignItems: "center",
    paddingTop: 24,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0a84ff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },

  card: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  orderId: { fontSize: 12, color: "#6b7280" },

  row: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 10 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#e5e7eb" },
  product: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  desc: { marginTop: 4, fontSize: 12, color: "#6b7280" },

  notice: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFB",
    marginTop: 12,
  },
  noticeText: { color: "#4b5563", fontSize: 12, flexShrink: 1 },

  actionsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  
  actionPrimary: { backgroundColor: "#0a84ff" },
  actionPrimaryText: { color: "#fff", fontWeight: "800" },
  actionGhost: { backgroundColor: "#eef2ff" },
  actionGhostText: { color: "#0a84ff", fontWeight: "800" },
});
