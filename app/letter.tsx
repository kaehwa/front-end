import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  TextInput,
  Share,
  Alert,
  Platform
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

const BACKEND_URL = "/api"; // TODO: 실제 주소로 교체
const MAX_LEN = 1000; // 글자 제한 (원하면 조정)

type LetterResponse = {
  letter: string;
  recipient?: string;
  tone?: string; // 감성/톤 (선택)
};

export default function LetterPage() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { orderID } = useLocalSearchParams<{ orderID: string }>();

  // UI 상태
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false); // 로딩 길어질 때 표시
  const [error, setError] = useState<string | null>(null);

  // 데이터
  const [serverLetter, setServerLetter] = useState<string>("");
  const [draft, setDraft] = useState<string>("");

  // 편집 상태
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 로딩 애니메이션 (점점 나타났다 사라지는 느낌)
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // 로딩 길어질 때 안내 문구 토글
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoadingSlow(true), 1800); // 1.8초 넘으면 안내 띄움
    return () => clearTimeout(t);
  }, [loading]);

  const fetchLetter = useCallback(async () => {
    setError(null);
    setLoading(true);
    setLoadingSlow(false);
    try {
      // 실제 API 예시:
      const res = await fetch(`${BACKEND_URL}/flowers/${orderID}/message`);
      const raw = await res.json();
      
      var letter = raw.recommendMessage

      setServerLetter(letter);
      setDraft(letter);
    } catch (e: any) {
      console.log("error")
      console.log(e)
      setError("편지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [id, name]);

  useEffect(() => {
    fetchLetter();
  }, [fetchLetter]);

  const onCopy = async () => {
    await Clipboard.setStringAsync(draft);
    Alert.alert("복사됨", "편지 내용이 클립보드에 복사되었어요.");
  };

  const onShare = async () => {
    try {
      await Share.share({ message: draft });
    } catch {
      Alert.alert("공유 실패", "다시 시도해 주세요.");
    }
  };

  const onEdit = () => setEditing(true);
  const onCancel = () => {
    setDraft(serverLetter);
    setEditing(false);
  };

  const onSave = async () => {
    if (draft.trim().length === 0) {
      Alert.alert("내용 없음", "편지 내용을 입력해 주세요.");
      return;
    }
    if (draft.length > MAX_LEN) {
      Alert.alert("너무 깁니다", `최대 ${MAX_LEN}자까지 입력할 수 있어요.`);
      return;
    }
    setSaving(true);
    try {
      // 실제 저장 API 예:
      // const res = await fetch(`${BACKEND_URL}/api/letters/${id ?? "new"}`, {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ letter: draft }),
      // });
      // if (!res.ok) throw new Error("Failed to save");

      // 성공 가정
      setServerLetter(draft);
      setEditing(false);
      Alert.alert("저장 완료", "편지를 저장했어요.");
    } catch (e: any) {
      Alert.alert("저장 실패", "네트워크 상태를 확인하고 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handlePress = async () => {
    try {
      // 1️⃣ POST 요청
      const res = await fetch(`${BACKEND_URL}/flowers/${orderID}/message`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendMessage: serverLetter }),
      });

      const data = await res.json();
      console.log("POST 결과:", data);

      // 2️⃣ POST 완료 후 페이지 이동 --> 완료 페이지로 로딩
      router.push({ pathname: "/DanbiLoadingScreen_before_card", params: { orderID: orderID ?? "" } });
    } catch (err) {
      console.error("POST 실패:", err);
    }
  };

  /** ---------- 렌더링 ---------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>잠시만 기다려주세요…</Text>
        {loadingSlow && (
          <Animated.View style={[styles.tipBox, { opacity: pulse }]}>
            <Ionicons name="time-outline" size={16} color="#7A958E" />
            <Text style={styles.tipText}>
              마음을 담아 편지를 쓰는 중입니다. 조금만 더 기다려 주세요.
            </Text>
          </Animated.View>
        )}
        {/* 스켈레톤 */}
        <View style={styles.skeletonCard}>
          <View style={styles.skelLine} />
          <View style={[styles.skelLine, { width: "70%" }]} />
          <View style={[styles.skelLine, { width: "85%" }]} />
          <View style={[styles.skelLine, { width: "60%" }]} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={fetchLetter} accessibilityLabel="다시 시도">
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.btnPrimaryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  // 본문
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>너에게 전하는 마음</Text>
        <Text style={styles.headerSub}>
          AI가 초안을 만들었어요. 필요하면 직접 다듬어 보세요.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.card}>
          {/* 라벨 & 카운터 */}
          <View style={styles.cardTopRow}>
            <View style={styles.pill}>
              <Ionicons name="create-outline" size={14} color="#FB7431" />
              <Text style={styles.pillText}>{editing ? "편집 중" : "초안"}</Text>
            </View>
            <Text style={styles.counterText}>
              {draft.length}/{MAX_LEN}
            </Text>
          </View>

          {/* 편지 본문 */}
          {!editing ? (
            <Text
              selectable
              style={[
                styles.letterText,
                Platform.OS === "web" && ({ whiteSpace: "pre-wrap" } as any), // ✅ 웹에서만 줄바꿈 보존
              ]}
            >
              {serverLetter}
            </Text>
          ) : (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              style={styles.input}
              maxLength={MAX_LEN}
              placeholder="여기에 편지를 작성하세요"
              textAlignVertical="top"
              accessibilityLabel="편지 입력 영역"
            />
          )}

          {/* 버튼 행 */}
          <View style={styles.actionsRow}>
            {!editing ? (
              <>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCopy} accessibilityLabel="복사하기">
                  <Ionicons name="copy-outline" size={18} color="#FB7431" />
                  <Text style={styles.btnGhostText}>복사</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={onShare} accessibilityLabel="공유하기">
                  <Ionicons name="share-social-outline" size={18} color="#FB7431" />
                  <Text style={styles.btnGhostText}>공유</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onEdit} accessibilityLabel="수정하기">
                  <Ionicons name="pencil" size={18} color="#fff" />
                  <Text style={styles.btnPrimaryText}>수정</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.btn, styles.btnGhost]}
                  onPress={onCancel}
                  disabled={saving}
                  accessibilityLabel="취소"
                >
                  <Ionicons name="close" size={18} color="#FB7431" />
                  <Text style={styles.btnGhostText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={onSave}
                  disabled={saving}
                  accessibilityLabel="저장"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                  <Text style={styles.btnPrimaryText}>{saving ? "저장 중…" : "저장"}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* 다음 단계 CTA */}
        <View style={styles.footerCtas}>
          <Pressable
            style={[styles.btnWide, styles.btnPrimary]}
            onPress={handlePress}
            accessibilityLabel="주문으로 이동"
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>이 편지와 함께 카드 만들기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* ----------------- Styles ----------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF2CC" },

  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#222" },
  headerSub: { fontSize: 13, color: "#6b7280", marginTop: 4 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: "#555" },
  tipBox: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eef4f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tipText: { color: "#FB7431", fontSize: 12 },

  skeletonCard: {
    width: "88%",
    marginTop: 16,
    backgroundColor: "#f6f7f9",
    borderRadius: 14,
    padding: 16,
  },
  skelLine: {
    height: 14,
    backgroundColor: "#e9edf1",
    borderRadius: 8,
    marginBottom: 10,
  },

  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 242, 204, 1)",
    borderWidth: 1,
    borderColor: "rgba(214, 215, 118, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: "#FB7431", fontSize: 12, fontWeight: "700" },

  counterText: { color: "#7d806bff", fontSize: 12 },

  letterText: {
    color: "#27333a",
    fontSize: 16,
    lineHeight: 26,
  },

  input: {
    minHeight: 180,
    color: "#27333a",
    fontSize: 16,
    lineHeight: 26,
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 14,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnPrimary: { backgroundColor: "#FB7431" },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#FB7431" },
  btnGhostText: { color: "#FB7431", fontWeight: "800" },

  footerCtas: {
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  btnWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
  },

  errorText: {
  color: "#b91c1c",
  textAlign: "center",
  marginBottom: 12,
},

});
