import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Text,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
const DANBI_SIZE = 160;
const RESERVED_BAR_H = 96; // 하단 고정 바 여유

export default function DanbiAsking() {
  const insets = useSafeAreaInsets();

  const bob = useRef(new Animated.Value(0)).current;        // 단비 호흡
  const blink = useRef(new Animated.Value(0)).current;      // 눈 깜빡임
  const bubbleScale = useRef(new Animated.Value(0.85)).current; // 말풍선 팝인
  const bubbleFloat = useRef(new Animated.Value(0)).current; // 말풍선 플로팅(상하)

  useEffect(() => {
    // 단비 호흡
    const bobAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 1600, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    bobAnim.start();

    // 단비 깜빡임
     let timer: ReturnType<typeof setTimeout> | null = null;

  const loopBlink = () => {
    const wait = 2500 + Math.random() * 2500;
    timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start(() => loopBlink());
    }, wait);
  };
  loopBlink();

    // 말풍선: 팝인 + 플로팅
    Animated.spring(bubbleScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 160,
      mass: 0.6,
    }).start();
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleFloat, { toValue: -4, duration: 1400, useNativeDriver: true }),
        Animated.timing(bubbleFloat, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    floatAnim.start();

    return () => {
      bobAnim.stop();
      floatAnim.stop();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <View style={styles.screen}>
      {/* 상단 카피 */}
      <View style={styles.topCopy}>
        <View style={styles.pillRow}>
          <Ionicons name="checkmark-circle" size={18} color="#ffab10ff" />
          <Text style={styles.pillTxt}>주문 준비 완료</Text>
        </View>
        <Text style={styles.headSub}>꽃과 메시지로 주문을 준비해둘게요.</Text>
      </View>

      {/* 본문: 말풍선 + 단비 */}
      <View style={styles.content}>
        {/* 말풍선 */}
        <Animated.View
          style={[
            styles.bubbleWrap,
            {
              transform: [
                { translateY: bubbleFloat },
                { scale: bubbleScale },
              ],
            },
          ]}
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleTxt}>이 마음, 결제로 이어볼까요?</Text>
          </View>
          {/* 꼬리 */}
          <View style={styles.tailContainer}>
            <View style={styles.tailSquare} />
          </View>
        </Animated.View>

        {/* 단비 */}
        <Animated.View style={{ transform: [{ translateY: bob }] }}>
          <Image
            source={require("../assets/mascot/danbi_payment.png")}
            style={styles.danbi}
          />
          <Animated.Image
            source={require("../assets/mascot/danbi_payment.png")}
            style={[styles.eyelids, { opacity: blink }]}
          />
        </Animated.View>

        {/* 하단 안내 (본문) */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, paddingBottom: RESERVED_BAR_H }}>
          <Text style={styles.noteSub}>
            결제는 다음 단계에서 진행돼요.
          </Text>
        </View>
      </View>

      {/* 버튼 영역 (하단 고정) */}
      <View
        style={[
          styles.actionsBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <Pressable
          onPress={() => router.push("/card")}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          hitSlop={8}
        >
          <Text style={styles.secondaryTxt}>조금 더 둘러볼게요</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/toss")}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          hitSlop={8}
        >
          <Text style={styles.primaryTxt}>다음</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F6F3" },

  topCopy: { alignItems: "center", paddingTop: 50, paddingHorizontal: 20, gap: 8 },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff081ff",
    borderColor: "#ffb12bff",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillTxt: { fontSize: 12, fontWeight: "700", color: "#000000ff" },
  headSub: { marginTop: 2, fontSize: 13, color: "#475569" },

  content: { flex: 1, alignItems: "center", justifyContent: "center" },

  // 말풍선
  bubbleWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  bubble: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxWidth: Math.min(320, width - 48),
    // 그림자
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bubbleTxt: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  tailContainer: {
    width: 16,
    height: 10,
    alignItems: "center",
  },
  tailSquare: {
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    transform: [{ rotate: "45deg" }],
    top: -6,
  },

  danbi: { width: DANBI_SIZE, height: DANBI_SIZE, resizeMode: "contain" },
  eyelids: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DANBI_SIZE,
    height: DANBI_SIZE,
    resizeMode: "contain",
  },
  noteSub: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#64748B" },

  actionsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderColor: "#CBD5E1",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryTxt: { fontSize: 15, fontWeight: "700", color: "#334155" },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#111827",
  },
  primaryTxt: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
