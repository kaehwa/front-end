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
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, AVPlaybackStatusSuccess, Audio } from "expo-av";
import EnvelopeOverlay from "../app/EnvelopeOverlay";
import * as FileSystem from "expo-file-system";

// 화면/카드 치수
const { width, height } = Dimensions.get("window");
const CARD_W = Math.min(380, width - 40);
const CARD_H = Math.min(620, Math.round(height * 0.8));
const PHOTO_H = Math.round(CARD_W * 0.9);
const PAGE_BG = "#F5EFE3";
const BANNER_MAX_H = Math.min(Math.round(CARD_H * 0.65), 420);

// 종이 텍스처
const PAPER_TEXTURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAGXRFWHRTb2Z0d2FyZQBwYXBlci1ub2lzZS1nZW4gMS4wAAAAPElEQVQYV2NkYGD4z8DAwPCfGQYGBgYmBqYyYGBg8H8YjEGEhQm8Dg0EwYGBgYGJgYBgYGBoYH8AEgkAQt1mA1kAAAAASUVORK5CYII=";

// 로컬 리소스
const LOCAL_VIDEO = require("../assets/videos/file.mp4");
const CORNER_TAPE = require("../assets/images/tape.png");

// 타입
type CardPayload = {
  id: string;
  letter: string;
  videoUrl?: string | null;     // 앞면: videoletterUrl (또는 videoUrl 폴백)
  videoLocal?: number | null;
  audioUrl?: string | null;
  coverImageUrl?: string | null;
  backVideoUrl?: string | null; // 뒷면: bouquetVideoUrl만
  createdAtIso?: string | null;
  recipientName?: string | null;
};

