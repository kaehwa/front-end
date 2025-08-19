import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, Pressable } from "react-native"; 
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function FirstPage() {
  // 메인 텍스트 애니메이션
  const mainY = useRef(new Animated.Value(50)).current; // 아래서 시작
  const mainOpacity = useRef(new Animated.Value(0)).current;

  // 서브 텍스트 애니메이션
  const subY = useRef(new Animated.Value(50)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 순차 애니메이션 실행
    Animated.sequence([
      Animated.parallel([
        Animated.timing(mainY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(mainOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(subY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.mainText,
          { transform: [{ translateY: mainY }], opacity: mainOpacity },
        ]}
      >
        안녕하세요 저희는 그대, 화(花) 입니다.
      </Animated.Text>

      <Animated.Text
        style={[
          styles.subText,
          { transform: [{ translateY: subY }], opacity: subOpacity },
        ]}
      >
        피어나는 순간도,{"\n"}
        남겨진 그리움도,{"\n"}
        꽃으로 전합니다.
      </Animated.Text>

      {/* 버튼 추가 */}
      <Pressable
        style={styles.nextButton}
        onPress={() => router.push("/onboarding2")}
      >
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

