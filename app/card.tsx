// app/card.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatusSuccess, Audio } from "expo-av";

// ── 화면/카드 치수 ───────────────────────────────────────────────────────────
const { width, height } = Dimensions.get("window");
const CARD_W = Math.min(380, width - 40);
const PHOTO_H = Math.round(CARD_W * 0.9);
const SHEET_H = Math.min(520, Math.round(height * 0.72));
const SHEET_PEEK = 36;
const PAGE_BG = "#F5EFE3";

// ── 종이 텍스처 ─────────────────────────────────────────────────────────────
const PAPER_TEXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGXRFWHRTb2Z0d2FyZQBwYXBlci1ub2lzZS1nZW4gMS4wAAAAPElEQVQYV2NkYGD4z8DAwPCfGQYGBgYmBqYyYGBg8H8YjEGEhQm8Dg0EwYGBgYGJgYBgYGBoYH8AEgkAQt1mA1kAAAAASUVORK5CYII=";

// ── ✅ 로컬 비디오 (Option A: require) ──────────────────────────────────────
const LOCAL_VIDEO = require("../assets/videos/file.mp4");
const CORNER_TAPE = require("../assets/images/tape.png"); // 모서리용 찢어진 테이프 PNG

// ── 타입 ────────────────────────────────────────────────────────────────────
type CardPayload = {
  id: string;
  letter: string;
  videoUrl?: string | null;     // 원격 URL(선택)
  videoLocal?: number | null;   // 🔹 로컬 require
  audioUrl?: string | null;
  coverImageUrl?: string | null;
  createdAtIso?: string | null;
  recipientName?: string | null;
};

