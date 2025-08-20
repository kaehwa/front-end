import { useEffect, useState } from "react";
import {
  Image, StyleSheet, Dimensions, ActivityIndicator,
  Pressable, Text, View, ScrollView, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";

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

interface GoogleCalendar {
  id: string;
  summary: string;
  timeZone?: string;
  [key: string]: any;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);

  const [request, response, promptAsync] = Google.useAuthRequest({
      androidClientId: ANDROID_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
  
    // 로그인 후 access token 저장
    useEffect(() => {
      if (response?.type === 'success') {
        const { authentication } = response;
        if (!authentication?.accessToken) return;
        setAccessToken(authentication.accessToken);
  
        // 사용자 정보 가져오기
        fetchUserInfo(authentication.accessToken);
      }
    }, [response]);
  
    const fetchUserInfo = async (token: string) => {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUserInfo(data);
      console.log("User Set DONE")
    };

  // 내 primary 캘린더의 이벤트 모두 가져오기
 const fetchMyEvents = async () => {
    if (!accessToken) return;
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    setCalendars(data.items || []);
    console.log(data.items); // 여기 안에 내가 입력한 모든 일정이 들어있음
    console.log("Load Calendar DONE")
  };


  const handleSignOut = () => {
    setUserInfo(null);
    setCalendars([]);
    setAccessToken(null);
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
        {!accessToken ? (
          <Pressable
            onPress={async () => {
              if (!request) return;
              setLoading(true);
              await promptAsync();
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
        ) : (
          <>
            <Pressable
              onPress={fetchMyEvents}
              style={[styles.googleBtn, { marginBottom: 8 }]}
            >
              <Text style={styles.googleText}>캘린더 이벤트 불러오기</Text>
            </Pressable>
            <Pressable onPress={handleSignOut} style={styles.googleBtn}>
              <Text style={styles.googleText}>로그아웃</Text>
            </Pressable>
          </>
        )}

        <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
          {calendars.length === 0 ? (
            <Text style={styles.text}>No calendars</Text>
          ) : (
            (() => {
              const lastCal = calendars[calendars.length - 1];
              return (
                <>
                  <Text style={styles.text}>summary: {lastCal.summary || '(No summary)'}</Text>
                  <Text style={styles.text}>description: {lastCal.description || '(No description)'}</Text>
                </>
              );
            })()
          )}
        </ScrollView>
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
  text: { fontSize: 16, marginVertical: 4 },
});
