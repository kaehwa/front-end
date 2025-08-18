import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { uploadImage, uploadAudio } from "./uploads";

export default function ListeningMission() {
  /** 질문 & 플레이스홀더 */
  const QUESTIONS = [
    "꽃으로 마음을 담아 전한다면,\n꽃을 건네실 분은 누구일까요?",
    "{giver} 님은 어느 분께 꽃을 전하고 싶으신가요?",
    "전하고싶은 소중한 순간, 하나 떠올려 주실 수 있을까요?\n더 따뜻한 카드를 만들어 드릴게요.",
    "가능하시다면, {giver} 님의 사진과 목소리도 들려주실 수 있을까요?\n사진과 음성을 살짝 담아 주시면 마음이 더 또렷이 전해져요.",
  ];

  const PLACEHOLDERS = [
    "예) 아내, 딸, 나",
    "예) 할머니, 친구, 어머니",
    "예) 우리는 30년을 같이 살았고, 고맙다는 마음을 전해요",
    "", // 업로드 단계
  ];

  /** 상태 */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [giver, setGiver] = useState(""); // 주는 사람
  const [answers, setAnswers] = useState<string[]>(Array(4).fill("")); 
  const [answer, setAnswer] = useState(""); 
  const [placeHolder, setPlaceHolder] = useState(PLACEHOLDERS[0]);
  const [showUpload, setShowUpload] = useState(false); 
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  // 미사용 but 남겨둔 변수
  const [isTyping] = useState(false);
  const [inGiver] = useState("");
  const [inReciver] = useState("");
  const [showNext] = useState(false);

  /** 서버 설정 */
  const BACK_SWAGGER_URL = "http://4.240.103.29:8080";
  const ID = "2";

  /** 마스코트 이미지 + 애니메이션 */
  const expressions = [
    require("./../assets/mascot/danbi.jpg"),
    require("./../assets/mascot/danbi.jpg"),
    require("./../assets/mascot/danbi.jpg"),
    require("./../assets/mascot/danbi.jpg"),
  ];
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const changeExpression = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setCurrentExpressionIndex((prev) => (prev + 1) % expressions.length);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 6, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  /** 말풍선 애니메이션 */
  const bubbleScale = useRef(new Animated.Value(0.98)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const playBubbleAnim = () => {
    bubbleScale.setValue(0.98);
    bubbleOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(bubbleScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };
  useEffect(() => {
    playBubbleAnim();
  }, [currentIndex]);

  /** 현재 질문 */
  const currentQuestion = QUESTIONS[currentIndex].replace(
    /\{giver\}/g,
    giver || "OOO"
  );

  /** 다음 버튼 핸들러 */
  const handleNext = async () => {
    if (!showUpload) {
      const trimmed = answer.trim();
      const nextAns = [...answers];
      nextAns[currentIndex] = trimmed;
      setAnswers(nextAns);
      if (currentIndex === 0) setGiver(trimmed);
    }

    if (currentIndex === QUESTIONS.length - 1) {
      await postText(answers);
      setShowDoneModal(true);
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setPlaceHolder(PLACEHOLDERS[nextIndex] || "내용을 입력해주세요");
    setAnswer("");
    setShowUpload(nextIndex === 3);
    changeExpression();
  };

  /** 업로드 */
  const handleUpload = () => {
    const nextAns = [...answers];
    nextAns[3] = "uploaded"; 
    setAnswers(nextAns);
    setUploadDone(true);
  };

  const handleImageUpload = async () => {
    try {
      const result = await uploadImage(BACK_SWAGGER_URL, ID);
      alert("이미지 업로드 성공!");
      console.log(result);
    } catch (err) {
      console.error(err);
      alert("이미지 업로드 실패");
    }
  };

  const handleAudioUpload = async () => {
    try {
      const result = await uploadAudio(BACK_SWAGGER_URL, ID);
      alert("오디오 업로드 성공!");
      console.log(result);
    } catch (err) {
      console.error(err);
      alert("오디오 업로드 실패");
    }
  };

  /** 완료 팝업 */
  const handleModalOK = () => {
    setShowDoneModal(false);
    router.push("/recommendations");
  };

  /** 서버 전송 */
  async function postText(lst: string[]) {
    const payload = {
      flowerFrom: lst[0] || "",
      flowerTo: lst[1] || "",
      history: lst[2] || "",
      lstFiles: lst[3] || "",
    };

    try {
      const response = await fetch(`${BACK_SWAGGER_URL}/flowers/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log("POST 성공:", data);
      return data;
    } catch (e) {
      console.log("POST 실패:", e);
    }
  }

  /** UI */
  return (
    <SafeAreaView style={styles.container}>
      {/* 질문 말풍선 */}
      <Animated.View
        style={[
          styles.speechWrap,
          { transform: [{ scale: bubbleScale }], opacity: bubbleOpacity },
        ]}
      >
        <View style={styles.speechBubble}>
          <Text style={styles.questionText}>{currentQuestion}</Text>
        </View>
        <View style={styles.tailTriWrap}>
          <View style={styles.tailTriBorder} />
          <View style={styles.tailTriFill} />
        </View>
      </Animated.View>

      {/* 마스코트 */}
      <Animated.View
        style={[
          styles.mascotWrap,
          { transform: [{ translateY: bounceAnim }], opacity: fadeAnim },
        ]}
      >
        <Image
          source={expressions[currentExpressionIndex]}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 입력/업로드 영역 */}
      <View style={styles.formArea}>
        {showUpload ? (
          <TouchableOpacity
            style={[styles.uploadBtn, uploadDone && { opacity: 0.8 }]}
            onPress={handleUpload}
          >
            <Text style={styles.uploadText}>
              {uploadDone ? "업로드 완료 ✓" : "사진과 음성을 올려주세요."}
            </Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={placeHolder}
            placeholderTextColor="#9BA3AF"
            value={answer}
            onChangeText={setAnswer}
            multiline
          />
        )}
      </View>

      {/* 다음 버튼 */}
      <TouchableOpacity
        style={[
          styles.cta,
          showUpload && !uploadDone ? { opacity: 0.5 } : null,
        ]}
        onPress={handleNext}
        disabled={showUpload && !uploadDone}
      >
        <Text style={styles.ctaText}>
          {currentIndex === QUESTIONS.length - 1 ? "완료" : "다음"}
        </Text>
      </TouchableOpacity>

      {/* 완료 팝업 */}
      <Modal
        visible={showDoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>입력이 모두 완료되었습니다!</Text>
            <Text style={styles.modalMsg}>
              입력 내용을 바탕으로 추천 꽃다발 리스트를 생성할게요.
            </Text>
            <Pressable style={styles.modalBtn} onPress={handleModalOK}>
              <Text style={styles.modalBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** 스타일 */
const BG = "#FFF4DA";
const ORANGE = "#FF7A3E";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.06)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  /** 말풍선 */
  speechWrap: { maxWidth: "90%", alignSelf: "center", alignItems: "center" },
  speechBubble: {
    backgroundColor: WHITE,
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
    }),
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1F2937",
    textAlign: "center",
    letterSpacing: 0.1,
    fontWeight: "600",
  },
  tailTriWrap: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    marginLeft: -10,
    width: 0,
    height: 0,
    pointerEvents: "none",
  },
  tailTriBorder: {
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BORDER,
  },
  tailTriFill: {
    position: "absolute",
    top: -11,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: WHITE,
  },
  /** 마스코트 */
  mascotWrap: { width: 220, height: 250, alignItems: "center", justifyContent: "center" },
  mascot: { width: "100%", height: "100%" },
  /** 입력/업로드 */
  formArea: { width: "80%", marginTop: 5 },
  input: {
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 44,
    fontSize: 15,
    color: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  uploadBtn: {
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  uploadText: { fontSize: 15, color: "#374151", fontWeight: "600" },
  /** CTA */
  cta: {
    marginTop: 16,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  ctaText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  /** 완료 팝업 */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMsg: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#FF7A3E",
    minWidth: 88,
    alignItems: "center",
  },
  modalBtnText: { color: WHITE, fontSize: 16, fontWeight: "700" },
});
