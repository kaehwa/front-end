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
  Easing,
  PanResponder,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatusSuccess, Audio } from "expo-av";
import EnvelopeOverlay from "../app/EnvelopeOverlay";

// ── 화면/카드 치수 ───────────────────────────────────────────────────────────
const { width, height } = Dimensions.get("window");
const CARD_W = Math.min(380, width - 40);
const CARD_H = Math.min(620, Math.round(height * 0.8));
const PHOTO_H = Math.round(CARD_W * 0.9);
const PAGE_BG = "#F5EFE3";
const BANNER_MAX_H = Math.min(Math.round(CARD_H * 0.65), 420);

// ── 종이 텍스처 ─────────────────────────────────────────────────────────────
const PAPER_TEXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGXRFWHRTb2Z0d2FyZQBwYXBlci1ub2lzZS1nZW4gMS4wAAAAPElEQVQYV2NkYGD4z8DAwPCfGQYGBgYmBqYyYGBg8H8YjEGEhQm8Dg0EwYGBgYGJgYBgYGBoYH8AEgkAQt1mA1kAAAAASUVORK5CYII=";

// ── 로컬 리소스 ─────────────────────────────────────────────────────────────
const LOCAL_VIDEO = require("../assets/videos/file.mp4");
const CORNER_TAPE = require("../assets/images/tape.png");
const BACK_GIF = require("../assets/videos/file.gif");

