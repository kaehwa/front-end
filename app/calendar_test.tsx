import * as React from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from 'expo-auth-session';
import {
  Image, StyleSheet, Dimensions, ActivityIndicator,
  Pressable, Text, Button, Platform, View
} from "react-native";


WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({
  scheme: 'gaehwa', // 위 app.json과 일치해야 함
});


const WEB_CLIENT_ID =
  "2775008760-cu5dcieaua1pcl96ilfcg7p8egn4kqsg.apps.googleusercontent.com";
const ANDROID_CLIENT_ID =
  "2775008760-dj5uto76ve22ja4v68lvslrk3vkl3dbl.apps.googleusercontent.com";

export default function App() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    // expoClientId: "<EXPO_CLIENT_ID>.apps.googleusercontent.com",
    // iosClientId: "<IOS_CLIENT_ID>.apps.googleusercontent.com",
    webClientId: WEB_CLIENT_ID,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  React.useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      console.log("✅ Access Token:", authentication?.accessToken);
      // 이 토큰으로 Google Calendar API 호출 가능
    }
  }, [response]);

    return (
    <View style={styles.container}>
      <Button
        disabled={!request}
        title="Sign in with Google"
        onPress={() => {
          promptAsync();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,                 // 전체 화면 차지
    justifyContent: "center", // 세로 중앙 정렬
    alignItems: "center",     // 가로 중앙 정렬
  },
});