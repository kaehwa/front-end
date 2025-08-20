import React, { useEffect, useState } from 'react';
import { View, Button, Text, StyleSheet, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = '2775008760-cu5dcieaua1pcl96ilfcg7p8egn4kqsg.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '2775008760-dj5uto76ve22ja4v68lvslrk3vkl3dbl.apps.googleusercontent.com';
const IOS_CLIENT_ID = '2775008760-cu5dcieaua1pcl96ilfcg7p8egn4kqsg.apps.googleusercontent.com';

interface GoogleCalendar {
  id: string;
  summary: string;
  timeZone?: string;
  [key: string]: any;
}

export default function CalendarScreen() {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  // 로그인 후 access token 저장
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (!authentication?.accessToken) return;
      setAccessToken(authentication.accessToken);

      // 사용자 정보 가져오기
      fetchUserInfo(authentication.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (token: string) => {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUserInfo(data);
  };

  // 캘린더 목록 가져오기 (accessToken이 있어야 호출 가능)
  const fetchCalendars = async () => {
    if (!accessToken) return;
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    setCalendars(data.items || []);
    console.log(data)
  };

  // 내 primary 캘린더의 이벤트 모두 가져오기
 const fetchMyEvents = async () => {
    if (!accessToken) return;
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    setCalendars(data.items || []);
    console.log(data.items); // 여기 안에 내가 입력한 모든 일정이 들어있음
  };


  const handleSignOut = () => {
    setUserInfo(null);
    setCalendars([]);
    setAccessToken(null);
  }; 

  return (
    <View style={styles.container}>
      {!userInfo ? (
        <Button disabled={!request} title="Sign in with Google" onPress={() => promptAsync()} />
      ) : (
        <>
          <Text style={styles.text}>Welcome, {userInfo.name}</Text>
          <Button title="Sign out" onPress={handleSignOut} />
          <Button title="Fetch Calendars" onPress={fetchMyEvents} />
          <Text style={[styles.text, { marginTop: 20 }]}>Your Calendars:</Text>
          <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
            {calendars.length === 0 ? (
              <Text style={styles.text}>No calendars</Text>
            ) : (
              (() => {
                const lastCal = calendars[calendars.length - 1];
                return (
                  <>
                    <Text style={styles.text}>summary: {lastCal.summary || '(No summary)'}</Text>
                    <Text style={styles.text}>description: {lastCal.description || '(No description)'}</Text>
                  </>
                );
              })()
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  text: { fontSize: 16, marginVertical: 4 },
});
