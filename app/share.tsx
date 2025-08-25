// // app/share.tsx
// import React, { useCallback, useState } from "react";
// import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Alert, Share as RNShare } from "react-native";
// import * as Clipboard from "expo-clipboard";
// import { useLocalSearchParams } from "expo-router";
// import { shareFeedTemplate } from "@react-native-kakao/share";

// const { width } = Dimensions.get("window");
// const W = Math.min(420, width - 24);

// export default function ShareScreen() {
//   const {
//     id = "preview",
//     title = "단비의 꽃카드",
//     text  = "메시지 카드가 도착했어요. 눌러서 확인해보세요!",
//     url   = `https://gaehwa.app/invite/${id}`,
//     image = "https://gaehwa.app/og/default_danbi.png",
//   } = useLocalSearchParams<{ id?: string; title?: string; text?: string; url?: string; image?: string }>();

//   const [busy, setBusy] = useState(false);

//   const onShareKakao = useCallback(async () => {
//     if (busy) return;
//     setBusy(true);
//     try {
//       await shareFeedTemplate({
//         template: {
//           content: {
//             title,
//             description: text,
//             imageUrl: String(image),
//             link: {
//               webUrl: String(url),
//               mobileWebUrl: String(url),
//               // ✅ 문자열이 아니라 객체로!
//               androidExecutionParams: { id: String(id) },
//               iosExecutionParams: { id: String(id) },
//             },
//           },
//           buttons: [
//             {
//               title: "메시지 카드 열기",
//               link: {
//                 webUrl: String(url),
//                 mobileWebUrl: String(url),
//                 androidExecutionParams: { id: String(id) }, // ✅
//                 iosExecutionParams: { id: String(id) },     // ✅
//               },
//             },
//           ],
//         },
//         useWebBrowserIfKakaoTalkNotAvailable: true,
//         // serverCallbackArgs?: { [k: string]: string } 도 같은 규칙 (필요 시 객체로)
//       });
//     } catch (e) {
//       // 카카오톡 미설치/오류 시 시스템 공유로 폴백
//       try {
//         if (Platform.OS === "ios") {
//           await RNShare.share({ title, message: text, url: String(url) });
//         } else {
//           await RNShare.share({ title, message: `${text}\n\n${url}` });
//         }
//       } catch {
//         await Clipboard.setStringAsync(`${text}\n\n${url}`);
//         Alert.alert("링크 복사됨", "공유할 앱에 붙여넣기 해주세요.");
//       }
//     } finally {
//       setBusy(false);
//     }
//   }, [busy, title, text, url, image, id]);

//   return (
//     <View style={styles.wrap}>
//       <Pressable onPress={onShareKakao} disabled={busy}
//         style={({ pressed }) => [styles.btnKakao, (pressed || busy) && { opacity: 0.9 }]}
//       >
//         <Text style={styles.btnKakaoText}>{busy ? "카카오 열기..." : "카카오톡으로 보내기"}</Text>
//       </Pressable>
//       <Text style={styles.help}>카톡 카드(사진+문구+버튼)로 공유됩니다. 미설치 시 브라우저로 열려요.</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", padding: 16 },
//   btnKakao: {
//     width: W, backgroundColor: "#FFEB00", borderRadius: 12, paddingVertical: 14,
//     alignItems: "center", justifyContent: "center"
//   },
//   btnKakaoText: { color: "#3D1E1E", fontWeight: "900", fontSize: 16 },
//   help: { marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center" },
// });


// app/share.tsx
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Alert, Share as RNShare } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { shareFeedTemplate } from "@react-native-kakao/share";

const { width } = Dimensions.get("window");
const W = Math.min(420, width - 24);

export default function ShareScreen() {
  const {
    id = "preview",
    title = "단비의 꽃카드",
    text  = "메시지 카드가 도착했어요. 눌러서 확인해보세요!",
    url   = `https://gaehwa.app/invite/${id}`,
    image = "https://gaehwa.app/og/default_danbi.png",
  } = useLocalSearchParams<{ id?: string; title?: string; text?: string; url?: string; image?: string }>();

  const [busy, setBusy] = useState(false);

  const onShareKakao = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        // 웹에서는 브라우저 카카오 공유 링크 열기
        const kakaoWebUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        window.open(kakaoWebUrl, "_blank");
      } else {
        await shareFeedTemplate({
          template: {
            content: {
              title,
              description: text,
              imageUrl: String(image),
              link: {
                webUrl: String(url),
                mobileWebUrl: String(url),
                androidExecutionParams: { id: String(id) },
                iosExecutionParams: { id: String(id) },
              },
            },
            buttons: [
              {
                title: "메시지 카드 열기",
                link: {
                  webUrl: String(url),
                  mobileWebUrl: String(url),
                  androidExecutionParams: { id: String(id) },
                  iosExecutionParams: { id: String(id) },
                },
              },
            ],
          },
          useWebBrowserIfKakaoTalkNotAvailable: true,
        });
      }
    } catch (e) {
      // 모바일 앱 공유 실패 시 시스템 공유로 폴백
      try {
        if (Platform.OS === "ios") {
          await RNShare.share({ title, message: text, url: String(url) });
        } else if (Platform.OS === "android") {
          await RNShare.share({ title, message: `${text}\n\n${url}` });
        } else {
          // 웹 클립보드
          await Clipboard.setStringAsync(`${text}\n\n${url}`);
          alert("링크가 복사되었습니다. 원하는 곳에 붙여넣기 해주세요.");
        }
      } catch {
        if (Platform.OS === "web") {
          await Clipboard.setStringAsync(`${text}\n\n${url}`);
          alert("링크가 복사되었습니다. 원하는 곳에 붙여넣기 해주세요.");
        } else {
          Alert.alert("공유 실패", "링크를 복사하여 공유해 주세요.");
        }
      }
    } finally {
      setBusy(false);
    }
  }, [busy, title, text, url, image, id]);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onShareKakao} disabled={busy}
        style={({ pressed }) => [styles.btnKakao, (pressed || busy) && { opacity: 0.9 }]}
      >
        <Text style={styles.btnKakaoText}>{busy ? "공유 중..." : "카카오톡으로 보내기"}</Text>
      </Pressable>
      <Text style={styles.help}>카톡 카드(사진+문구+버튼)로 공유됩니다. 웹에서는 브라우저로 열리거나 클립보드에 복사됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", padding: 16 },
  btnKakao: {
    width: W, backgroundColor: "#FFEB00", borderRadius: 12, paddingVertical: 14,
    alignItems: "center", justifyContent: "center"
  },
  btnKakaoText: { color: "#3D1E1E", fontWeight: "900", fontSize: 16 },
  help: { marginTop: 12, fontSize: 12, color: "#6b7280", textAlign: "center" },
});
