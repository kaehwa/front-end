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
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export default function ListeningMission() {
  const QUESTIONS = ["더 의미 있는 추억을 위해 다음을 천천히 읽어주세요!"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const { orderID } = useLocalSearchParams<{ orderID: string }>();

  const BACK_SWAGGER_URL = "http://4.240.103.29:8080";
  const ID = orderID;

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
  useEffect(() => playBubbleAnim(), [currentIndex]);

  const currentQuestion = QUESTIONS[currentIndex];

  const handleModalOK = () => {
    setShowDoneModal(false);
    router.push({
      pathname: "/recommendations",
      params: { orderID: orderID },
    });
  };

  /** -------------------- Recording 기능 통합 -------------------- */
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "recording" | "done">("idle");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [webAudioChunks, setWebAudioChunks] = useState<BlobPart[]>([]);

  const readingScript = `가파른 언덕 위, 바람이 흘러 나무 사이로 졸졸 흐르는 시냇물
호랑이 울음, 기러기 날갯짓, 차가운 달빛 아래, 숨죽인 별빛

희미한 그림자 속, 책과 연필, 종이 위,
조용히 떠오르는 이야기
자, 꿈틀대는 마음을 따라
하늘과 땅, 구름과 바람, 모든 소리가 춤춘다

펼쳐진 세상 속, 기억과 환상, 웃음과 눈물
잊지 못할 순간을 담아 오늘도 나는 걸어간다`;

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) alert("녹음 권한 필요");
      }
    })();
  }, []);

  const startRecording = async () => {
    setStatus("recording");
    if (Platform.OS === "web") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.start();
      setMediaRecorder(recorder);
      setWebAudioChunks(chunks);
    } else {
      const newRecording = new Audio.Recording();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
    }
  };

  const stopRecording = async () => {
    if (Platform.OS === "web") {
      if (!mediaRecorder) return;
      mediaRecorder.onstop = () => {
        const blob = new Blob(webAudioChunks, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setRecordedUri(url);
        setStatus("done");
      };
      mediaRecorder.stop();
    } else {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
      setStatus("done");
    }
  };

  const uploadRecording = async (orderID: string, fileUri: string) => {
    try {
      const formData = new FormData();
      if (Platform.OS === "web") {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append("file", blob, `recording_${Date.now()}.wav`);
      } else {
        const file = { uri: fileUri, type: "audio/wav", name: `recording_${Date.now()}.wav` } as any;
        formData.append("file", file);
      }
      formData.append("orderID", orderID);

      const res = await fetch(`${BACK_SWAGGER_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("업로드 실패");
      const result = await res.json();
      console.log("업로드 성공:", result);
    } catch (err) {
      console.error("업로드 에러:", err);
      Alert.alert("업로드 실패", String(err));
    }
  };

  const handlePress = async () => {
    if (status === "idle") await startRecording();
    else if (status === "recording") await stopRecording();
    else if (status === "done") {
      if (recordedUri) {
        await uploadRecording(ID || "tempID", recordedUri);
      }
      setShowRecorder(false);
      setShowDoneModal(true);
      setStatus("idle");
    }
  };

  const getTitle = () => (status === "idle" ? "녹음을 시작해 주세요!" : status === "recording" ? "녹음 중..." : "녹음이 완료되었습니다 🎤");
  const getBtnLabel = () => (status === "idle" ? "시작" : status === "recording" ? "그만하기" : "저장하기");

  /** -------------------- UI 렌더링 -------------------- */
  return (
    <SafeAreaView style={styles.container}>
      {/* 질문 말풍선 */}
      <Animated.View style={[styles.speechWrap, { transform: [{ scale: bubbleScale }], opacity: bubbleOpacity }]}>
        <View style={styles.speechBubble}>
          <Text style={styles.questionText}>{currentQuestion}</Text>
        </View>
        <View style={styles.tailTriWrap}>
          <View style={styles.tailTriBorder} />
          <View style={styles.tailTriFill} />
        </View>
      </Animated.View>

      {/* 마스코트 */}
      <Animated.View style={[styles.mascotWrap, { transform: [{ translateY: bounceAnim }], opacity: fadeAnim }]}>
        <Image source={expressions[currentExpressionIndex]} style={styles.mascot} resizeMode="contain" />
      </Animated.View>

      {/* 업로드 버튼 */}
      <View style={styles.formArea}>
        <TouchableOpacity style={styles.cta} onPress={() => setShowRecorder(true)}>
          <Text style={styles.ctaText}>녹음하기</Text>
        </TouchableOpacity>
      </View>

      {/* 녹음 모달 */}
      <Modal visible={showRecorder} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.readingBound}>
            <Text style={styles.modalTitle}>다음을 천천히 읽어주세요.</Text>
            <Text style={styles.readingText}>{readingScript}</Text>
          </View>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{getTitle()}</Text>
            <Pressable style={styles.modalBtn} onPress={handlePress}>
              <Text style={styles.modalBtnText}>{getBtnLabel()}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 완료 팝업 */}
      <Modal visible={showDoneModal} transparent animationType="fade" onRequestClose={() => setShowDoneModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>업로드가 완료되었습니다!</Text>
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
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } }),
  },
  questionText: { fontSize: 16, lineHeight: 24, color: "#1F2937", textAlign: "center", letterSpacing: 0.1, fontWeight: "600" },
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
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, backgroundColor: ORANGE, minWidth: 88, alignItems: "center" },
  modalBtnText: { color: WHITE, fontSize: 16, fontWeight: "700" },
  readingBound: { width: "70%", backgroundColor: WHITE, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 12, minHeight: 44, color: "#111", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  readingText: { fontSize: 10, lineHeight: 24, color: "#1F2937", textAlign: "left", letterSpacing: 0.1, fontWeight: "600" },
});
