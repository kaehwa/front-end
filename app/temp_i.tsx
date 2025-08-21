// ListeningMission.tsx
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
  Button,
} from "react-native";
import { router } from "expo-router";
import { uploadImage } from "./uploads";

export default function ListeningMission() {
    /** 질문 & 플레이스홀더 */
    const QUESTIONS = [
    "추억이 담긴 사진, 혹은 본인의 사진을 올려주세요!",
    ];

    /** 상태 */
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showDoneModal, setShowDoneModal] = useState(false);
    const [showNotModal, setShowNotModal] = useState(false);
    const [block, setBlock] = useState(false);

    /** 서버 설정 */
    const BACK_SWAGGER_URL = "http://4.240.103.29:8080";
    const ID = 22

    /** 마스코트 이미지 + 애니메이션 */
    const expressions = [require("./../assets/mascot/danbi.jpg")];
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
    const currentQuestion = QUESTIONS[currentIndex]

    /** 다음 버튼 핸들러 */
    const handleOk = async () => {
        changeExpression();
    };

    /** 완료 팝업 */
    const handleModalOK = () => {
        setShowDoneModal(false);
        router.push("/temp_a");
    };

    const handleModalNO = () => {
        setShowNotModal(false);
    };

    const handleImageUpload = async () => {
        try {
            const result = await uploadImage(BACK_SWAGGER_URL, ID);

            if (!result) {
                console.log("not uploaded")
                setShowNotModal(true)
                return;
            }

            // 업로드 성공
            setShowDoneModal(true); // 모달 열기
        } catch (err) {
            console.error(err);
            alert("이미지 업로드 실패, 관리자에게 문의 바랍니다.");
        }
    };

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

      {/* 업로드 영역 */}
      <View style={styles.formArea}>
        <TouchableOpacity
          style={[
            styles.cta,
          ]}
          onPress={handleImageUpload}
        >
          <Text style={styles.ctaText}>사진 업로드</Text>
        </TouchableOpacity>
      </View>

      {/* 완료 팝업 */}
      <Modal
        visible={showDoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>업로드가 완료되었습니다!</Text>
            {/* <Text style={styles.modalMsg}>
              
            </Text> */}
            <Pressable style={styles.modalBtn} onPress={handleModalOK}>
              <Text style={styles.modalBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    {/* 업로드 안했을 때 */}
    <Modal
        visible={showNotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>업로드를 완료해 주세요!</Text>
            {/* <Text style={styles.modalMsg}>
              
            </Text> */}
            <Pressable style={styles.modalBtn} onPress={handleModalNO}>
              <Text style={styles.modalBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** 스타일 (동일) */
const BG = "#FFF4DA";
const ORANGE = "#FF7A3E";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.06)";
const BEIGE = "#FFF2CC"

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, alignItems: "center", paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  speechWrap: { maxWidth: "90%", alignSelf: "center", alignItems: "center" },
  speechBubble: {
    backgroundColor: WHITE,
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } }),
  },
  questionText: { fontSize: 16, lineHeight: 24, color: "#1F2937", textAlign: "center", letterSpacing: 0.1, fontWeight: "600" },
  tailTriWrap: { position: "absolute", bottom: -10, left: "50%", marginLeft: -10, width: 0, height: 0, pointerEvents: "none" },
  tailTriBorder: { borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: BORDER },
  tailTriFill: { position: "absolute", top: -11, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 11, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: WHITE },
  mascotWrap: { width: 220, height: 250, alignItems: "center", justifyContent: "center" },
  mascot: { width: "100%", height: "100%" },
  formArea: { width: "50%", marginTop: 5 },
  input: { backgroundColor: WHITE, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, minHeight: 44, fontSize: 15, color: "#111", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cta: { flex: 1, backgroundColor: ORANGE, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cta_2: { flex: 1, backgroundColor: BEIGE, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  ctaText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  ctaText_2: { color: ORANGE, fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, backgroundColor: WHITE, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 16, alignItems: "center", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 6 } }) },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  modalMsg: { fontSize: 14, color: "#374151", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#FF7A3E", minWidth: 88, alignItems: "center" },
  modalBtnText: { color: WHITE, fontSize: 16, fontWeight: "700" },
});
