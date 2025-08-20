import { useEffect, useState } from "react";
import {
  Image, StyleSheet, Dimensions, ActivityIndicator,
  Platform, Pressable, Text, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Random from "expo-random";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// iOS에서 세션 처리
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");
const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.08)";
const TEXT = "#1F2937";
const SUB = "#6b7280";
const DANBI = require("../assets/mascot/danbi_bouquet.png");

// 🔑 실제 클라이언트 ID
const BACKEND_URL = "http://4.240.103.29:8080"; 
const IOS_CLIENT_ID =
  "2775008760-83po6j3tmnjor9ttbnc8meg0me21haik.apps.googleusercontent.com";
const WEB_CLIENT_ID =
  "2775008760-cu5dcieaua1pcl96ilfcg7p8egn4kqsg.apps.googleusercontent.com";
const ANDROID_CLIENT_ID =
  "2775008760-dj5uto76ve22ja4v68lvslrk3vkl3dbl.apps.googleusercontent.com";

const FIREBASE_API_KEY = "AIzaSyDiECgmcmuSiHxESFLYNKayokU7gK03wfw";

const isExpoGo = Constants.appOwnership === "expo";
const redirectUri = isExpoGo
  ? "https://auth.expo.io/@passionseona/gaehwa"
  : makeRedirectUri({ scheme: "gaehwa" });

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const nonce = Random.getRandomBytes(16).join("");
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || undefined,
    redirectUri,
    scopes: ["openid","email", "profile","https://www.googleapis.com/auth/calendar"],
    responseType: "token id_token",
    usePKCE: false,
    extraParams: { nonce },
  });

  /** ====== Auth 결과 핸들링 ====== */
  useEffect(() => {
  (async () => {
    if (!response) return;
    if (response.type !== "success") return;

    const { id_token, access_token } = response.params as {
      id_token?: string;
      access_token?: string;
    };

    console.log("Google ID Token:", id_token);
    console.log("Google Access Token:", access_token);

    if (!id_token) {
      alert("로그인 실패: id_token 없음");
      return;
    }

    try {
      setLoading(true);

      // 🔐 Firebase 인증
      const firebaseUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;
      const payload = {
        postBody: `id_token=${id_token}&providerId=google.com`,
        requestUri: redirectUri || "http://localhost",
        returnIdpCredential: true,
        returnSecureToken: true,
      };

      const res = await fetch(firebaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      const firebaseIdToken = data.idToken;
      const firebaseRefreshToken = data.refreshToken;
      const displayName = data.displayName ?? data.email ?? "Unknown";

      // ✅ access_token 저장 (캘린더용)
      if (firebaseIdToken) await AsyncStorage.setItem("firebaseIdToken", firebaseIdToken);
      if (firebaseRefreshToken) await AsyncStorage.setItem("firebaseRefreshToken", firebaseRefreshToken);
      if (access_token) await AsyncStorage.setItem("googleAccessToken", access_token);
      await AsyncStorage.setItem("userName", displayName);

      router.replace("/calendar");
    } catch (err: any) {
      console.log("로그인 실패:", err?.message ?? err);
      alert("로그인 실패");
    } finally {
      setLoading(false);
    }
  })();
}, [response]);

  const onGoogleLogin = () => {
    if (!request) return;
    promptAsync();
  };

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

        {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#FB7431" />}
      </View>
    </View>
  );
}

const HERO_IMG_W = Math.min(340, width * 0.7);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, justifyContent: "space-between" },
  centerWrap: { alignItems: "center", paddingHorizontal: 24 },
  bubbleWrap: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  bubbleText: { fontSize: 16, fontWeight: "700", color: TEXT },
  bubbleTail: {
    position: "absolute", left: 22, bottom: -6, width: 12, height: 12,
    backgroundColor: WHITE, borderLeftWidth: 1, borderBottomWidth: 1,
    borderColor: BORDER, transform: [{ rotate: "45deg" }],
  },
  danbi: { width: HERO_IMG_W, height: HERO_IMG_W * 1.05 },
  subcopy: { marginTop: 10, fontSize: 13, color: SUB, textAlign: "center" },
  bottomBar: { paddingHorizontal: 20 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: WHITE, borderRadius: 999, paddingVertical: 14,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  googleText: { fontSize: 16, fontWeight: "800", color: TEXT },
});
