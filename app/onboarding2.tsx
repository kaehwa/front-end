import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

// 단비 아바타 (로컬 이미지 사용)
const danbiAvatar = require("../assets/mascot/danbi_face.png");

export default function OnboardingChat() {
  const conversation = [
    { type: "user", text: "꽃을 어떻게 선물하나요?" },
    { type: "danbi", text: "꽃을 선물할 대상을 선택하세요 – 사랑하는 사람, 혹은 나 자신" },
    { type: "user", text: "그 다음은요?" },
    { type: "danbi", text: "상황과 이야기를 담아주세요 – 생일, 축하, 위로, 추억" },
    { type: "user", text: "AI는 뭘 해주나요?" },
    { type: "danbi", text: "AI가 마음에 어울리는 꽃과 디자인을 추천하고,\n영상과 목소리를 담은 디지털 카드를 완성해 드려요." },
    { type: "user", text: "어떻게 받나요?" },
    { type: "danbi", text: "입력을 하신 후 약 10분 정도 시간이 지나면 단비가 알람을 보내드려요! 또한 공유하기를 통해 편하게 전하실 수 있습니다!" },
    { type: "danbi", text: "오늘, 당신의 마음을 단비로 전하세요!" },
  ];

  const animations = useRef(
    conversation.map(() => ({
      y: new Animated.Value(20),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const anim = Animated.stagger(
      500,
      animations.map((a) =>
        Animated.parallel([
          Animated.timing(a.y, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(a.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anim.start();
  }, [animations]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {conversation.map((msg, index) => (
          <Animated.View
            key={index}
            style={{
              transform: [{ translateY: animations[index].y }],
              opacity: animations[index].opacity,
              flexDirection: msg.type === "danbi" ? "row" : "row-reverse",
              marginBottom: 18,
            }}
          >
            {msg.type === "danbi" && (
              <Image source={danbiAvatar} style={styles.avatar} />
            )}
            <View
              style={[
                styles.bubble,
                msg.type === "user" ? styles.userBubble : styles.danbiBubble,
              ]}
            >
              <Text
                style={[
                  styles.text,
                  msg.type === "user" ? styles.userText : styles.danbiText,
                ]}
              >
                {msg.text}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <Pressable
        style={styles.nextButton}
        // onPress={() => router.push("/login")}
        onPress={() => router.push("/main")}
      >
        <Text style={styles.nextButtonText}>다음</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF8",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 100,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignSelf: "flex-end",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: width * 0.7,
  },
  danbiBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  userBubble: {
    backgroundColor: "#FB7431",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  danbiText: {
    color: "#333",
  },
  userText: {
    color: "#fff",
    fontWeight: "500",
  },
  nextButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#FB7431",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 40,
    elevation: 3,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
