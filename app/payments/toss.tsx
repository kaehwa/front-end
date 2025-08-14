// app/payments/toss.tsx
// 필요 패키지 설치:  npx expo install react-native-webview

import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
// 타입은 내부 경로에서 import
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Params = {
  orderId?: string;
  amount?: string;       // "68000" 같은 문자열
  orderName?: string;    // 주문명(상품명)
  successUrl?: string;   // 예: gaehwa://payments/success
  failUrl?: string;      // 예: gaehwa://payments/fail
};

export default function TossPayment() {
  const { orderId, amount, orderName, successUrl, failUrl } =
    useLocalSearchParams<Params>();

  // 필수 파라미터 검증 (서버에서 받은 값으로 들어오는 것이 일반적)
  const paramError = useMemo(() => {
    if (!orderId) return "orderId가 없습니다.";
    if (!amount) return "amount가 없습니다.";
    if (!orderName) return "orderName이 없습니다.";
    if (!successUrl) return "successUrl이 없습니다.";
    if (!failUrl) return "failUrl이 없습니다.";
    return null;
  }, [orderId, amount, orderName, successUrl, failUrl]);

  // 실제로는 백엔드가 사전서명/검증을 거친 결제 시작 URL을 내려주는 것이 안전합니다.
  // 여기서는 데모용으로 백엔드 스타트 URL을 합성해 둡니다.
  const startUrl = useMemo(() => {
    const base = "https://your-backend.example.com/payments/toss/start";
    const q = new URLSearchParams({
      orderId: orderId ?? "",
      amount: amount ?? "",
      orderName: orderName ?? "",
      successUrl: successUrl ?? "",
      failUrl: failUrl ?? "",
    }).toString();
    return `${base}?${q}`;
  }, [orderId, amount, orderName, successUrl, failUrl]);

  // iOS/Android 모두에서 성공/실패 리다이렉트 감지
  const handleNav = (nav: WebViewNavigation) => {
    const url = nav.url || "";
    if (url.startsWith(successUrl ?? "")) {
      // 결제 성공 → 카드 화면으로 이동 (orderId로 식별)
      router.replace({ pathname: "/card", params: { id: orderId ?? "" } });
    } else if (url.startsWith(failUrl ?? "")) {
      // 결제 실패 → 체크아웃으로 복귀
      Alert.alert("결제 실패", "결제를 완료하지 못했습니다. 다시 시도해 주세요.");
      router.replace("/checkout");
    }
  };

  // iOS에서는 딥링크/스킴 차단을 위해 shouldStart에서 먼저 필터링하면 더 안정적
  const shouldStart = (req: any) => {
    const url: string = req?.url ?? "";
    if (successUrl && url.startsWith(successUrl)) {
      router.replace({ pathname: "/card", params: { id: orderId ?? "" } });
      return false; // WebView가 이 URL을 로드하지 않게 막음
    }
    if (failUrl && url.startsWith(failUrl)) {
      Alert.alert("결제 실패", "결제를 완료하지 못했습니다. 다시 시도해 주세요.");
      router.replace("/checkout");
      return false;
    }
    return true;
  };

  if (paramError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{paramError}</Text>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => router.replace("/checkout")}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상단 간단 헤더(선택) */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="뒤로가기">
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>결제 진행</Text>
        <View style={{ width: 40 }} />
      </View>

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
        // iOS에서 딥링크 차단/가로채기
        onShouldStartLoadWithRequest={Platform.OS === "ios" ? shouldStart : undefined}
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  loadingText: { marginTop: 12, color: "#666" },
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
