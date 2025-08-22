// app/calendar.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CalendarProvider, ExpandableCalendar } from "react-native-calendars";

/** react-native-calendars에서 타입 export 안 함: onDayPress/onMonthChange 이벤트용 */
type CalendarDate = {
  dateString: string; day: number; month: number; year: number; timestamp: number;
};

type GEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
};

const BG = "#FFF4DA";
const WHITE = "#FFFFFF";
const BORDER = "rgba(230, 101, 101, 0.08)";
const BUTTON = "#FB7431";
const TEXT = "#000000ff";
const SUB = "#6b7280";
const ACCENT = "#7A958E";
const DANBI = require("../assets/mascot/danbi_face.png");

// ✔ 라우트는 프로젝트에 맞게 조정하세요
const MAIN_ROUTE = "/main";
const BOUQUET_ROUTE = "/shop";

/** 감정 레이블 */
type Emotion = "celebration" | "comfort" | "memory" | "daily" | "work";

/** 오늘 단비 버블 데이터 */
type TodayDanbi = { id: string; title: string; message: string };

export default function CalendarScreen() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // 데이터
  const [monthCursor, setMonthCursor] = useState<Date>(startOfMonth(new Date()));
  const [monthEvents, setMonthEvents] = useState<GEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1년 전 오늘
  const [yearAgoStory, setYearAgoStory] = useState<string | null>(null);
  const [yearAgoLoading, setYearAgoLoading] = useState(false);

  // 단비 제안 일괄 숨김
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  /** 저장된 로그인 정보 */
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("googleAccessToken");
      const user = await AsyncStorage.getItem("googleUser");
      setAccessToken(token);
      if (user) setUserInfo(JSON.parse(user));
    })();
  }, []);

  /** 월 데이터 불러오기 */
  const fetchMonth = useCallback(async (base: Date) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const mStart = startOfMonth(base);
      const mEnd = endOfMonth(base);
      const url =
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        [
          "singleEvents=true",
          "orderBy=startTime",
          "maxResults=2500",
          `timeMin=${encodeURIComponent(mStart.toISOString())}`,
          `timeMax=${encodeURIComponent(mEnd.toISOString())}`
        ].join("&");

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (data.error) throw new Error(data.error?.message || "불러오기에 실패했어요.");
        
      console.log("calender data")
      console.log(data)
      setMonthEvents(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message ?? "알 수 없는 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  /** 1년 전 오늘 */
  const fetchYearAgoToday = useCallback(async () => {
    if (!accessToken) return;
    setYearAgoLoading(true);
    try {
      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setFullYear(today.getFullYear() - 1);

      const timeMin = new Date(yearAgo.getFullYear(), yearAgo.getMonth(), yearAgo.getDate(), 0, 0, 0);
      const timeMax = new Date(yearAgo.getFullYear(), yearAgo.getMonth(), yearAgo.getDate(), 23, 59, 59);

      const url =
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        [
          "singleEvents=true",
          "orderBy=startTime",
          `timeMin=${encodeURIComponent(timeMin.toISOString())}`,
          `timeMax=${encodeURIComponent(timeMax.toISOString())}`
        ].join("&");

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      const items: GEvent[] = Array.isArray(data.items) ? data.items : [];

      setYearAgoStory(makeYearAgoStory(items, yearAgo));
    } catch {
      setYearAgoStory(null);
    } finally {
      setYearAgoLoading(false);
    }
  }, [accessToken]);

  /** 최초 & 월 이동 시 */
  useEffect(() => {
    if (!accessToken) return;
    fetchMonth(monthCursor);
    fetchYearAgoToday();
    setSuggestionDismissed(false);
  }, [accessToken, monthCursor, fetchMonth, fetchYearAgoToday]);

  /** 당겨서 새로고침 */
  const onRefresh = useCallback(async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      await fetchMonth(monthCursor);
      await fetchYearAgoToday();
      setSuggestionDismissed(false);
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, monthCursor, fetchMonth, fetchYearAgoToday]);

  /** 마킹/선택 */
  const markedDates = useMemo(() => {
    const mark: Record<string, any> = {};
    for (const ev of monthEvents) {
      const d = getStartDate(ev);
      if (!d) continue;
      const key = toYMD(d);
      mark[key] = { ...(mark[key] || {}), marked: true };
    }
    mark[selectedDate] = { ...(mark[selectedDate] || {}), selected: true, selectedColor: BUTTON };
    return mark;
  }, [monthEvents, selectedDate]);

  const eventsOfSelected = useMemo(
    () => monthEvents.filter(ev => toYMD(getStartDate(ev)!) === selectedDate),
    [monthEvents, selectedDate]
  );

  /** 오늘 일정 → 여러 개의 단비 말풍선 데이터 */
  const todayDanbiList = useMemo(() => {
    if (!isWithinAWeek(selectedDate) || eventsOfSelected.length === 0) return [];
    return buildDanbiMessagesForEvents(eventsOfSelected);
  }, [selectedDate, eventsOfSelected]);

  /** 토큰 없으면 로그인 유도 */
  if (!accessToken) {
    return (
      <View style={[styles.container, { backgroundColor: BG }]}>
        <Header userName={null} />
        <View style={styles.emptyWrap}>
          <Text style={styles.title}>로그인이 필요해요</Text>
          <Text style={styles.sub}>행사·기념일을 불러오려면 Google 캘린더 연결이 필요합니다.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/login")}>
            <Ionicons name="logo-google" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>로그인 하러 가기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      {/* 상단 인사 (카톡 스타일 말풍선) */}
      <Header userName={userInfo?.given_name || userInfo?.name || "사용자"} />

      {/* 액션: 주(week) 데이터 새로고침 / 로그아웃 */}
      <View style={styles.actionsRow}>
        <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => fetchMonth(monthCursor)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="calendar" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>{formatYM(monthCursor)} 새로고침</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={async () => { await AsyncStorage.multiRemove(["googleAccessToken", "googleUser"]); router.replace("/login"); }}
        >
          <Ionicons name="log-out-outline" size={18} color={TEXT} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryBtnText}>로그아웃</Text>
        </Pressable>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color="#B45309" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={{ marginTop: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ✅ 주(Week) 달력: 접힌 상태로만 사용 */}
        <View style={styles.calendarWrap}>
          <CalendarProvider
            date={selectedDate}
            onDateChanged={(d) => setSelectedDate(toYMD(d as any))}
            onMonthChange={(d: any) => setMonthCursor(new Date(d.year, d.month - 1, 1))}
          >
            <ExpandableCalendar
              initialPosition={ExpandableCalendar.positions.CLOSED}
              hideKnob={true}       // 접힘 손잡이 숨김
              markedDates={markedDates}
              theme={{
                todayTextColor: "#EF4444",
                textSectionTitleColor: SUB,
                dayTextColor: TEXT,
                monthTextColor: TEXT,
                arrowColor: TEXT,
              }}
              onDayPress={(d: CalendarDate) => setSelectedDate(d.dateString)}
            />
          </CalendarProvider>
        </View>

        {/* 선택 날짜 일정 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{fmtDate(new Date(selectedDate))}</Text>
        </View>

        {eventsOfSelected.length === 0 ? (
          <View style={{ paddingHorizontal: 2 }}>
            <Text style={styles.empty}>선택한 날짜의 일정이 없어요.</Text>
          </View>
        ) : (
          eventsOfSelected.map(ev => <EventCard key={ev.id} event={ev} />)
        )}

        {/* ✅ 오늘일 때만: 키워드에 걸린 만큼 단비 말풍선 여러 개 */}
        {isWithinAWeek(selectedDate) && !suggestionDismissed && todayDanbiList.map((it) => (
          <DanbiSuggestionBubble
            key={it.id}
            title={it.title}
            message={`오늘 「${it.title}」이 있네요! ${it.message} 직접 맞춤 꽃카드를 제작해보시겠어요?`}
            onShop={() => router.push("/main")}
            onAcknowledge={() => { setSuggestionDismissed(true); router.replace(MAIN_ROUTE); }}
          />
        ))}

        {/* 오늘 일정 아래: 1년 전 오늘 스토리 */}
        {isWithinAWeek(selectedDate) && (
          <StoryCard loading={yearAgoLoading} story={yearAgoStory} onReload={fetchYearAgoToday} />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

/** ====== 헤더: 카톡 스타일 말풍선 ====== */
function Header({ userName }: { userName: string | null }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Image source={DANBI} resizeMode="contain" style={styles.danbiSmall} />
        <View style={styles.bubbleBox}>
          <View style={styles.tailBorder} />
          <View style={styles.tail} />
          <Text style={styles.bubbleText}>
            {userName ? `${userName}님, 반가워요!` : "어서 와요, 기다리고 있었어요!"}
          </Text>
        </View>
      </View>
      <Text style={styles.subcopy}>오늘도 당신의 순간이 꽃처럼 피어나길 바라요</Text>
    </View>
  );
}

/** ====== 오늘 ‘일정명’ 단비 말풍선 (여러 개 지원) ====== */
function DanbiSuggestionBubble({
  title,
  message,
  onShop,
  onAcknowledge,
}: {
  title: string; message: string; onShop: () => void; onAcknowledge: () => void;
}) {
  return (
    <View style={styles.chatRow}>
      <Image source={DANBI} resizeMode="contain" style={styles.danbiTiny} />
      <View style={styles.chatBubble}>
        <View style={styles.chatTailBorder} />
        <View style={styles.chatTail} />
        <Text style={styles.chatTitle}>오늘 「{title}」이 있네요!</Text>
        <Text style={styles.chatText}>{message}</Text>

        <View style={styles.chatActions}>
          <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={onShop}>
            <Ionicons name="flower-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>꽃카드 제작하기 </Text>
          </Pressable>
           
        </View>
      </View>
    </View>
  );
}

/** ====== 과거 스토리 카드 ====== */
function StoryCard({ loading, story, onReload }: { loading: boolean; story: string | null; onReload: () => void }) {
  return (
    <View style={styles.storyCard}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="sparkles-outline" size={18} color={ACCENT} style={{ marginRight: 6 }} />
        <Text style={{ color: ACCENT, fontWeight: "800" }}>1년 전 오늘</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 8 }} />
      ) : story ? (
        <Text style={styles.storyText}>{story}</Text>
      ) : (
        <Text style={styles.storyText}>작년 오늘의 일정 기록이 없었어요. 그날의 마음은 오늘 새로 채워볼까요?</Text>
      )}
      <Pressable onPress={onReload} style={[styles.linkRow, { marginTop: 6 }]}>
        <Ionicons name="refresh" size={14} color={TEXT} style={{ marginRight: 4 }} />
        <Text style={styles.linkText}>다시 불러오기</Text>
      </Pressable>
    </View>
  );
}

