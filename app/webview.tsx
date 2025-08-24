// app/webview.tsx
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";

export default function WebviewScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const uri = url || "https://example.com/invite";
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri }}
        startInLoadingState
        renderLoading={() => (
          <ActivityIndicator style={{ marginTop: 24 }} />
        )}
      />
    </View>
  );
}