// 유틸
function formatKoDate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}.`;
}

const BACKEND_URL = "http://4.240.103.29:8080";

export default function CardScreen() {
  const { orderID, to } = useLocalSearchParams<{ orderID?: string; to?: string }>();
  const insets = useSafeAreaInsets();

  // 인트로(봉투)
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

  // 데이터/상태
  const [data, setData] = useState<CardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [mediaDurationMs, setMediaDurationMs] = useState<number>(0);

  // 앞/뒤 어느 면인지 (터치 충돌 방지용)
  const [face, setFace] = useState<"front" | "back">("front");

  // 오디오
  const soundRef = useRef<Audio.Sound | null>(null);

  // 앞면 오버레이 비디오
  const overlayVideoRef = useRef<Video>(null);
  const [overlaySource, setOverlaySource] = useState<any>(null);
  const tempObjectUrlsRef = useRef<string[]>([]);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [overlayAspect, setOverlayAspect] = useState<number | null>(null);
  const [overlaySize, setOverlaySize] = useState<{ width: number; height: number } | null>(null);
  const overlayScale = useRef(new Animated.Value(0.96)).current;

  // 뒷면 비디오
  const backVideoRef = useRef<Video>(null);
  const [backVideoAspect, setBackVideoAspect] = useState<number | null>(null);
  const [backVideoSize, setBackVideoSize] = useState<{ width: number; height: number } | null>(null);

  // unmount 시 웹 blob revoke
  useEffect(() => {
    return () => {
      try {
        if (Platform.OS === "web") {
          tempObjectUrlsRef.current.forEach((u) => {
            try {
              console.log("revoking object URL", u);
              URL.revokeObjectURL(u);
            } catch (e) {
              console.log("revoke failed", u, e);
            }
          });
          tempObjectUrlsRef.current = [];
        }
      } catch (e) {
        console.log("cleanup error", e);
      }
    };
  }, []);

  const onCloseOverlay = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayScale, { toValue: 0.96, duration: 220, useNativeDriver: true }),
    ]).start(async () => {
      setOverlayVisible(false);
      setOverlaySource(null);
      try {
        await overlayVideoRef.current?.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
      } catch {}
      setOverlaySize(null);
      showSwipeCueBriefly();
    });
  };

  // Letter reveal
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

  // 스와이프 힌트
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

  const showSwipeCueBriefly = useCallback(() => {
    setShowSwipeCue(true);
    swipeCueOpacity.setValue(0);
    Animated.timing(swipeCueOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => hideSwipeCue(), 1500);
    });
  }, [hideSwipeCue, swipeCueOpacity]);

  const stableId = orderID;

  // URI 유틸
  const isLocalLike = (u?: string | null) => !!u && /^(file:|asset:|content:|blob:|data:)/i.test(u);

  const safeDecodeAzure = (u?: string | null) => {
    if (!u) return null;
    try {
      const url = new URL(u, BACKEND_URL);
      url.pathname = decodeURIComponent(url.pathname);
      console.log("url.toString()")
      console.log(url.toString())
      return url.toString();
    } catch {
      return u;
    }
  };

  const normalizeRemote = (u?: string | null) => {
    if (!u) return null;
    const raw =
      /^https?:\/\//i.test(u) || isLocalLike(u)
        ? u
        : `${BACKEND_URL.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;

    console.log("fianal!!!!!!!!!!!!!()")
    console.log(raw)
    return safeDecodeAzure(raw);
  };

  const PROXY_BASE = "http://localhost:3000";
  const resolveWithProxy = async (u?: string | null): Promise<string | null> => {
    if (!u) return null;
    try {
      if (isLocalLike(u) || !/^https?:\/\//i.test(u)) return u;
      const urlObj = new URL(u);
      if (!urlObj.hostname.endsWith("blob.core.windows.net")) return u;

      try {
        const head = await fetch(u, { method: "HEAD" });
        if (head.ok) return u;
        if (head.status === 409) {
          const parts = urlObj.pathname.replace(/^\//, "").split("/");
          parts.shift();
          const blobPath = parts.join("/");
          console.log("proxy url")
          console.log(`${PROXY_BASE}/proxy?blob=${encodeURIComponent(blobPath)}`)
          return `${PROXY_BASE}/proxy?blob=${encodeURIComponent(blobPath)}`;
        }
        return u;
      } catch {
        try {
          const parts = urlObj.pathname.replace(/^\//, "").split("/");
          parts.shift();
          const blobPath = parts.join("/");
          return `${PROXY_BASE}/proxy?blob=${encodeURIComponent(blobPath)}`;
        } catch {
          return u;
        }
      }
    } catch {
      return u ?? null;
    }
  };

  const fetchCard = useCallback(async (cardId: string) => {
    setErr(null);
    setLoading(true);
    try {
      // 1) 기본 데이터
      const res = await fetch(`${BACKEND_URL}/flowers/${cardId}/medialetter`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      // 2) 서명 URL 보강
      try {
        const signedRes = await fetch(`${BACKEND_URL}/flowers/${cardId}/medialetter?signed=true`);
        if (signedRes.ok) {
          const sj = await signedRes.json();
          if (sj.videoUrl || sj.videoletterUrl) raw.videoletterUrl = sj.videoletterUrl ?? sj.videoUrl;
          if (sj.audioUrl || sj.voiceletterUrl) raw.voiceletterUrl = sj.voiceletterUrl ?? sj.audioUrl;
          if (sj.bouquetVideoUrl) raw.bouquetVideoUrl = sj.bouquetVideoUrl;
          if (sj.flowerTo) raw.flowerTo = sj.flowerTo;
        }
      } catch {}

      // 3) 텍스트 포맷
      function insertLineBreaksWithDot(str: string, size: number = 25) {
        if (!str) return "";
        let result = "";
        let start = 0;
        while (start < str.length) {
          let end = start + size;
          const dotIndex = str.lastIndexOf(".", end);
          if (dotIndex >= start) end = dotIndex + 1;
          result += str.slice(start, end) + "\n";
          start = end;
        }
        return result.trim();
      }
      const formatMessage = insertLineBreaksWithDot(raw.recommendMessage, 28);

      // 4) 경로 초안—앞면/뒷면 완전 분리
      let frontRaw: string | null = raw.videoletterUrl ?? raw.videoUrl ?? null; // 앞면: videoletter
      let backRaw: string | null = raw.bouquetVideoUrl ?? null;                 // 뒷면: bouquet (폴백 없음)
      let audioRaw: string | null =
        raw.voiceletterUrl ?? raw.voiceletter ?? raw.audioUrl ?? raw.voiceUrl ?? null;

      console.log("RAW URLS ===>", {
        videoletterUrl: raw.videoletterUrl,
        videoUrl: raw.videoUrl,
        bouquetVideoUrl: raw.bouquetVideoUrl,
        voiceletterUrl: raw.voiceletterUrl,
      });

      // 5) base64 → 파일/Blob
      try {
        const tmpUrls: string[] = [];
        const writeB64 = async (b64: string, filename: string) => {
          if (Platform.OS === "web") {
            const res = atob(b64.replace(/^data:.*;base64,/, ""));
            const u8 = new Uint8Array(res.length);
            for (let i = 0; i < res.length; i++) u8[i] = res.charCodeAt(i);
            const mime = filename.endsWith(".mp4")
              ? "video/mp4"
              : filename.endsWith(".m4a")
              ? "audio/mp4"
              : "application/octet-stream";
            const blob = new Blob([u8.buffer], { type: mime });
            const url = URL.createObjectURL(blob);
            tmpUrls.push(url);
            return url;
          }
          const dir = `${FileSystem.documentDirectory}media/`;
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
          const path = dir + filename;
          await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
          return path;
        };

        const base64Front = raw.videoletterBase64 || raw.videoBase64;
        if (base64Front && typeof base64Front === "string") {
          frontRaw = await writeB64(base64Front, `video_front_${String(cardId)}.mp4`);
        }

        const base64Back = raw.bouquetVideoBase64;
        if (!raw.bouquetVideoUrl && base64Back && typeof base64Back === "string") {
          backRaw = await writeB64(base64Back, `video_back_${String(cardId)}.mp4`);
        }

        const base64Audio = raw.voiceletterBase64 || raw.audioBase64 || raw.voiceBase64;
        if (base64Audio && typeof base64Audio === "string") {
          audioRaw = await writeB64(base64Audio, `audio_${String(cardId)}.m4a`);
        }

        if (tmpUrls.length > 0) tempObjectUrlsRef.current = tempObjectUrlsRef.current.concat(tmpUrls);
      } catch (e) {
        console.log("base64 -> file write failed", e);
      }

      // 6) 정규화/프록시
      let frontVideoUri: string | null = (await resolveWithProxy(normalizeRemote(frontRaw))) ?? null;
      let audioUri: string | null = (await resolveWithProxy(normalizeRemote(audioRaw))) ?? null;

      let backVideoUri: string | null = null;
      if (backRaw) {
        const cand = normalizeRemote(backRaw);
        backVideoUri = (await resolveWithProxy(cand)) ?? cand ?? backRaw;
      }

      // 7) 상태 저장
      const cardP: CardPayload = {
        id: String(cardId),
        letter: formatMessage,
        videoUrl: frontVideoUri,                 // 앞면
        videoLocal: frontVideoUri ? null : LOCAL_VIDEO,
        audioUrl: audioUri,
        coverImageUrl: "https://picsum.photos/seed/polar/1200/1600",
        createdAtIso: null,
        recipientName: raw.flowerTo ?? raw.recipientName ?? null,
        backVideoUrl: backVideoUri,              // 뒷면
      };

      console.log("DATA URLS ===>", {
        front: cardP.videoUrl,
        back: cardP.backVideoUrl,
        audio: cardP.audioUrl,
      });

      setData(cardP);
    } catch (e) {
      console.log("fetch error", e);
      setErr("카드 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setIsEnded(false);
    setMediaDurationMs(0);
    stopRevealTimers();
    setShowSwipeCue(false);
    if (stableId) fetchCard(stableId);
    else {
      setLoading(false);
      setErr("잘못된 카드 주소입니다.");
    }
  }, [stableId, fetchCard]);

  // data 변경 시 URL 디버그
  useEffect(() => {
    if (!data) return;
    console.log("data URLs:", { front: data.videoUrl, back: data.backVideoUrl, audio: data.audioUrl });
  }, [data?.videoUrl, data?.backVideoUrl, data?.audioUrl]);

  // 오디오 모드
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
    }).catch(() => {});
  }, []);

  // 오디오 로딩
  useEffect(() => {
    let mounted = true;
    const loadAudio = async () => {
      if (!data?.audioUrl) return;
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: data.audioUrl },
          { shouldPlay: false },
          (st) => {
            if (!st || !("isLoaded" in st) || !st.isLoaded) return;
            setIsPlaying(st.isPlaying ?? false);
            setIsEnded((st as any).didJustFinish ?? false);
            if (typeof st.durationMillis === "number") setMediaDurationMs(st.durationMillis);
            if ((st as any).didJustFinish) showSwipeCueBriefly();
          }
        );
        if (!mounted) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;

        if ("durationMillis" in status && typeof status.durationMillis === "number") {
          setMediaDurationMs(status.durationMillis);
        }
      } catch (e) {
        console.log("Audio load error", e);
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

  // 오버레이(앞면) 상태 업데이트
  const onOverlayStatusUpdate = (s: any) => {
    if (!s) return;
    if ((s as AVPlaybackStatusSuccess).isLoaded) {
      const st = s as AVPlaybackStatusSuccess;
      setIsPlaying(st.isPlaying);
      setIsEnded(st.didJustFinish || false);
      if (!data?.audioUrl && typeof st.durationMillis === "number") {
        setMediaDurationMs(st.durationMillis);
      }
      try {
        const nat: any = (st as any).naturalSize ?? (st as any).naturalSize;
        if (nat && typeof nat.width === "number" && typeof nat.height === "number" && nat.height > 0) {
          setOverlayAspect(nat.width / nat.height);
          setOverlaySize({ width: Math.round(nat.width), height: Math.round(nat.height) });
        }
      } catch {}
      if (st.didJustFinish) {
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.timing(overlayScale, { toValue: 0.96, duration: 260, useNativeDriver: true }),
        ]).start(() => {
          setOverlayVisible(false);
          try {
            overlayVideoRef.current?.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
          } catch {}
          setOverlaySize(null);
          showSwipeCueBriefly();
        });
      }
    }
  };

  // 뒷면 비디오 상태 업데이트(자연 크기 획득용)
  const onBackVideoStatusUpdate = (s: any) => {
    if (!s) return;
    try {
      const st: any = s as AVPlaybackStatusSuccess;
      const nat: any = (st as any).naturalSize ?? (st as any).naturalSize;
      if (nat && typeof nat.width === "number" && typeof nat.height === "number" && nat.height > 0) {
        setBackVideoAspect(nat.width / nat.height);
        setBackVideoSize({ width: Math.round(nat.width), height: Math.round(nat.height) });
      }
    } catch {}
  };

  // 재생 컨트롤
  const stopAudioIfPlaying = useCallback(async () => {
    try {
      const snd = soundRef.current;
      if (!snd) return;
      const st = await snd.getStatusAsync();
      if ("isLoaded" in st && st.isLoaded && st.isPlaying) {
        await snd.stopAsync();
        await snd.setPositionAsync(0);
        setIsPlaying(false);
      }
    } catch {}
  }, []);

  const onPressControl = async () => {
    hideSwipeCue();

    const onFront = isFront.current;
    const hasFrontVideo = !!(data?.videoLocal || data?.videoUrl);
    const hasAudio = !!data?.audioUrl;

    if (onFront && hasFrontVideo) {
      await stopAudioIfPlaying();
      const src =
        (data?.videoLocal as number | undefined) ??
        (data?.videoUrl ? { uri: data.videoUrl } : undefined);
      setOverlaySource(src);
      setOverlayVisible(true);
      overlayOpacity.setValue(0);
      overlayScale.setValue(0.96);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(overlayScale, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(async () => {
        try {
          if (overlayVideoRef.current) {
            const st = await overlayVideoRef.current.getStatusAsync();
            if ("isLoaded" in st && st.isLoaded) {
              await overlayVideoRef.current.replayAsync();
            } else {
              await overlayVideoRef.current.playAsync();
            }
          }
        } catch {}
      });
      return;
    }

    if (!onFront && data?.backVideoUrl && backVideoRef.current) {
      try {
        const st: any = await backVideoRef.current.getStatusAsync();
        if (st && st.isLoaded) {
          if (st.isPlaying) await backVideoRef.current.pauseAsync();
          else if (st.didJustFinish) await backVideoRef.current.replayAsync();
          else await backVideoRef.current.playAsync();
        } else {
          await backVideoRef.current.playAsync().catch(() => {});
        }
      } catch {}
      return;
    }

    if (hasAudio && soundRef.current) {
      try {
        const st = await soundRef.current.getStatusAsync();
        if ("isLoaded" in st && st.isLoaded) {
          if (st.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
      } catch {
        Alert.alert("오디오 오류", "음성을 재생할 수 없어요.");
      }
      return;
    }

    Alert.alert("재생할 미디어가 없어요");
  };

  const onLongPressControl = async () => {
    hideSwipeCue();
    try {
      if (soundRef.current) {
        const st = await soundRef.current.getStatusAsync();
        if ("isLoaded" in st && st.isLoaded) {
          await soundRef.current.stopAsync();
          await soundRef.current.setPositionAsync(0);
          setIsPlaying(false);
          setIsEnded(false);
        }
      }
      if (overlayVisible && overlayVideoRef.current) {
        await overlayVideoRef.current.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
        setIsPlaying(false);
        setIsEnded(false);
      }
      if (backVideoRef.current) {
        await backVideoRef.current.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
      }
    } catch {}
  };

  // 플립 & 스와이프
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
  const prevIsFrontRef = useRef<boolean>(true);

  const playBackVideo = useCallback(async () => {
    try {
      const v = backVideoRef.current;
      if (!v) return;
      const st: any = await v.getStatusAsync();
      if (st && "isLoaded" in st && st.isLoaded) {
        try {
          await v.replayAsync();
        } catch {
          await v.playAsync().catch(() => {});
        }
      } else {
        await v.playAsync().catch(() => {});
      }
    } catch {}
  }, []);

  const onPressBackVideo = useCallback(async () => {
    try {
      const v = backVideoRef.current;
      if (!v) return;
      const st: any = await v.getStatusAsync();
      if (st && "isLoaded" in st && st.isLoaded) {
        if (st.isPlaying) {
          await v.pauseAsync();
        } else {
          if ((st as any).didJustFinish) {
            await v.replayAsync();
          } else {
            await v.playAsync();
          }
        }
      } else {
        await v.playAsync().catch(() => {});
      }
    } catch {}
  }, []);

  const stopBackVideo = useCallback(async () => {
    try {
      const v = backVideoRef.current;
      if (!v) return;
      await v.setStatusAsync({ shouldPlay: false, positionMillis: 0 });
    } catch {}
  }, []);

  // flipDeg 리스너에서 face 업데이트 + 자동재생/정지
  useEffect(() => {
    const id = flipDeg.addListener(({ value }) => {
      const nowFront = value > -90 && value < 90;
      isFront.current = nowFront;
      if (prevIsFrontRef.current !== nowFront) {
        prevIsFrontRef.current = nowFront;
        setFace(nowFront ? "front" : "back"); // ← pointerEvents 제어

        if (!nowFront) {
          // 뒷면으로 넘어감 → bouquet 자동 재생
          playBackVideo().catch(() => {});
        } else {
          // 앞면으로 복귀 → 뒷면 정지
          stopBackVideo().catch(() => {});
        }
      }
    });
    return () => {
      try {
        flipDeg.removeListener(id);
      } catch {}
    };
  }, [flipDeg, playBackVideo, stopBackVideo]);

  const animateFlipTo = (toDeg: number) => {
    Animated.timing(flipDeg, {
      toValue: toDeg,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const [bannerOpen, setBannerOpen] = useState(false);
  const SWIPE_THRESHOLD = 12;

  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        !bannerOpen && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > SWIPE_THRESHOLD,
      onPanResponderMove: () => {},
      onPanResponderRelease: (_, g) => {
        hideSwipeCue();
        if (bannerOpen) return;
        if (g.dx > SWIPE_THRESHOLD * 5) {
          if (isFront.current) {
            animateFlipTo(-180);
            playBackVideo().catch(() => {});
          } else animateFlipTo(0);
        } else if (g.dx < -SWIPE_THRESHOLD * 5) {
          if (isFront.current) {
            animateFlipTo(180);
            playBackVideo().catch(() => {});
          } else animateFlipTo(0);
        }
      },
    })
  ).current;

  // 앞면 편지 배너
  const bannerTY = useRef(new Animated.Value(BANNER_MAX_H)).current;

  const stopRevealTimers = () => {
    revealTimers.current.forEach((t) => clearTimeout(t));
    revealTimers.current = [];
  };

  const startReveal = () => {
    stopRevealTimers();
    setVisibleLineCount(0);

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
        if (open && data?.audioUrl) {
          (async () => {
            try {
              const snd = soundRef.current;
              if (!snd) return;
              const st = await snd.getStatusAsync();
              if (st && "isLoaded" in st && st.isLoaded && !st.isPlaying) {
                await snd.playAsync();
              }
            } catch {}
          })();
        }
      });
    },
    [bannerTY, lines.length, data?.audioUrl]
  );

  // 배너 드래그
  const bannerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 6,
        onPanResponderMove: (_, g) => {
          hideSwipeCue();
          const next = Math.min(BANNER_MAX_H, Math.max(0, BANNER_MAX_H + g.dy));
          bannerTY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const openedEnough = BANNER_MAX_H + g.dy < BANNER_MAX_H * 0.6 || g.vy < -0.8;
          snapBanner(openedEnough);
        },
        onPanResponderTerminate: () => {
          snapBanner(false, false);
        },
      }),
    [hideSwipeCue, snapBanner]
  );

  // 소스
  const coverUri = data?.coverImageUrl ?? "https://via.placeholder.com/1200x1600.png?text=Poster";
  const nameForCaption = (to && String(to).trim()) || data?.recipientName || "";

  const videoSource: any =
    (data?.videoLocal as number | undefined) ??
    (data?.videoUrl ? { uri: data.videoUrl } : undefined);

  const hasVideo = !!videoSource;
  const hasAudioOnly = !hasVideo && !!data?.audioUrl;

  // 오버레이 치수
  const overlayDims = useMemo(() => {
    const maxW = Math.min(Math.max(width - 24, 1280), 1280);
    const maxH = Math.min(Math.max(height - 48, 720), 720);
    if (overlayAspect && overlayAspect > 0) {
      const byHeightW = Math.round(Math.min(maxW, Math.round(maxH * overlayAspect)));
      const byHeightH = Math.round(Math.min(maxH, Math.round(byHeightW / overlayAspect)));
      if (byHeightW <= maxW && byHeightH <= maxH) return { width: byHeightW, height: byHeightH };
      const byWidthW = Math.round(Math.min(maxW, Math.round(maxW)));
      const byWidthH = Math.round(Math.min(maxH, Math.round(byWidthW / overlayAspect)));
      return { width: byWidthW, height: byWidthH };
    }
    const fallbackAspect = 16 / 9;
    if (maxW / maxH > fallbackAspect) {
      return { width: Math.round(maxH * fallbackAspect), height: maxH };
    }
    return { width: maxW, height: Math.round(maxW / fallbackAspect) };
  }, [overlayAspect]);

  // 뒷면 비디오 치수
  const backVideoDims = useMemo(() => {
    const maxW = Math.max(CARD_W - 48, 160);
    const maxH = Math.max(Math.round(PHOTO_H * 0.9), 120);
    if (backVideoAspect && backVideoAspect > 0) {
      const byHeightW = Math.round(Math.min(maxW, Math.round(maxH * backVideoAspect)));
      const byHeightH = Math.round(Math.min(maxH, Math.round(byHeightW / backVideoAspect)));
      if (byHeightW <= maxW && byHeightH <= maxH) return { width: byHeightW, height: byHeightH };
      const byWidthW = Math.round(Math.min(maxW, Math.round(maxW)));
      const byWidthH = Math.round(Math.min(maxH, Math.round(byWidthW / backVideoAspect)));
      return { width: byWidthW, height: byWidthH };
    }
    const fallbackAspect = 16 / 9;
    if (maxW / maxH > fallbackAspect) {
      return { width: Math.round(maxH * fallbackAspect), height: maxH };
    }
    return { width: maxW, height: Math.round(maxW / fallbackAspect) };
  }, [backVideoAspect]);

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

      {/* 카드(축 고정) — 스와이프 핸들러 */}
      <Animated.View style={[styles.cardShadowWrap, { opacity: mainOpacity }]} {...swipeResponder.panHandlers}>
        {/* 앞면 (videoletterUrl) */}
        <Animated.View
          style={[styles.cardBase, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}
          pointerEvents={face === "front" ? "auto" : "none"} // ← 앞면일 때만 터치 허용
        >
          <View style={styles.polaroidWrap}>
            <View style={styles.polaroidInner}>
              <Image source={{ uri: PAPER_TEXTURE }} style={styles.paperGrain} />

              {/* 사진/영상 영역 */}
              <View style={styles.photoArea}>
                {hasVideo ? (
                  <Video
                    source={videoSource}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                    usePoster
                    posterSource={{ uri: coverUri }}
                  />
                ) : (
                  <Image source={{ uri: coverUri }} style={styles.pastedPhoto} />
                )}

                {hasVideo && <View style={styles.previewBlack} pointerEvents="none" />}

                {/* 중앙 컨트롤: 앞면=오버레이 재생 */}
                <Pressable
                  onPress={onPressControl}
                  onLongPress={onLongPressControl}
                  delayLongPress={280}
                  style={styles.playHit}
                  accessibilityLabel={
                    isEnded ? "다시 재생" : isPlaying ? "일시정지" : hasVideo ? "영상 재생" : hasAudioOnly ? "음성 재생" : "재생"
                  }
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

          {/* 스와이프 힌트 */}
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
                      { opacity: show ? (anim?.opacity ?? 0) : 0, transform: [{ translateY: show ? (anim?.ty ?? 8) : 8 }] },
                    ]}
                  >
                    {line === "" ? " " : line}
                  </Animated.Text>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>

        {/* 뒷면 (bouquetVideoUrl) */}
        <Animated.View
          style={[styles.cardBase, styles.cardBack, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}
          pointerEvents={face === "back" ? "auto" : "none"} // ← 뒷면일 때만 터치 허용
        >
          <Image source={{ uri: PAPER_TEXTURE }} style={styles.cardPaper} />
          <View style={styles.backHeader}>
            <Text style={styles.backTitle}>뒷면</Text>
            <Pressable onPress={() => animateFlipTo(0)} style={styles.backFlipBtn}>
              <Text style={styles.backFlipText}>앞면</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {data?.backVideoUrl ? (
              <Pressable onPress={onPressBackVideo} accessibilityLabel="뒷면 영상 재생/일시정지">
                <Video
                  key={data.backVideoUrl || "no-back"}  // URL 변경 시 재마운트
                  ref={backVideoRef}
                  source={{ uri: data.backVideoUrl }}   // bouquet 전용
                  style={{
                    width: backVideoDims.width,
                    height: backVideoDims.height,
                    borderRadius: 8,
                    backgroundColor: "#000",
                  }}
                  resizeMode={ResizeMode.CONTAIN}
                  onPlaybackStatusUpdate={onBackVideoStatusUpdate}
                  shouldPlay={false}     // flip 시 playBackVideo()가 재생
                  isMuted                // 웹 자동재생 호환성↑
                  usePoster
                  posterSource={{ uri: coverUri }}
                  useNativeControls
                  onError={(e) => console.log("backVideo onError:", e)}
                  onLoadStart={() => console.log("backVideo loadStart", data?.backVideoUrl)}
                  onLoad={() => console.log("backVideo loaded", data?.backVideoUrl)}
                />
                <Text style={{ marginTop: 8, fontSize: 12, color: "#555", textAlign: "center" }}>
                  탭하여 재생/일시정지
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: "#666" }}>뒷면 영상이 없습니다.</Text>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {/* 오버레이 비디오 (앞면 전용) */}
      {overlayVisible && (
        <Animated.View style={[styles.overlayWrap, { opacity: overlayOpacity }]} pointerEvents={overlayVisible ? "auto" : "none"}>
          <Animated.View style={styles.overlayBg}>
            <Pressable style={styles.overlayBg} onPress={onCloseOverlay} />
          </Animated.View>
          <Animated.View style={[styles.overlayContent, { transform: [{ scale: overlayScale }] }]}>
            {(() => {
              const maxW = Math.min(width * 0.92, 1280);
              const maxH = Math.min(height * 0.8, 720);
              // target is 1280x720; compute scale to ensure full frame is visible
              const TARGET_W = 1280;
              const TARGET_H = 720;
              const fitScale = Math.min(1, maxW / TARGET_W, maxH / TARGET_H);
              let w = Math.round(TARGET_W);
              let h = Math.round(TARGET_H);
              if (overlayAspect && overlayAspect > 0) {
                if (overlaySize) {
                  const aspect = overlaySize.width / overlaySize.height;
                  // keep using overlaySize when available but constrain to TARGET and scale
                  if (overlaySize.width <= TARGET_W && overlaySize.height <= TARGET_H) {
                    w = overlaySize.width;
                    h = overlaySize.height;
                  } else if (TARGET_W / TARGET_H > aspect) {
                    h = TARGET_H;
                    w = Math.round(h * aspect);
                  } else {
                    w = TARGET_W;
                    h = Math.round(w / aspect);
                  }
                } else {
                  const byHeightW = Math.round(Math.min(TARGET_W, Math.round(TARGET_H * overlayAspect)));
                  const byHeightH = Math.round(Math.min(TARGET_H, Math.round(byHeightW / overlayAspect)));
                  if (byHeightW <= TARGET_W && byHeightH <= TARGET_H) {
                    w = byHeightW;
                    h = byHeightH;
                  } else {
                    const byWidthW = Math.round(Math.min(TARGET_W, Math.round(TARGET_W)));
                    const byWidthH = Math.round(Math.min(TARGET_H, Math.round(byWidthW / overlayAspect)));
                    w = byWidthW;
                    h = byWidthH;
                  }
                }
              } else {
                const fallbackAspect = 16 / 9;
                if (TARGET_W / TARGET_H > fallbackAspect) {
                  w = Math.round(TARGET_H * fallbackAspect);
                  h = TARGET_H;
                } else {
                  w = TARGET_W;
                  h = Math.round(TARGET_W / fallbackAspect);
                }
              }
              const wrapperStyle: any = { width: maxW, height: maxH, alignItems: "center" as any, justifyContent: "center" as any };
              const innerStyle: any = {
                width: TARGET_W,
                height: TARGET_H,
                alignItems: "center" as any,
                justifyContent: "center" as any,
                transform: [{ scale: fitScale }],
              };
              return (
                <View style={wrapperStyle}>
                  <View style={innerStyle}>
                    <Video
                      ref={overlayVideoRef}
                      source={(overlaySource ?? ((data?.videoLocal as number | undefined) ?? (data?.videoUrl ? { uri: data.videoUrl } : undefined))) as any}
                      style={{ width: w, height: h, borderRadius: 8, backgroundColor: "#000" }}
                      resizeMode={ResizeMode.CONTAIN}
                      onPlaybackStatusUpdate={onOverlayStatusUpdate}
                      shouldPlay
                      isLooping={false}
                      useNativeControls
                    />
                  </View>
                </View>
              );
            })()}
          </Animated.View>
        </Animated.View>
      )}
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
  previewBlack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    opacity: 1,
    zIndex: 10,
  },
  // 앞면 콘텐츠
  polaroidWrap: { width: "100%", alignItems: "center", paddingTop: 8 },
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
  video: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    position: "relative",
  },
  pastedPhoto: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 8,
    resizeMode: "cover",
    zIndex: 70,
    position: "absolute",
    top: 0,
    left: 0,
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
    zIndex: 90,
    elevation: 90,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderBottomWidth: 20,
    borderLeftWidth: 32,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#FFFFFF",
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

  // 오버레이 영상
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    zIndex: 1000,
  },
});
