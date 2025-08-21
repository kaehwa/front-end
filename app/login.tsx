// app/login.tsx
import { useEffect, useState } from "react";
import {
  Image, StyleSheet, Dimensions, ActivityIndicator,
  Pressable, Text, View, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");
const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.08)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const DANBI = require("../assets/mascot/danbi_bouquet.png");

// 🔑 실제 클라이언트 ID
const IOS_CLIENT_ID = "2775008760-83po6j3tmnjor9ttbnc8meg0me21haik.apps.googleusercontent.com";
const WEB_CLIENT_ID = "2775008760-cu5dcieaua1pcl96ilfcg7p8egn4kqsg.apps.googleusercontent.com";
const ANDROID_CLIENT_ID = "2775008760-dj5uto76ve22ja4v68lvslrk3vkl3dbl.apps.googleusercontent.com";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly"
    ],
  });

  // 로그인 후 access token 저장 + 다음 화면으로 이동
  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;
      const token = response.authentication?.accessToken;
      if (!token) return;

      // 사용자 정보 가져오기
      const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => null);

      await AsyncStorage.setItem("googleAccessToken", token);
      if (me) await AsyncStorage.setItem("googleUser", JSON.stringify(me));

      // ✅ 로그인 화면에서는 끝. 캘린더 화면으로 네비게이트
      router.replace("/calendar");
    })();
  }, [response]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.centerWrap}>
        <View style={styles.bubbleWrap}>
          <Text style={styles.bubbleText}>어서 와요, 기다리고 있었어요!</Text>
          <View style={styles.bubbleTail} />
        </View>

        <Image source={DANBI} resizeMode="contain" style={styles.danbi} />
        <Text style={styles.subcopy}>오늘도 당신의 순간이 꽃처럼 피어나길 바라요</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={async () => {
            if (!request) return;
            setLoading(true);
            try {
              await promptAsync();
            } finally {
              setLoading(false);
            }
          }}
          disabled={!request || loading}
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
            (!request || loading) && { opacity: 0.6 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#4175DF" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#4175DF" style={{ marginRight: 10 }} />
              <Text style={styles.googleText}>Google로 계속하기</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const HERO_IMG_W = Math.min(340, width * 0.7);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, justifyContent: "space-between" },
  centerWrap: { alignItems: "center", paddingHorizontal: 24 },
  bubbleWrap: {
    backgroundColor: WHITE, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 12,
  },
  bubbleText: { fontSize: 16, fontWeight: "700", color: TEXT },
  bubbleTail: {
    position: "absolute", left: 22, bottom: -6, width: 12, height: 12,
    backgroundColor: WHITE, borderLeftWidth: 1, borderBottomWidth: 1,
    borderColor: BORDER, transform: [{ rotate: "45deg" }],
  },
  danbi: { width: HERO_IMG_W, height: HERO_IMG_W * 1.05 },
  subcopy: { marginTop: 1, fontSize: 13, color: SUB, textAlign: "center" },
  bottomBar: { paddingHorizontal: 20 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: WHITE, borderRadius: 999, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  googleText: { fontSize: 16, fontWeight: "800", color: TEXT },
});
