// RecordingPopup.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform, Alert, Pressable } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export default function Recording({ onClose }: { onClose: () => void }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "recording" | "done">("idle");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [webAudioChunks, setWebAudioChunks] = useState<BlobPart[]>([]);

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

  const saveRecording = async () => {
      if (!recordedUri) return;
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = recordedUri;
        link.download = `recording_${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(recordedUri);
      } else {
        const base64Data = await FileSystem.readAsStringAsync(recordedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const path = `${FileSystem.documentDirectory}recording_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(path, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert("저장 완료", `경로: ${path}`);
      }
      onClose(); // 녹음 종료 시 Modal 닫기
  };

  const handlePress = async () => {
    if (status === "idle") {
      await startRecording();
    } else if (status === "recording") {
      await stopRecording();
    } else if (status === "done") {
      saveRecording()
      onClose(); // 완료 상태에서 닫기
    }
  };

  const getTitle = () => {
    if (status === "idle") return "녹음을 시작해 주세요!";
    if (status === "recording") return "녹음 중...";
    if (status === "done") return "녹음이 완료되었습니다 🎤";
    return "";
  };

  const getBtnLabel = () => {
    if (status === "idle") return "시작";
    if (status === "recording") return "그만하기";
    if (status === "done") return "닫기";
    return "버튼";
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{getTitle()}</Text>
        <Pressable style={styles.modalBtn} onPress={handlePress}>
          <Text style={styles.modalBtnText}>{getBtnLabel()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** 스타일 (공유 팔레트 사용) */
const BG = "#FFF4DA";
const ORANGE = "#FF7A3E";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
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
      ios: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: ORANGE,
    minWidth: 120,
    alignItems: "center",
  },
  modalBtnText: { color: WHITE, fontSize: 16, fontWeight: "700" },
});
