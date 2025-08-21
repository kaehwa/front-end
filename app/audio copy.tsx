// RecordingPopup.tsx
import React, { useState, useEffect } from "react";
import { View, Button, Text, StyleSheet, Platform, Alert } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export default function Recording({ onClose }: { onClose: () => void }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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
    setIsRecording(true);
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
    setIsRecording(false);
    if (Platform.OS === "web") {
      if (!mediaRecorder) return;
      mediaRecorder.onstop = () => {
        const blob = new Blob(webAudioChunks, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setRecordedUri(url);
      };
      mediaRecorder.stop();
    } else {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
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

  return (
    <View style={styles.container}>
      <Button title={isRecording ? "Stop" : "Start"} onPress={isRecording ? stopRecording : startRecording} />
      {recordedUri && (
        <>
          <Text style={{ marginVertical: 10 }}>녹음 완료</Text>
          <Button title="Save WAV & Base64" onPress={saveRecording} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
});