/** ====== 일정 카드 ====== */
function EventCard({ event }: { event: GEvent }) {
  const start = getStartDate(event);
  const end = getEndDate(event);
  const allDay = isAllDay(event);
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.badge, allDay ? styles.badgeAllDay : styles.badgeTime]}>
          <Ionicons name={allDay ? "sunny-outline" : "time-outline"} size={12} color={allDay ? "#065F46" : "#1D4ED8"} />
          <Text style={[styles.badgeText, allDay ? { color: "#065F46" } : { color: "#1D4ED8" }]}>
            {allDay ? "올데이" : `${start ? fmtTime(start) : "?"} ~ ${end ? fmtTime(end) : "?"}`}
          </Text>
        </View>
      </View>
      <Text style={styles.eventTitle}>{event.summary || "(제목 없음)"}</Text>
      {!!event.description && (<Text style={styles.eventDesc} numberOfLines={3}>{event.description}</Text>)}
      {!!event.location && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={SUB} style={{ marginRight: 4 }} />
          <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
        </View>
      )}
    </View>
  );
}

/** ====== 감정/문구 & 오늘 말풍선 빌더 ====== */
function classifyEmotionByTitle(title: string): Emotion | null {
  const text = (title || "").toLowerCase();
  const has = (arr: string[]) => arr.some(k => text.includes(k));
  if (has(["생일","birthday","anniversary","기념","축하","party","졸업","승진","돌","생신","일주년","100일","200일","300일"])) return "celebration";
  if (has(["장례","부고","위로","추모","문상","병문안","입원","조문","memorial","funeral"])) return "comfort";
  if (has(["여행","trip","데이트","기념촬영","전시","영화","공연","축제"])) return "memory";
  if (has(["회의","meeting","면접","보고","work","업무"])) return "work";
  return null; // 키워드가 전혀 없으면 제외
}