// ── 유틸 ────────────────────────────────────────────────────────────────────
function formatKoDate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}.`;
}

// ── 컴포넌트 ────────────────────────────────────────────────────────────────
export default function CardScreen() {
  const { id, to } = useLocalSearchParams<{ id?: string; to?: string }>();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<CardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Media
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [mediaDurationMs, setMediaDurationMs] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null); // (옵션) 오디오 길이만 참조

  // Banner / hint
  const sheetY = useRef(new Animated.Value(SHEET_H - SHEET_PEEK)).current;
  const [sheetOpen, setSheetOpen] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current; // 영상 종료 후 배너 가이드

  // Letter reveal
  const [visibleLineCount, setVisibleLineCount] = useState(0); // (상태는 보존)
  const revealTimers = useRef<number[]>([]);
  const lines = useMemo(() => {
    const text = data?.letter ?? "";
    return text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l, i, arr) => !(l === "" && (arr[i - 1] ?? "") === ""));
  }, [data?.letter]);

  // 라인 애니메이션 값
  const lineAnims = useRef<{ opacity: Animated.Value; ty: Animated.Value }[]>([]);
  useEffect(() => {
    if (lineAnims.current.length !== lines.length) {
      lineAnims.current = lines.map(
        (_, i) =>
          lineAnims.current[i] ?? {
            opacity: new Animated.Value(0),
            ty: new Animated.Value(8),
          }
      );
    }
  }, [lines]);

  const stableId = typeof id === "string" ? id : id ? String(id) : "";
  const fetchedRef = useRef(false);

  // ── Fetch (데모 데이터) ───────────────────────────────────────────────────
  const fetchCard = useCallback(async (cardId: string) => {
    if (!cardId || fetchedRef.current) return;
    fetchedRef.current = true;
    setErr(null);
    setLoading(true);
    try {
      // 실제 API 사용 시: videoLocal 대신 videoUrl을 내려주면 됩니다.

      // ✅ 데모: 로컬 비디오 사용
      const json: CardPayload = {
        id: String(cardId),
        letter:
          "사랑하는 당신에게,\n" +
          "오늘 내 마음을 꽃으로 전해요.\n" +
          "바쁜 하루 속에서도 이 카드가 작은 쉼표가 되길 바라요.\n" +
          "늘 곁에 있을게요.\n그대, 화(花)야와 함께.",
        videoUrl: null,
        videoLocal: LOCAL_VIDEO,      // 🔹 핵심
        audioUrl: null,
        coverImageUrl: "https://picsum.photos/seed/polar/1200/1600",
        createdAtIso: null,
        recipientName: null,
      };
      setData(json);
    } catch (e) {
      setErr("카드 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기화 + fetch
  useEffect(() => {
    setIsPlaying(false);
    setIsEnded(false);
    setMediaDurationMs(0);
    setVisibleLineCount(0);
    Animated.timing(hintOpacity, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    sheetClose(false);

    if (stableId) fetchCard(stableId);
    else {
      setLoading(false);
      setErr("잘못된 카드 주소입니다.");
    }
  }, [stableId, fetchCard]);

  // (옵션) 오디오 길이 로딩
  useEffect(() => {
    let mounted = true;
    const loadAudio = async () => {
      if (!data?.audioUrl) return;
      try {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: data.audioUrl },
          { shouldPlay: false }
        );
        if (!mounted) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        if ("durationMillis" in status && typeof status.durationMillis === "number") {
          setMediaDurationMs(status.durationMillis);
        }
      } catch {
        // ignore
      }
    };
    loadAudio();
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [data?.audioUrl]);

  // Video status
  const onStatusUpdate = (s: any) => {
    if (!s) return;
    if ((s as AVPlaybackStatusSuccess).isLoaded) {
      const st = s as AVPlaybackStatusSuccess;
      setIsPlaying(st.isPlaying);
      setIsEnded(st.didJustFinish || false);
      if (!data?.audioUrl && typeof st.durationMillis === "number") {
        setMediaDurationMs(st.durationMillis);
      }
      if (st.didJustFinish) {
        Animated.timing(hintOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      }
    }
  };

  // 중앙 컨트롤 (탭: 재생/일시정지/리플레이, 롱탭: 정지)
  const onPressControl = async () => {
    try {
      if (!videoRef.current) return;
      const status = await videoRef.current.getStatusAsync();
      if (!("isLoaded" in status) || !status.isLoaded) return;

      if (isEnded) {
        await videoRef.current.replayAsync();
        setIsEnded(false);
        Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        return;
      }
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
        return;
      }
      await videoRef.current.playAsync();
      Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } catch {
      Alert.alert("재생 오류", "영상을 재생할 수 없어요.");
    }
  };

  const onLongPressControl = async () => {
    try {
      if (!videoRef.current) return;
      const status = await videoRef.current.getStatusAsync();
      if (!("isLoaded" in status) || !status.isLoaded) return;
      await videoRef.current.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
      setIsEnded(false);
      Animated.timing(hintOpacity, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    } catch {
      // ignore
    }
  };

  // Sheet open/close
  const sheetAnim = (open: boolean) =>
    Animated.spring(sheetY, {
      toValue: open ? 0 : SHEET_H - SHEET_PEEK,
      bounciness: 6,
      useNativeDriver: true,
    });

  const sheetOpenFn = (animate = true) => {
    setSheetOpen(true);
    (animate ? sheetAnim(true) : Animated.timing(sheetY, { toValue: 0, duration: 0, useNativeDriver: true })).start();
    startReveal();
  };

  const sheetClose = (animate = true) => {
    setSheetOpen(false);
    stopRevealTimers();
    setVisibleLineCount(0);
    (animate
      ? sheetAnim(false)
      : Animated.timing(sheetY, { toValue: SHEET_H - SHEET_PEEK, duration: 0, useNativeDriver: true })
    ).start();
  };

  const onPressHint = () => sheetOpenFn();

  // Letter reveal
  const stopRevealTimers = () => {
    revealTimers.current.forEach((t) => clearTimeout(t));
    revealTimers.current = [];
  };

  const startReveal = () => {
    stopRevealTimers();
    setVisibleLineCount(0);
    let totalMs = mediaDurationMs;
    if (!totalMs || totalMs < 1000) totalMs = Math.max(4000, mediaDurationMs); // 최소 4초

    const totalChars = lines.reduce((acc, l) => acc + Math.max(1, l.length), 0);
    if (totalChars === 0) return;

    let accMs = 0;
    lines.forEach((line, idx) => {
      const sliceMs = Math.round((Math.max(1, line.length) / totalChars) * totalMs);
      accMs += sliceMs;
      const timer = setTimeout(() => {
        setVisibleLineCount((c) => Math.min(lines.length, Math.max(c, idx + 1)));
        const anim = lineAnims.current[idx];
        if (anim) {
          Animated.parallel([
            Animated.timing(anim.opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(anim.ty, { toValue: 0, duration: 280, useNativeDriver: true }),
          ]).start();
        }
      }, accMs) as unknown as number;
      revealTimers.current.push(timer);
    });
  };

  // 로컬/원격 비디오 소스 계산
  const coverUri =
    data?.coverImageUrl ?? "https://via.placeholder.com/1200x1600.png?text=Poster";
  const nameForCaption =
    (to && String(to).trim()) || data?.recipientName || "";
  const videoSource =
    (data?.videoLocal as number | undefined) ??
    (data?.videoUrl ? { uri: data.videoUrl } : undefined);

  if (loading) {
    return (
      <View style={[styles.page, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#666" }}>카드를 준비하고 있어요…</Text>
      </View>
    );
  }
  if (err) {
    return (
      <View style={[styles.page, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#b91c1c", textAlign: "center" }}>{err}</Text>
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 16) }]}>

      {/* 🔹 오른쪽 상단 '다음' 버튼 (아이콘 → 흰 글자) */}
      <Pressable
        style={[styles.nextBtn, { top: 8, right: 12 }]}
        onPress={() =>
          router.push({
            pathname: "/paymentConfirm",
            params: { id: stableId, to: nameForCaption },
          })
        }
        accessibilityLabel="다음"
      >
        <Text style={styles.nextBtnText}>다음</Text>
      </Pressable>

      {/* ───────── 폴라로이드 카드 ───────── */}
      <View style={styles.polaroidWrap}>
        <View style={styles.polaroidInner}>
          {/* 종이 질감 오버레이 */}
          <Image source={{ uri: PAPER_TEXTURE }} style={styles.paperGrain} />

          {/* 사진(=영상) 영역 */}
          <View style={styles.photoArea}>
            {videoSource ? (
              <Video
                ref={videoRef}
                source={videoSource as any}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                onPlaybackStatusUpdate={onStatusUpdate}
                shouldPlay={false}
                isLooping={false}
                useNativeControls={false}
                usePoster={false}
                posterSource={{ uri: coverUri }}
                posterStyle={styles.video}
              />
            ) : (
              <Image source={{ uri: coverUri }} style={styles.video} />
            )}

            {/* 중앙 컨트롤(탭=재생/일시정지/리플레이, 롱탭=정지) */}
            <Pressable
              onPress={onPressControl}
              onLongPress={onLongPressControl}
              delayLongPress={280}
              style={styles.playHit}
              accessibilityLabel={isEnded ? "다시 재생" : isPlaying ? "일시정지" : "재생"}
            >
              {!isPlaying && <View style={styles.playTriangle} />}
            </Pressable>

            {/* 영상 종료 후 배너 가이드 */}
            <Animated.View
              pointerEvents="box-none"
              style={[styles.hintOverlay, { opacity: hintOpacity, bottom: 10 }]}
            >
              <Pressable onPress={onPressHint} style={styles.hintPill} accessibilityLabel="편지 보기">
                <Text style={styles.hintText}>배너를 올려 편지 보기</Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* 폴라로이드 하단 넓은 영역: 날짜 + “사랑하는 00에게” */}
          <View style={styles.bottomCaption}>
            <Text style={styles.bottomCaptionText}>
              {formatKoDate()} 사랑하는 {nameForCaption}선아에게
            </Text>
          </View>

          {/* ▽ 모서리 테이프 4개 (찢어진 PNG) ▽ */}
          <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeTL]} />
          <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeTR]} />
          <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeBL]} />
          <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeBR]} />
        </View>
      </View>

      {/* ───────── 하단 배너(반투명 검정, 흰 굵은 글자) ───────── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <Pressable
          onPress={() => (sheetOpen ? sheetClose() : sheetOpenFn())}
          style={styles.sheetHandle}
          accessibilityLabel={sheetOpen ? "배너 닫기" : "배너 열기"}
        >
          <View style={styles.grabber} />
        </Pressable>

        <View style={{ paddingHorizontal: 18, paddingTop: 6 }}>
          {lines.map((line, i) => {
            const anim = lineAnims.current[i];
            return (
              <Animated.Text
                key={i}
                style={[
                  styles.letterLine,
                  { opacity: anim?.opacity ?? 0, transform: [{ translateY: anim?.ty ?? 8 }] },
                ]}
              >
                {line === "" ? " " : line}
              </Animated.Text>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG, alignItems: "center" },

  // 오른쪽 상단 '다음' 버튼
  nextBtn: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 60,
    elevation: 60,
  },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Polaroid
  polaroidWrap: {
    width: CARD_W,
    alignItems: "center",
    paddingTop: 38,
  },
  polaroidInner: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  paperGrain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
    resizeMode: "repeat" as any,
    pointerEvents: "none",
    borderRadius: 6,
  },
  photoArea: {
    width: "100%",
    height: PHOTO_H,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    borderWidth: 1,
    borderColor: "#FFF",
    transform: [{ rotate: "-0.2deg" }],
  },
  video: { width: "100%", height: "100%" },

  // 중앙 컨트롤 히트 박스
  playHit: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 86,
    height: 86,
    marginLeft: -43,
    marginTop: -43,
    alignItems: "center",
    justifyContent: "center",
  },
  // 회색 삼각형(재생)
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderBottomWidth: 20,
    borderLeftWidth: 32,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#9CA3AF",
    marginLeft: 6,
  },

  bottomCaption: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  bottomCaptionText: {
    fontSize: 14,
    color: "#000",
  },

  // 모서리 테이프 4개 (찢어진 PNG)
  cornerTape: {
    position: "absolute",
    width: 300, // 가로크기
    height: 200, // 세로크기
    resizeMode: "contain",
    zIndex: 0,
    opacity: 0.95,
  },
  tapeTL: { top: -60, left: -150, transform: [{ rotate: "-15deg" }] },
  tapeTR: { top: -90, right: -120, transform: [{ rotate: "75deg" }] },
  tapeBL: { bottom: -90, left: -150, transform: [{ rotate: "75deg" }] },
  tapeBR: { bottom: -110, right: -135, transform: [{ rotate: "-15deg" }] },

  // 힌트 pill (영상 종료 시)
  hintOverlay: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  hintPill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  hintText: { color: "#111827", fontWeight: "700", fontSize: 12 },

  // 하단 배너
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_H,
    backgroundColor: "rgba(0,0,0,0.7)", // 반투명 검정
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 16,
  },
  sheetHandle: { alignItems: "center", paddingTop: 8, paddingBottom: 10 },
  grabber: { width: 46, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.7)" },

  letterLine: {
    fontSize: 16,
    lineHeight: 26,
    color: "#fff",
    fontWeight: "800",
    marginBottom: 6,
  },
});
