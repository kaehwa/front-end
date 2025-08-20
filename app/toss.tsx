// app/payments/toss.tsx
// 필요 패키지: npx expo install react-native-webview

import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Params = {
  orderId?: string;
  amount?: string;       // "68000"
  orderName?: string;    // 주문명
  successUrl?: string;   // gaehwa://payments/success
  failUrl?: string;      // gaehwa://payments/fail
  image?: string;        // encodeURIComponent 된 이미지 URL (추천에서 전달)
};

export default function TossPayment() {
  const router = useRouter();
  const { orderId, amount, orderName, successUrl, failUrl, image } =
    useLocalSearchParams<Params>();

  // 썸네일 렌더용: decode 해서 실제 표시
  const imageUri = useMemo(() => {
    if (!image) return "";
    try { return decodeURIComponent(String(image)); }
    catch { return String(image); }
  }, [image]);

  const priceNumber = useMemo(() => Number(amount ?? 0), [amount]);

  // 필수 파라미터 검증
  const paramError = useMemo(() => {
    if (!orderId) return "orderId";
    if (!amount) return "amount";
    if (!orderName) return "orderName";
    if (!successUrl) return "successUrl";
    if (!failUrl) return "failUrl";
    return null;
  }, [orderId, amount, orderName, successUrl, failUrl]);

  // ✅ 파라미터 오류면 화면 노출 없이 즉시 /checkout으로 이동
  useEffect(() => {
    if (paramError) router.replace("/checkout");
  }, [paramError, router]);

  // (정상 케이스) 결제 시작 URL — 서버에도 image 원본 파라미터 전달(인코딩 상태 그대로)
  const startUrl = useMemo(() => {
    const base = "https://your-backend.example.com/payments/toss/start";
    const q = new URLSearchParams({
      orderId: orderId ?? "",
      amount: amount ?? "",
      orderName: orderName ?? "",
      successUrl: successUrl ?? "",
      failUrl: failUrl ?? "",
      image: (image as string) ?? "", // 서버에서 decode 후 사용
    }).toString();
    return `${base}?${q}`;
  }, [orderId, amount, orderName, successUrl, failUrl, image]);

  const handleNav = (nav: WebViewNavigation) => {
    const url = nav.url || "";
    if (successUrl && url.startsWith(successUrl)) {
      router.replace({ pathname: "/card", params: { id: orderId ?? "" } });
    } else if (failUrl && url.startsWith(failUrl)) {
      Alert.alert("결제 실패", "결제를 완료하지 못했습니다. 다시 시도해 주세요.");
      router.replace("/checkout");
    }
  };

  const shouldStart = (req: any) => {
    const url: string = req?.url ?? "";
    if (successUrl && url.startsWith(successUrl)) {
      router.replace({ pathname: "/card", params: { id: orderId ?? "" } });
      return false;
    }
    if (failUrl && url.startsWith(failUrl)) {
      Alert.alert("결제 실패", "결제를 완료하지 못했습니다. 다시 시도해 주세요.");
      router.replace("/checkout");
      return false;
    }
    return true;
  };

  // ⚠️ paramError인 동안은 아무것도 렌더하지 않음(즉시 redirect)
  if (paramError) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="뒤로가기"
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>결제 진행</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ░ 주문 요약 바: 추천에서 선택한 꽃다발 사진/이름/금액 표시 ░ */}
      {(imageUri || orderName || amount) ? (
        <View style={styles.summaryBar}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: "#F3F4F6" }]} />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.prodTitle} numberOfLines={1}>
              {orderName}
            </Text>
            <Text style={styles.prodPrice}>
              {priceNumber.toLocaleString()}원
            </Text>
          </View>
        </View>
      ) : null}

      {/* 결제 WebView */}
      <WebView
        source={{ uri: startUrl }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>결제창을 불러오는 중…</Text>
          </View>
        )}
        onNavigationStateChange={handleNav}
        onShouldStartLoadWithRequest={Platform.OS === "ios" ? shouldStart : undefined}
        style={{ flex: 1 }}
      />
    </View>
  );
}

/* ------------- styles ------------- */
const styles = StyleSheet.create({
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
    fontSize: 15,
  },

  /** 주문 요약 바 */
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFEF",
    backgroundColor: "#fff",
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#EEE",
  },
  prodTitle: {
    fontWeight: "800",
    color: "#111827",
  },
  prodPrice: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  loadingText: { marginTop: 12, color: "#666" },

  // (아래는 기존 스타일 유지)
  errorText: { color: "#b91c1c", textAlign: "center", marginBottom: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnPrimary: { backgroundColor: "#0a84ff" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});
