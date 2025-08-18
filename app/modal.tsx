// app/modal.tsx
// 수정 ? 
import React, { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { Text, View } from "@/components/Themed";

export default function ModalScreen() {
  // 간단한 축하 이모지 펄스 애니메이션
  const scale = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  const goHome = () => router.replace("/"); // 메인으로
  const goOrders = () => router.push("/orders"); // 주문내역 라우트(없다면 생성 예정)

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[styles.emoji, { transform: [{ scale }] }]}
        accessibilityRole="image"
        accessible
      >
        🎉
      </Animated.Text>

      <Text style={styles.title}>구매가 완료되었습니다</Text>
      <Text style={styles.subtitle}>
        소중한 마음을 잘 전할게요. 주문 상세는 언제든 확인할 수 있어요.
      </Text>

      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

      <View style={styles.actions}>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => [
            styles.btnSecondary,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="메인으로 이동"
        >
          <Text style={styles.btnSecondaryText}>메인으로</Text>
        </Pressable>

        <Pressable
          onPress={goOrders}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="주문내역 보기"
        >
          <Text style={styles.btnPrimaryText}>주문내역 보기</Text>
        </Pressable>
      </View>

      {/* iOS 모달 상단 여백 대비 밝은 상태바 */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const BTN_H = 48;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
  },
  separator: {
    marginVertical: 22,
    height: 1,
    width: "86%",
    borderRadius: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    marginTop: 4,
  },
  btnPrimary: {
    minWidth: 140,
    height: BTN_H,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#43B0FF", // 프로젝트 로고 색상 맞춤
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnSecondary: {
    minWidth: 120,
    height: BTN_H,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