// ── 타입 ────────────────────────────────────────────────────────────────────
type CardPayload = {
  id: string;
  letter: string;
  videoUrl?: string | null;
  videoLocal?: number | null;
  audioUrl?: string | null;
  coverImageUrl?: string | null;
   backImageUrl?: string | null;   // ✅ 뒷면 이미지 URL
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

export default function CardScreen() {
  const { id, to } = useLocalSearchParams<{ id?: string; to?: string }>();
  const insets = useSafeAreaInsets();

  // ── 인트로(봉투) ─────────────────────────────────────────────────────────
  const [showIntro, setShowIntro] = useState(true);
  const mainOpacity = useRef(new Animated.Value(0)).current;
  const handleIntroDone = useCallback(() => {
    setShowIntro(false);
    Animated.timing(mainOpacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mainOpacity]);

  // ── 데이터 로딩 ───────────────────────────────────────────────────────────
  const [data, setData] = useState<CardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 미디어
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [mediaDurationMs, setMediaDurationMs] = useState<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Letter reveal ────────────────────────────────────────────────────────
  const [visibleLineCount, setVisibleLineCount] = useState(0);
  const revealTimers = useRef<number[]>([]);
  const lines = useMemo(() => {
    const text = data?.letter ?? "";
    return text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l, i, arr) => !(l === "" && (arr[i - 1] ?? "") === ""));
  }, [data?.letter]);

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

  // ── 스와이프 힌트(영상 종료 후 잠깐 노출) ────────────────────────────────
  const [showSwipeCue, setShowSwipeCue] = useState(false);
  const swipeCueOpacity = useRef(new Animated.Value(0)).current;
  const hideSwipeCue = useCallback(() => {
    if (!showSwipeCue) return;
    Animated.timing(swipeCueOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setShowSwipeCue(false));
  }, [showSwipeCue, swipeCueOpacity]);

  // 스와이프 힌트 자동 노출/자동 종료
  const showSwipeCueBriefly = useCallback(() => {
    setShowSwipeCue(true);
    swipeCueOpacity.setValue(0);
    Animated.timing(swipeCueOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      // 2.5초 뒤 자동 숨김
      setTimeout(() => {
        hideSwipeCue();
      }, 1.500);
    });
  }, [hideSwipeCue, swipeCueOpacity]);

  const stableId = typeof id === "string" ? id : id ? String(id) : "";
  const fetchedRef = useRef(false);
  
  const fetchCard = useCallback(async (cardId: string) => {
    if (!cardId || fetchedRef.current) return;
    fetchedRef.current = true;
    setErr(null);
    setLoading(true);
    try {
      const json: CardPayload = {
        id: String(cardId),
        letter:
          "사랑하는 당신에게,\n" +
          "오늘 내 마음을 꽃으로 전해요.\n" +
          "바쁜 하루 속에서도 이 카드가 작은 쉼표가 되길 바라요.\n" +
          "늘 곁에 있을게요.\n그대, 화(花)야와 함께.",
        videoUrl: null,
        videoLocal: LOCAL_VIDEO,
        audioUrl: null, // ✅ 오디오 URL이 오면 이 길이를 우선 사용
        coverImageUrl: "https://picsum.photos/seed/polar/1200/1600",
        createdAtIso: null,
        recipientName: null,
      };
      setData(json);
    } catch (e){
      console.log("error")
      console.log(e)
      setErr("카드 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setIsEnded(false);
    setMediaDurationMs(0);
    setVisibleLineCount(0);
    stopRevealTimers();
    setShowSwipeCue(false);
    console.log("fetchCard", stableId);
    if (stableId) fetchCard(stableId);
    else {
      setLoading(false);
      setErr("잘못된 카드 주소입니다.");
    }
  }, [stableId, fetchCard]);

  // (옵션) 오디오 길이
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
      } catch {}
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

  // 비디오 상태
  const onStatusUpdate = (s: any) => {
    if (!s) return;
    if ((s as AVPlaybackStatusSuccess).isLoaded) {
      const st = s as AVPlaybackStatusSuccess;
      setIsPlaying(st.isPlaying);
      setIsEnded(st.didJustFinish || false);
      if (!data?.audioUrl && typeof st.durationMillis === "number") {
        setMediaDurationMs(st.durationMillis);
      }
      // ▶︎ 영상이 막 끝났을 때, 스와이프 힌트 잠깐 노출
      if (st.didJustFinish) {
        showSwipeCueBriefly();
      }
    }
  };

  const onPressControl = async () => {
    try {
      // 사용자가 행동했으므로 힌트 즉시 숨김
      hideSwipeCue();

      if (!videoRef.current) return;
      const status = await videoRef.current.getStatusAsync();
      if (!("isLoaded" in status) || !status.isLoaded) return;

      if (isEnded) {
        await videoRef.current.replayAsync();
        setIsEnded(false);
        return;
      }
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
        return;
      }
      await videoRef.current.playAsync();
    } catch {
      Alert.alert("재생 오류", "영상을 재생할 수 없어요.");
    }
  };

  const onLongPressControl = async () => {
    hideSwipeCue();
    try {
      if (!videoRef.current) return;
      const status = await videoRef.current.getStatusAsync();
      if (!("isLoaded" in status) || !status.isLoaded) return;
      await videoRef.current.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
      setIsEnded(false);
    } catch {}
  };

  // ── 플립: 스와이프만 ─────────────────────────────────────────────────────
  const flipDeg = useRef(new Animated.Value(0)).current; // 0=앞, ±180=뒤
  const frontRotate = flipDeg.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ["-180deg", "0deg", "180deg"],
  });
  const backRotate = flipDeg.interpolate({
    inputRange: [-180, 0, 180, 360],
    outputRange: ["0deg", "180deg", "360deg", "540deg"],
  });

  const isFront = useRef(true);
  flipDeg.addListener(({ value }) => {
    isFront.current = value > -90 && value < 90;
  });

  const animateFlipTo = (toDeg: number) => {
    Animated.timing(flipDeg, {
      toValue: toDeg,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const SWIPE_THRESHOLD = 12;
  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // 탭은 자식으로
      onMoveShouldSetPanResponder: (_, g) =>
        !bannerOpen && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > SWIPE_THRESHOLD,
      onPanResponderMove: () => {},
      onPanResponderRelease: (_, g) => {
        // 사용자 행동 → 힌트 숨김
        hideSwipeCue();
        if (bannerOpen) return;
        if (g.dx > SWIPE_THRESHOLD * 5) {
          if (isFront.current) animateFlipTo(-180);
          else animateFlipTo(0);
        } else if (g.dx < -SWIPE_THRESHOLD * 5) {
          if (isFront.current) animateFlipTo(180);
          else animateFlipTo(0);
        }
      },
    })
  ).current;

  // ── 앞면 편지 배너 ───────────────────────────────────────────────────────
  const [bannerOpen, setBannerOpen] = useState(false);
  const bannerTY = useRef(new Animated.Value(BANNER_MAX_H)).current;

  const stopRevealTimers = () => {
    revealTimers.current.forEach((t) => clearTimeout(t));
    revealTimers.current = [];
  };

  const startReveal = () => {
    stopRevealTimers();
    setVisibleLineCount(0);

    // 오디오가 있으면 오디오 길이, 없으면 비디오 길이(최소 4초)
    let totalMs = mediaDurationMs;
    if (!totalMs || totalMs < 1000) totalMs = Math.max(4000, mediaDurationMs);

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

  const snapBanner = useCallback(
    (open: boolean, startWhenOpen = true) => {
      setBannerOpen(open);
      Animated.timing(bannerTY, {
        toValue: open ? 0 : BANNER_MAX_H,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (open && startWhenOpen && lines.length > 0) startReveal();
        if (!open) {
          stopRevealTimers();
          setVisibleLineCount(0);
        }
      });
    },
    [bannerTY, lines.length]
  );

  // 배너 드래그 제스처
  const bannerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        // 사용자 행동 → 힌트 숨김
        hideSwipeCue();
        // 닫힘 기준(BANNER_MAX_H) + dy; 위로 올리면 dy 음수 → 0쪽으로 이동
        const next = Math.min(BANNER_MAX_H, Math.max(0, BANNER_MAX_H + g.dy));
        bannerTY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const openedEnough = (BANNER_MAX_H + g.dy) < BANNER_MAX_H * 0.6 || g.vy < -0.8;
        snapBanner(openedEnough);
      },
      onPanResponderTerminate: () => {
        snapBanner(false, false);
      },
    })
  ).current;

  // lines가 늦게 로드되어도, 배너가 열려 있으면 자동 리빌
  useEffect(() => {
    if (bannerOpen && lines.length > 0) startReveal();
  }, [lines.length, bannerOpen]);

  // 소스
  const coverUri = data?.coverImageUrl ?? "https://via.placeholder.com/1200x1600.png?text=Poster";
  const nameForCaption = (to && String(to).trim()) || data?.recipientName || "";
  const videoSource =
    (data?.videoLocal as number | undefined) ?? (data?.videoUrl ? { uri: data.videoUrl } : undefined);

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
      {/* 인트로 봉투 */}
      {showIntro && (
        <EnvelopeOverlay
          onDone={handleIntroDone}
          palette={{ shell: "#F2D5C9", liner: "#FFEDE4", bg: "transparent" }}
        />
      )}

      {/* 우상단 '다음' */}
      <Pressable
        style={[styles.nextBtn, { top: 8, right: 12 }]}
        onPress={() =>
          router.push({ pathname: "/paymentConfirm", params: { id: String(stableId), to: nameForCaption } })
        }
        accessibilityLabel="다음"
      >
        <Text style={styles.nextBtnText}>다음</Text>
      </Pressable>

      {/* 카드(축 고정) — 스와이프 핸들러만 부착 */}
      <Animated.View style={[styles.cardShadowWrap, { opacity: mainOpacity }]} {...swipeResponder.panHandlers}>
        {/* 앞면 */}
        <Animated.View
          style={[
            styles.cardBase,
            { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] },
          ]}
        >
          {/* 종이질감 */}
          <Image source={{ uri: PAPER_TEXTURE }} style={styles.cardPaper} />

          {/* 폴라로이드 묶음 */}
          <View style={styles.polaroidWrap}>
            <View style={styles.polaroidInner}>
              <Image source={{ uri: PAPER_TEXTURE }} style={styles.paperGrain} />
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

                {/* 중앙 컨트롤 */}
                <Pressable
                  onPress={onPressControl}
                  onLongPress={onLongPressControl}
                  delayLongPress={280}
                  style={styles.playHit}
                  accessibilityLabel={isEnded ? "다시 재생" : isPlaying ? "일시정지" : "재생"}
                >
                  {!isPlaying && <View style={styles.playTriangle} />}
                </Pressable>
              </View>

              <View style={styles.bottomCaption}>
                <Text style={styles.bottomCaptionText}>
                  {formatKoDate()} 사랑하는 {nameForCaption}에게
                </Text>
              </View>

              {/* 모서리 테이프 */}
              <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeTL]} />
              <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeTR]} />
              <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeBL]} />
              <Image source={CORNER_TAPE} style={[styles.cornerTape, styles.tapeBR]} />
            </View>
          </View>

          {/* ▶︎ 스와이프 힌트 (영상 종료 후 잠깐 노출) */}
          {showSwipeCue && (
            <Animated.View style={[styles.swipeCueWrap, { opacity: swipeCueOpacity }]}>
              
              <Text style={styles.swipeCueText}>아래에서 위로 쓸어올려 편지보기</Text>
            </Animated.View>
          )}

          {/* 앞면 편지 배너 */}
          <Animated.View
            style={[styles.letterBanner, { height: BANNER_MAX_H, transform: [{ translateY: bannerTY }] }]}
            {...bannerPanResponder.panHandlers}
          >
            <Image source={{ uri: PAPER_TEXTURE }} style={styles.bannerPaper} />
            <View style={styles.bannerHandleWrap}>
              <View style={styles.bannerHandle} />
              <Text style={styles.bannerTitle}>편지</Text>
              <Pressable onPress={() => snapBanner(false, false)} style={styles.bannerCloseBtn} accessibilityLabel="편지 닫기">
                <Text style={styles.bannerCloseText}>닫기</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.letterScroll} showsVerticalScrollIndicator={false}>
              {lines.map((line, i) => {
                const anim = lineAnims.current[i];
                const show = i < visibleLineCount;
                return (
                  <Animated.Text
                    key={i}
                    style={[
                      styles.letterLineBack,
                      {
                        opacity: show ? (anim?.opacity ?? 0) : 0,
                        transform: [{ translateY: show ? (anim?.ty ?? 8) : 8 }],
                      },
                    ]}
                  >
                    {line === "" ? " " : line}
                  </Animated.Text>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>

        {/* 뒷면 */}
        <Animated.View
          style={[
            styles.cardBase,
            styles.cardBack,
            { transform: [{ perspective: 1200 }, { rotateY: backRotate }] },
          ]}
        >
          <Image source={{ uri: PAPER_TEXTURE }} style={styles.cardPaper} />
          <View style={styles.backHeader}>
            <Text style={styles.backTitle}>뒷면</Text>
            <Pressable onPress={() => animateFlipTo(0)} style={styles.backFlipBtn}>
              <Text style={styles.backFlipText}>앞면</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#6b7280" }}>여기에 추후 콘텐츠를 넣어보자(예: 추천 꽃 정보 등)</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG, alignItems: "center" },

  // 우상단 '다음'
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

  // 카드 공통
  cardShadowWrap: {
    width: CARD_W,
    height: CARD_H,
    marginTop: 28,
  },
  cardBase: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    backfaceVisibility: "hidden",
    padding: 16,
  },
  cardBack: { backgroundColor: "#FFFBF4" },
  cardPaper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.13,
    resizeMode: "repeat" as any,
    pointerEvents: "none",
  },

  // 앞면 콘텐츠
  polaroidWrap: {
    width: "100%",
    alignItems: "center",
    paddingTop: 8,
  },
  polaroidInner: {
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
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
  //video: {height: "100%"},//{ width: "", height: "100%", position: "relative"},
  video: {
    ...StyleSheet.absoluteFillObject, // 부모 영역 완전히 채움
    width: "100%",
    height: "100%",
    position: "relative",
  },

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

  bottomCaption: { marginTop: 12, paddingVertical: 10, alignItems: "center" },
  bottomCaptionText: { fontSize: 14, color: "#000" },

  cornerTape: {
    position: "absolute",
    width: 300,
    height: 200,
    resizeMode: "contain",
    zIndex: 0,
    opacity: 0.95,
  },
  tapeTL: { top: -60, left: -150, transform: [{ rotate: "-15deg" }] },
  tapeTR: { top: -90, right: -120, transform: [{ rotate: "75deg" }] },
  tapeBL: { bottom: -90, left: -150, transform: [{ rotate: "75deg" }] },
  tapeBR: { bottom: -110, right: -135, transform: [{ rotate: "-15deg" }] },

  // 스와이프 힌트
  swipeCueWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    paddingHorizontal: 16,
  },
  swipeCueText: {
    marginTop: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "700",
  },
  swipeArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#9CA3AF", // 위로 향하는 작은 화살표
  },

  // 편지 배너
  letterBanner: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#FFFDF8",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    zIndex: 3,
  },
  bannerPaper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    resizeMode: "repeat" as any,
  },
  bannerHandleWrap: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginBottom: 6,
  },
  bannerTitle: { fontWeight: "800", color: "#1F2937", fontSize: 14 },
  bannerCloseBtn: {
    position: "absolute",
    right: 10,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  bannerCloseText: { fontSize: 12, fontWeight: "700", color: "#111827" },

  // 뒷면 헤더
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  backTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  backFlipBtn: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  backFlipText: { color: "#111827", fontWeight: "700", fontSize: 12 },

  // 편지 텍스트
  letterScroll: { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 12 },
  letterLineBack: {
    fontSize: 16,
    lineHeight: 26,
    color: "#2D2A26",
    fontWeight: "700",
    marginBottom: 6,
  },
});
