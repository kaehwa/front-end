import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, Pressable } from "react-native";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function Onboarding2() {
  const textY = useRef(new Animated.Value(50)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(textY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.description,
          { transform: [{ translateY: textY }], opacity: textOpacity },
        ]}
      >
        우리는 말로 다 전하지 못한 마음을 꽃으로 기록합니다.{"\n"}
        기쁨도, 위로도, 그리고 오래 남길 그리움도,{"\n"}
        당신의 순간은 한 송이 꽃이 되어 피어납니다.
      </Animated.Text>

      <Pressable style={styles.nextButton} onPress={() => router.push("/onboarding3")}>
        <Text style={styles.nextButtonText}>다음</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF2CC",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  scroll: {
    justifyContent: "center",
    flexGrow: 1,
  },
  text: {
    fontSize: 17,
    color: "#444",
    lineHeight: 26,
    marginBottom: 28,
  },
  nextButton: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    backgroundColor: "#FB7431",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 3,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});


