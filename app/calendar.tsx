import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Event = { id: string; summary: string; start: string; end: string; };

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [todayEvent, setTodayEvent] = useState<Event | null>(null);
  const [lastYearEvent, setLastYearEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  /** 🔑 일정 불러오기 */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // ✅ login.tsx에서 AsyncStorage에 저장된 access_token 가져오기
        const token = await AsyncStorage.getItem("googleAccessToken");
        if (!token) {
          console.log("⚠️ access_token 없음. 로그인 다시 필요");
          setLoading(false);
          return;
        }

        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // 📅 이번주 일정 가져오기
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));

        const evts: Event[] = (data.items || []).map((e: any) => ({
          id: e.id,
          summary: e.summary || "(제목 없음)",
          start: e.start.date || e.start.dateTime,
          end: e.end.date || e.end.dateTime,
        }));

        setEvents(evts);

        // ✅ 오늘 일정
        const todayStr = now.toISOString().split("T")[0];
        const todayEvt = evts.find((e) => e.start.startsWith(todayStr));
        if (todayEvt) setTodayEvent(todayEvt);

        // 📅 작년 같은 날 일정
        const lastYear = new Date(now);
        lastYear.setFullYear(now.getFullYear() - 1);
        const lastYearDayStart = new Date(lastYear.setHours(0, 0, 0, 0)).toISOString();
        const lastYearDayEnd = new Date(lastYear.setHours(23, 59, 59, 999)).toISOString();

        const resLast = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${lastYearDayStart}&timeMax=${lastYearDayEnd}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dataLast = await resLast.json();
        if (resLast.ok && dataLast.items?.length > 0) {
          const e = dataLast.items[0];
          setLastYearEvent({
            id: e.id,
            summary: e.summary || "(제목 없음)",
            start: e.start.date || e.start.dateTime,
            end: e.end.date || e.end.dateTime,
          });
        }
      } catch (err) {
        console.error("캘린더 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FB7431" />
        <Text style={{ marginTop: 10 }}>일정을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {/* 오늘 일정 */}
      <View style={styles.cardBox}>
        {todayEvent ? (
          <>
            <Text style={styles.title}>오늘은 특별한 날 ✨</Text>
            <Text style={styles.subtitle}>
              {todayEvent.summary} 일정이 있네요.{"\n"}
              꽃다발과 카드를 준비해보시겠어요?
            </Text>
          </>
        ) : (
          <Text style={styles.subtitle}>오늘은 특별한 일정이 없어요 🌿</Text>
        )}
      </View>

      {/* 작년 같은 날 */}
      {lastYearEvent && (
        <View style={[styles.cardBox, { backgroundColor: "#EAF6FF" }]}>
          <Text style={styles.title}>작년 오늘의 기억 📖</Text>
          <Text style={styles.subtitle}>
            작년 오늘은 "{lastYearEvent.summary}" 일정이 있었네요.{"\n"}
            그때의 추억을 떠올리며 이번에도 마음을 전해보실래요?
          </Text>
        </View>
      )}

      {/* 주간 캘린더 */}
      <Calendar
        markedDates={events.reduce((acc: any, e) => {
          const d = e.start.split("T")[0];
          acc[d] = { marked: true, dotColor: "pink" };
          return acc;
        }, {})}
        markingType="multi-dot"
      />

      {/* 이벤트 리스트 */}
      {events.map((e) => (
        <View key={e.id} style={styles.eventRow}>
          <Text style={styles.eventText}>
            {new Date(e.start).toLocaleDateString()} - {e.summary}
          </Text>
        </View>
      ))}

      {/* CTA */}
      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>꽃다발 추천 받기 💐</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  cardBox: { backgroundColor: "#ffeaea", borderRadius: 16, padding: 16, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#333" },
  eventRow: { marginVertical: 6 },
  eventText: { fontSize: 14, color: "#444" },
  button: { backgroundColor: "#FB7431", padding: 14, borderRadius: 12, marginVertical: 20 },
  buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