function buildDanbiMessageForTitle(title: string) {
  const emo = classifyEmotionByTitle(title) ?? "daily";
  const message = (() => {
    switch (emo) {
      case "celebration": return `축하의 마음을 담은 메시지 카드와 꽃다발로 마음을 전해볼까요?`;
      case "comfort":     return `조용한 위로가 건네지는 메시지 카드와 꽃다발을 준비해볼까요?`;
      case "memory":      return `오늘의 장면을 오래 남길 수 있도록, 감성 메시지 카드와 꽃다발을 곁들여볼까요?`;
      case "work":        return `수고로운 하루에 작은 응원을 담아, 메시지 카드와 꽃다발로 마음을 밝혀볼까요?`;
      default:            return `평범한 오늘도 특별하게—메시지 카드와 꽃다발로 따뜻함을 더해볼까요?`;
    }
  })();
  return { title, message };
}

/** 오늘 일정들 → 여러 개의 단비 말풍선 데이터 */
function buildDanbiMessagesForEvents(items: GEvent[]): TodayDanbi[] {
  return items
    .map((ev) => {
      const title = ev?.summary?.trim() || "제목 없는 일정";
      const emo = classifyEmotionByTitle(title);
      if (!emo) return null; // 키워드 없는 일정은 제외(원하면 포함 가능)
      const { message } = buildDanbiMessageForTitle(title);
      return { id: ev.id || `${title}-${Math.random()}`, title, message };
    })
    .filter(Boolean) as TodayDanbi[];
}

