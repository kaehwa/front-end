import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";

export default function Onboarding3() {
  const lines = [
    "꽃을 선물할 대상을 선택하세요 – 사랑하는 사람, 혹은 나 자신",
    "상황과 이야기를 담아주세요 – 생일, 축하, 위로, 추억",
    "AI가 그 마음에 가장 어울리는 꽃과 디자인을 추천하고,\n당신의 사진과 목소리를 담은 디지털 카드를 완성해 드립니다.",
    "그 마음은 제휴 플로리스트의 손끝에서\n실물 꽃다발로 피어나, 사랑하는 이의 손에 전해집니다.",
    "오늘, 당신의 이야기를 꽃으로 남겨보세요."
  ];

  // 문장 수만큼 애니메이션 값 생성 (한 번만)
  const animations = useRef(
    lines.map(() => ({
      y: new Animated.Value(30),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const anim = Animated.stagger(
      400,
      animations.map(a =>
        Animated.parallel([
          Animated.timing(a.y, { toValue: 0, duration: 700, useNativeDriver: true }),
          Animated.timing(a.opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      )
    );
    anim.start();
    // 언마운트 시 안전 정지
    return () => anim.stop && anim.stop();
  }, [animations]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {lines.map((line, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.text,
              { transform: [{ translateY: animations[index].y }], opacity: animations[index].opacity }
            ]}
          >
            {line}
          </Animated.Text>
        ))}
      </ScrollView>

      <Pressable style={styles.nextButton} onPress={() => router.push("/main")}>
        <Text style={styles.nextButtonText}>시작하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    backgroundColor: "#7A958E",
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

//nextpage.tsx 지우고 재진님 파일 연결하기 