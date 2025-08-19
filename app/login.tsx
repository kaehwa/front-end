import React, { useEffect } from "react";
import {
  View, Text, Image, Pressable, StyleSheet, Dimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

// iOS에서 세션 처리
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");
const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.08)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const ACCENT = "#7A958E";
const DANBI = require("../assets/mascot/danbi_bouquet.png");

// 🔑 실제 클라이언트 ID
const WEB_CLIENT_ID = "936321092508-8j7f8k628ot253gvcro85q15j8nfc3oc.apps.googleusercontent.com";
const IOS_CLIENT_ID = "936321092508-a15j26ok3i3ivjp3cjinkr86fvdvrrol.apps.googleusercontent.com";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  // iOS + Web만 연결
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    redirectUri: makeRedirectUri({
      //useProxy: true, // Expo Go/Web 테스트 시 안전
      // Dev Client/스토어 빌드에서는 useProxy:false + scheme:"gaehwa"
    }),
    scopes: ["openid", "profile", "email"], // 기본 스코프
  });

  const onGoogleLogin = () => {
    if (!request) return;
    promptAsync({showInRecents: true });
  };

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication, params } = response;
      console.log("✅ AccessToken:", authentication?.accessToken);
      console.log("✅ IDToken:", params?.id_token);

      // TODO: 백엔드로 토큰 보내서 세션 생성
      router.replace("/main"); // 로그인 후 이동할 화면
    }
  }, [response]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={{ height: 12 }} />

      {/* 말풍선 */}
      <View style={styles.centerWrap}>
        <View style={styles.bubbleWrap}>
          <Text style={styles.bubbleText}>어서 와요, 기다리고 있었어요!</Text>
          <View style={styles.bubbleTail} />
        </View>

        {/* 단비 */}
        <Image source={DANBI} resizeMode="contain" style={styles.danbi} />

        <Text style={styles.subcopy}>오늘도 당신의 순간이 꽃처럼 피어나길 바라요 </Text>
      </View>

      {/* 하단: 구글 로그인 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={onGoogleLogin}
          disabled={!request}
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
            !request && { opacity: 0.6 },
          ]}
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
  container: { flex: 1, backgroundColor: BG, justifyContent: "space-between" },
  centerWrap: { alignItems: "center", paddingHorizontal: 24 },
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
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  bubbleText: { fontSize: 16, fontWeight: "700", color: TEXT },
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
  danbi: { width: HERO_IMG_W, height: HERO_IMG_W * 1.05 },
  subcopy: { marginTop: 10, fontSize: 13, color: SUB, textAlign: "center" },
  bottomBar: { paddingHorizontal: 20 },
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
  googleText: { fontSize: 16, fontWeight: "800", color: TEXT },
  terms: { marginTop: 12, fontSize: 11, color: SUB, textAlign: "center" },
});