/** ====== 1년 전 스토리 생성 ====== */
function makeYearAgoStory(items: GEvent[], day: Date): string | null {
  if (!items || items.length === 0) return null;

  // 시간순 정렬 후 최대 2개만 사용
  const sorted = [...items].sort((a, b) => (getStartDate(a)?.getTime() ?? 0) - (getStartDate(b)?.getTime() ?? 0));
  const picked = sorted.slice(0, 2);

  const parts = picked.map((ev) => {
    const start = getStartDate(ev);
    const when = start ? fmtTime(start) : "하루 종일";
    const title = ev.summary?.trim() || "제목 없는 일정";
    const loc = ev.location ? `, 장소는 ${ev.location}` : "";
    return `${when}에 「${title}」${loc}`;
  });

  const dateStr = new Intl.DateTimeFormat("ko-KR", {
    month: "long", day: "numeric", weekday: "long"
  }).format(day);

  if (parts.length === 1) {
    return `작년 ${dateStr}, 당신은 ${parts[0]}을(를) 하셨어요.\n그날의 온기를 오늘도 살짝 이어가 볼까요?`;
  }
  return `작년 ${dateStr}, 당신은 ${parts[0]} 그리고 ${parts[1]}을(를) 하셨어요.\n그날의 마음을 떠올리며 오늘도 부드럽게 걸어가요.`;
}

