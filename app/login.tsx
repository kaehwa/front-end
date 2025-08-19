// app/login.tsx (예시)
import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.08)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const ACCENT = "#7A958E";

const DANBI = require("../assets/mascot/danbi_bouquet.png"); // 🔸 단비(꽃다발+꽃핀) 최종 PNG
// 참고: 임시로 기존 이미지 쓰려면 require("../assets/mascot/danbi.png")

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const onGoogleLogin = () => {
    // TODO: 구글 로그인 핸들러 연결
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 상단 여백 */}
      <View style={{ height: 12 }} />

      {/* 중앙: 단비 + 말풍선 */}
      <View style={styles.centerWrap}>

        {/* 말풍선 */}
        <View style={styles.bubbleWrap} accessible accessibilityRole="text">
          <Text style={styles.bubbleText}>어서 와요, 기다리고 있었어요!</Text>
          <View style={styles.bubbleTail} />
        </View>

        {/* 단비(꽃다발 들고, 머리 꽃핀 달린 PNG) */}
        <Image
          source={DANBI}
          resizeMode="contain"
          style={styles.danbi}
          accessibilityLabel="꽃다발을 건네는 단비"
        />

        {/* 보조 문구 */}
        <Text style={styles.subcopy}>
          오늘도 당신의 순간이 꽃처럼 피어나길 바라요 🌸
        </Text>
      </View>

      {/* 하단 고정: 구글 로그인 */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={onGoogleLogin}
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
          ]}
          accessibilityLabel="Google 계정으로 로그인"
        >
          <Ionicons name="logo-google" size={20} color="#4175DF" style={{ marginRight: 10 }} />
          <Text style={styles.googleText}>Google로 계속하기</Text>
        </Pressable>

        <Text style={styles.terms}>
          계속하면 서비스 약관 및 개인정보처리방침에 동의하게 됩니다.
        </Text>
      </View>
    </View>
  );
}

/* ===== styles ===== */
const HERO_IMG_W = Math.min(340, width * 0.7);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "space-between",
  },
  centerWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
  },

  // 말풍선
  bubbleWrap: {
    maxWidth: Math.min(420, width - 48),
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
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
  bubbleText: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },
  bubbleTail: {
    position: "absolute",
    left: 22,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: WHITE,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    transform: [{ rotate: "45deg" }],
  },

  // 단비 이미지
  danbi: {
    width: HERO_IMG_W,
    height: HERO_IMG_W * 1.05,
  },

  subcopy: {
    marginTop: 10,
    fontSize: 13,
    color: SUB,
    textAlign: "center",
  },

  // 하단 고정 바
  bottomBar: {
    paddingHorizontal: 20,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
    borderRadius: 999,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  googleText: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  terms: {
    marginTop: 12,
    fontSize: 11,
    color: SUB,
    textAlign: "center",
  },
});
