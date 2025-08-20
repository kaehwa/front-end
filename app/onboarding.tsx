// app/onboarding.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function Onboarding() {
  const insets = useSafeAreaInsets();

  // 벚꽃 애니메이션 여러 장
  const petals = Array.from({ length: 6 }).map(() => ({
    x: useRef(new Animated.Value(Math.random() * width)).current,
    y: useRef(new Animated.Value(-50)).current,
    rotate: useRef(new Animated.Value(0)).current,
  }));

  useEffect(() => {
  petals.forEach(({ x, y, rotate }) => {
    const loop = () => {
      y.setValue(-50);
      x.setValue(Math.random() * width); // 시작점
      rotate.setValue(0);

      // 그냥 width 범위 안에서 목표 좌표 랜덤 선택
      const driftX = Math.random() * width;

      Animated.parallel([
        Animated.timing(y, {
          toValue: height,
          duration: 6000 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: driftX,
          duration: 6000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin), // 좌우 살랑
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 6000 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => loop());
    };
    loop();
  });
}, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 배경 이미지 */}
      <Image
        source={require("../assets/mascot/danbi_intro.png")} // 로컬 사진
        style={styles.danbi}
      />

      {/* 벚꽃잎 */}
      {petals.map((p, i) => (
  <Animated.View
    key={i}
    style={{
      position: "absolute",
      opacity: p.y.interpolate({
        inputRange: [0, height * 0.7, height],
        outputRange: [1, 1, 0], // 끝에 갈수록 투명해짐
      }),
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        {
          rotate: p.rotate.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "360deg"],
          }),
        },
      ],
    }}
  >
    <Text style={styles.petal}>🌸</Text>
  </Animated.View>
))}


  {/* 카피 */}
  <View style={styles.overlay}>
  <Text style={styles.title1}>메마른 우리 마음에,</Text>

  {/* 단비를 (개별 위치/색상 조절) */}
  <View style={styles.wordWrapper}>
    <Text style={[styles.letter, { color: "#FB7431", left: 70, top: -180 }]}>
      단
    </Text>
    <Text style={[styles.letter, { color: "#6EA6FF", left: 100, top: -180 }]}>
      비
    </Text>
    <Text style={[styles.letter, { color: "#423600", left: 130, top: -180 }]}>
      를
    </Text>
  </View>

  <Text style={styles.subtitle}>
    꽃에 메세지를 더해, 마음을 완성합니다
  </Text>

        {/* CTA */}
        <Pressable style={styles.button} onPress={() => router.push("/main")}>
          <Text style={styles.buttonText}>시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EAF4FF" },
  // 단비 이미지
  danbi: {
    width: 300,   // ← 원하는 크기 숫자로 바꿔주면 됨
    height: 300,  // ← 원하는 크기 숫자로 바꿔주면 됨
    alignSelf: "center", // 가운데 정렬
    marginTop: 150,       // 위에서 살짝 띄우고 싶으면 조정
    resizeMode: "contain",
  },

  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 100,
  },
  title1: {
    fontSize: 22,
    fontWeight: "800", 
    color: "#423600",
    textAlign: "center", paddingRight: 100, paddingBottom: 190,
    
  },
    
  wordWrapper: {
    width: 140,   // 글자 전체 영역
    height: 50,   // 높이 여유
    position: "relative", // 자식들을 absolute로 배치
    marginBottom: 20,
  },
  letter: {
    position: "absolute",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    marginBottom: 80,
  },
  button: {
    backgroundColor: "#FB7431",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 3,
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  petal: { fontSize: 22 },
});