/** ====== 유틸 ====== */
function getStartDate(ev: GEvent | undefined | null) {
  if (!ev) return null;
  if (ev.start?.dateTime) return new Date(ev.start.dateTime);
  if (ev.start?.date) return new Date(ev.start.date + "T00:00:00");
  return null;
}
function getEndDate(ev: GEvent | undefined | null) {
  if (!ev) return null;
  if (ev.end?.dateTime) return new Date(ev.end.dateTime);
  if (ev.end?.date) return new Date(ev.end.date + "T23:59:59");
  return null;
}
function isAllDay(ev: GEvent) { return !!ev.start?.date && !ev.start?.dateTime; }
function fmtDate(d: Date) { return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(d); }
function fmtTime(d: Date) { return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(d); }
function toYMD(d: Date | string) { const x = typeof d === "string" ? new Date(d) : d; const y = x.getFullYear(); const m = String(x.getMonth()+1).padStart(2,"0"); const day = String(x.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59); }
function formatYM(d: Date) { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(d); }
function isTodayYMD(ymd: string) { return toYMD(new Date()) === ymd; }
function isWithinAWeek(ymd: string) { return Math.abs(new Date(ymd).getTime() - Date.now()) <= 7 * 24 * 60 * 60 * 1000; }


/** ====== 스타일 ====== */
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },

  // Header
  header: { paddingTop: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  danbiSmall: { width: 72, height: 72 },

  // 상단 말풍선
  bubbleBox: {
    position: "relative",
    maxWidth: "78%",
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bubbleText: { fontSize: 15, fontWeight: "700", color: TEXT },
  tailBorder: {
    position: "absolute",
    left: -9.5, top: 17, width: 0, height: 0,
    borderTopWidth: 7.5, borderBottomWidth: 7.5, borderRightWidth: 9.5,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: BORDER,
  },
  tail: {
    position: "absolute",
    left: -8, top: 18, width: 0, height: 0,
    borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 8,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: WHITE,
  },
  subcopy: { marginTop: 8, fontSize: 13, color: SUB },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: BUTTON, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 999,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  secondaryBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F3F4F6", paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  secondaryBtnText: { color: TEXT, fontWeight: "700" },

  errorBox: {
    marginTop: 12, padding: 10, borderRadius: 12,
    backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A",
    flexDirection: "row", alignItems: "center",
  },
  errorText: { color: "#92400E", fontSize: 13 },

  // Week 달력 컨테이너
  calendarWrap: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },

  sectionHeader: { marginTop: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: ACCENT },

  eventCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: BORDER, marginBottom: 10,
  },
  eventHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  badgeAllDay: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  badgeTime: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  badgeText: { fontSize: 11, fontWeight: "700" },

  eventTitle: { marginTop: 8, fontSize: 16, fontWeight: "800", color: TEXT },
  eventDesc: { marginTop: 6, fontSize: 13, color: "#374151" },

  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 12, color: SUB },

  // 1년 전 카드
  storyCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginTop: 12,
  },
  storyText: { marginTop: 6, color: TEXT, lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center" },
  linkText: { color: TEXT, fontWeight: "700" },

  // 단비 말풍선(오늘 일정명) — 여러 개
  chatRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  danbiTiny: { width: 56, height: 56 },
  chatBubble: {
    position: "relative",
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chatTailBorder: {
    position: "absolute",
    left: -9.5, top: 17, width: 0, height: 0,
    borderTopWidth: 7.5, borderBottomWidth: 7.5, borderRightWidth: 9.5,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: BORDER,
  },
  chatTail: {
    position: "absolute",
    left: -8, top: 18, width: 0, height: 0,
    borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 8,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: WHITE,
  },
  chatTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  chatText: { marginTop: 6, color: TEXT, lineHeight: 20 },
  chatActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },

  // 빈 상태
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  title: { fontSize: 18, fontWeight: "800", color: TEXT, textAlign: "center" },
  sub: { marginTop: 6, fontSize: 13, color: SUB, textAlign: "center" },

  empty: { color: SUB, marginTop: 8 },
});
