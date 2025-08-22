// ListeningMission.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import { uploadAudio } from "./uploads"
import * as FileSystem from "expo-file-system";



export default function ListeningMission() {
  /** 질문 & 플레이스홀더 */
  const QUESTIONS = [
    "더 의미 있는 추억을 위해 다음을 천천히 읽어주세요!",
  ];

  /** 읽기 스크립트 */
  const readingScript = `가파른 언덕 위, 바람이 흘러 나무 사이로 졸졸 흐르는 시냇물
    호랑이 울음, 기러기 날갯짓, 차가운 달빛 아래, 숨죽인 별빛

    희미한 그림자 속, 책과 연필, 종이 위,
    조용히 떠오르는 이야기
    자, 꿈틀대는 마음을 따라
    하늘과 땅, 구름과 바람, 모든 소리가 춤춘다

    펼쳐진 세상 속, 기억과 환상, 웃음과 눈물
    잊지 못할 순간을 담아 오늘도 나는 걸어간다`;

  /** 상태 */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const { orderID } = useLocalSearchParams<{ orderID: string }>();
  const [showNotModal, setShowNotModal] = useState(false);

  /** 서버 설정 */
  const BACK_SWAGGER_URL = "http://4.240.103.29:8080";

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
  const currentQuestion = QUESTIONS[currentIndex];

  /** 완료 팝업 */
  const handleModalOK = () => {
    setShowDoneModal(false);
    router.push({
      pathname: "/recommendations",
      params: { orderID: orderID },
    });
  };

  /** 녹음 관련 함수 */
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.log("녹음 시작 오류:", err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setRecordedUri(uri);
      setIsRecording(false);
      console.log("저장된 URI:", uri);

      // 서버 POST
      if (uri) await uploadAndSaveRecording(uri);

      // 완료 모달 표시
      setShowRecorder(false);
      setShowDoneModal(true);
    } catch (err) {
      console.log("녹음 중지 오류:", err);
    }
  };

  const uploadAndSaveRecording = async (uri: string) => {
    try {
      // 1️⃣ URI → blob 변환
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2️⃣ wav 파일로 앱 로컬에 저장
      const fileUri = FileSystem.documentDirectory + `voice_${orderID}.wav`;
      const reader = new FileReader();

      reader.onload = async () => {
        const base64 = reader.result as string;
        await FileSystem.writeAsStringAsync(fileUri, base64.split(",")[1], {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log("로컬 저장 완료:", fileUri);

        // 3️⃣ 서버 업로드
        const formData = new FormData();
        formData.append("file", blob, `voice_${orderID}.wav`);
        const res = await fetch(`${BACK_SWAGGER_URL}/flowers/${orderID}/voice`, {
          method: "POST",
          body: formData,
        });

        console.log("서버 응답:", await res.json());
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.log("업로드 실패:", err);
    }
  };

  // const uploadRecording = async (uri: string) => {
  //   try {
  //     // 1️⃣ URI를 fetch로 읽어서 blob으로 변환
  //     const response = await fetch(uri);
  //     const blob = await response.blob();

  //     // 2️⃣ FormData에 blob 추가
  //     const formData = new FormData();
  //     formData.append("file", blob, `voice_${orderID}.wav`);
  //     console.log(blob)

  //     // 3️⃣ 서버로 POST
  //     const res = await fetch(`${BACK_SWAGGER_URL}/flowers/${orderID}/voice`, {
  //       method: "POST",
  //       body: formData,
  //     });

  //     console.log("서버 응답:", await res.json());
  //   } catch (err) {
  //     console.log("업로드 실패:", err);
  //   }
  // };

  const handleAudioUpload = async () => {
      try {
          const result = await uploadAudio(BACK_SWAGGER_URL, orderID);

          if (!result) {
              console.log("not uploaded")
              setShowNotModal(true)
              return;
          }

          // 업로드 성공
          console.log("success uploaded")
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

      {/* 읽기 스크립트 */}
      <ScrollView style={styles.readingBound}>
        <Text style={styles.readingText}>{readingScript}</Text>
      </ScrollView>

      {/* 업로드 영역 */}
      <View style={styles.formArea}>
        <TouchableOpacity
          style={styles.cta}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.ctaText}>
            {isRecording ? "녹음 중지" : "녹음하기"}
          </Text>
        </TouchableOpacity>
      </View>
      

      <View style={styles.formArea}>
        <TouchableOpacity
          style={[
            styles.cta,
          ]}
          onPress={handleAudioUpload}
        >
          <Text style={styles.ctaText}>음성 업로드</Text>
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
            <Pressable style={styles.modalBtn} onPress={handleModalOK}>
              <Text style={styles.modalBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 녹음 모달 */}
      <Modal visible={showRecorder} animationType="slide">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Text style={{ marginBottom: 20, fontSize: 18 }}>녹음을 시작하세요</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.ctaText}>
              {isRecording ? "녹음 중지" : "녹음 시작"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cta, { marginTop: 16, backgroundColor: "#ccc" }]}
            onPress={() => setShowRecorder(false)}
          >
            <Text style={styles.ctaText}>취소</Text>
          </TouchableOpacity>
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
const BEIGE = "#FFF2CC";

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
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 }
    }),
  },
  questionText: { fontSize: 16, lineHeight: 24, color: "#1F2937", textAlign: "center", letterSpacing: 0.1, fontWeight: "600" },
  readingBound: { width: "90%", maxHeight: 180, backgroundColor: WHITE, borderRadius: 12, padding: 16, marginVertical: 10 },
  readingText: { fontSize: 14, lineHeight: 22, color: "#1F2937" },
  tailTriWrap: { position: "absolute", bottom: -10, left: "50%", marginLeft: -10, width: 0, height: 0, pointerEvents: "none" },
  tailTriBorder: { borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: BORDER },
  tailTriFill: { position: "absolute", top: -11, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 11, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: WHITE },
  mascotWrap: { width: 220, height: 250, alignItems: "center", justifyContent: "center" },
  mascot: { width: "100%", height: "100%" },
  formArea: { width: "50%", marginTop: 5 },
  cta: { flex: 1, backgroundColor: ORANGE, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  ctaText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, backgroundColor: WHITE, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 16, alignItems: "center", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 6 } }) },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#FF7A3E", minWidth: 88, alignItems: "center" },
  modalBtnText: { color: WHITE, fontSize: 16, fontWeight: "700" },
});
