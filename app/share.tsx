// app/share.tsx
import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Dimensions, Platform, Alert
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing"; // 네이티브 폴백용(선택)
import * as FileSystem from "expo-file-system"; // 이미지 파일 폴백용(선택)
import { useLocalSearchParams } from "expo-router";

const { width } = Dimensions.get("window");
const W = Math.min(420, width - 24);

export default function ShareScreen() {
  // card.tsx에서 넘겨줄 값들
  const {
    title = "꽃카드가 도착했어요!",
    text  = "000님이 보낸 꽃카드가 도착했어요! 확인해보시겠어요?",
    url   = "https://47664cc53961.ngrok-free.app/",
    image = "", // (선택) 썸네일 이미지의 HTTPS 공개 URL
  } = useLocalSearchParams<{ title?: string; text?: string; url?: string; image?: string }>();

  const [busy, setBusy] = useState(false);

  const webShare = useCallback(async () => {
    // Web Share API (모바일 웹, https/localhost 에서만 동작)
    // 이미지까지 붙이려면 canShare + File 필요 (iOS 16+/안드 13+)
    let files: File[] | undefined;

    if (typeof window !== "undefined" && image) {
      try {
        const res = await fetch(String(image), { mode: "cors" });
        const blob = await res.blob();
        const fname = image.split("/").pop() || "thumb.jpg";
        const file = new File([blob], fname, { type: blob.type || "image/jpeg" });
        if ((navigator as any).canShare?.({ files: [file] })) {
          files = [file];
        }
      } catch {
        // CORS 불가/미지원 시 이미지 없이 공유
      }
    }

    if ("share" in navigator) {
      const data: any = { title, text: `${text}\n\n${url}`, url };
      if (files) data.files = files;
      await (navigator as any).share(data);
      return true;
    }
    return false;
  }, [title, text, url, image]);

  const nativeFallback = useCallback(async () => {
    // 네이티브 앱일 때(Expo), 혹은 Web Share 미지원 시 폴백
    // 1) expo-sharing 사용 가능하면 시스템 공유
    if (await Sharing.isAvailableAsync()) {
      try {
        // 이미지까지 공유하고 싶다면 임시 파일 저장 후 공유
        if (image) {
          const local = FileSystem.cacheDirectory + (image.split("/").pop() || "thumb.jpg");
          await FileSystem.downloadAsync(String(image), local);
          await Sharing.shareAsync(local, { dialogTitle: title });
          return;
        }
      } catch {/* 무시하고 메시지 공유로 폴백 */}
    }
    // 2) 메시지 문자열 공유(간단 폴백)
    await Clipboard.setStringAsync(`${text}\n\n${url}`);
    Alert.alert("링크 복사됨", "클립보드에 복사했어요. 공유할 앱에 붙여넣기 하세요.");
  }, [title, text, url, image]);

  const onShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        const ok = await webShare();    // 웹이면 Web Share 우선
        if (!ok) await nativeFallback(); // 미지원이면 폴백
      } else {
        await nativeFallback();          // 네이티브는 폴백 경로
      }
    } finally {
      setBusy(false);
    }
  }, [busy, webShare, nativeFallback]);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onShare}
        disabled={busy}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
      >
        <Text style={styles.btnText}>{busy ? "공유 준비 중..." : "공유하기"}</Text>
      </Pressable>
      <Text style={styles.help}>
        모바일 Safari/Chrome(HTTPS)에서는 네이티브 공유 시트가 열립니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  btn: {
    width: W, backgroundColor: "#111827", borderRadius: 12, paddingVertical: 16,
    alignItems: "center", justifyContent: "center"
  },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  help: { marginTop: 10, fontSize: 12, color: "#6b7280" },
});
