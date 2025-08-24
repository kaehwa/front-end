import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type OrderSummary = {
  id: string;
  title: string;
  imageUrl: string;
  letterSnippet: string;
  price: number;
  deliveryFee: number;
  discount: number; // 적용된 쿠폰/프로모션
};

const ACCENT = "#0a84ff";      // 토스 느낌의 블루
const BRAND  = "#7A958E";      // 앱 고유 포인트 컬러
const MUTED  = "#6b7280";

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const BACKEND_URL = "/api"; // same backend as other screens

  // 주문 데이터: 초기값은 데모, 서버에서 id로 불러오면 대체
  const [summary, setSummary] = useState<OrderSummary>({
    id: String(id ?? "demo"),
    title: "라벤더 포에틱",
    imageUrl: "https://picsum.photos/seed/finalbouquet/1200/1600",
    letterSnippet: "사랑하는 당신에게,\n오늘 내 마음을 꽃으로 전해요…",
    price: 68000,
    deliveryFee: 3000,
    discount: 0,
  });
  const total = Math.max(0, summary.price + summary.deliveryFee - summary.discount);

  // load order/summary from backend when id is provided
  useEffect(() => {
    let mounted = true;
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/orders/${id}`);
        if (!mounted) return;
        if (!res.ok) return; // keep demo summary
        const raw = await res.json();
        // map backend response fields to OrderSummary shape (best-effort)
        const mapped: OrderSummary = {
          id: String(raw.id ?? id),
          title: raw.title ?? raw.productName ?? summary.title,
          imageUrl: raw.imageUrl ?? raw.productImageUrl ?? summary.imageUrl,
          letterSnippet: raw.letterSnippet ?? raw.messageSnippet ?? summary.letterSnippet,
          price: typeof raw.price === "number" ? raw.price : summary.price,
          deliveryFee: typeof raw.deliveryFee === "number" ? raw.deliveryFee : summary.deliveryFee,
          discount: typeof raw.discount === "number" ? raw.discount : summary.discount,
        };
        setSummary(mapped);
      } catch (e) {
        // ignore and keep demo summary
        console.log("checkout: fetch summary failed", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // 배송 정보
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [slot, setSlot] = useState<string | null>(null);

  // 옵션
  const [requestNote, setRequestNote] = useState("");

  // 약관 동의
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // 결제 수단 (토스 간편결제 고정, 확장 가능)
  const [method, setMethod] = useState<"toss" | "card" | "vbank">("toss");

  const timeSlots = [
    "오늘 15:00~17:00",
    "오늘 17:00~19:00",
    "내일 오전(10:00~12:00)",
    "내일 오후(14:00~16:00)",
  ];

  const validate = () => {
    if (!recipient.trim()) return "받는 분 성함을 입력해 주세요.";
    if (!/^\d{9,}$/.test(phone.replace(/\D/g, ""))) return "연락처를 정확히 입력해 주세요.";
    if (!addr1.trim()) return "주소를 입력해 주세요.";
    if (!slot) return "배송 일정을 선택해 주세요.";
    if (!agreeTerms || !agreePrivacy) return "약관에 동의해 주세요.";
    return null;
  };

  const onPay = () => {
    const err = validate();
    if (err) {
      Alert.alert("입력 확인", err);
      return;
    }
    // 실제 결제 전, 서버에 주문 생성 → 결제 요청 파라미터 받기
    // 예: POST /api/orders → { orderId, amount, orderName, successUrl, failUrl }
    // 지금은 WebView 샘플 페이지로 이동
    router.push({
      pathname: "/payments/toss",
      params: {
        orderId: `ORD-${Date.now()}`,
        amount: String(total),
        orderName: summary.title,
        // success/fail url은 앱 내 라우트(딥링크/리다이렉트 처리)로 설계
        successUrl: "gaehwa://payments/success",
        failUrl: "gaehwa://payments/fail",
      },
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 110, 140) }}
        showsVerticalScrollIndicator={false}
      >
        {/* 주문 요약 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>주문 요약</Text>
          </View>
          <View style={styles.summaryRow}>
            <Image source={{ uri: summary.imageUrl }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.productTitle} numberOfLines={1}>{summary.title}</Text>
              <Text
                style={[
                  styles.letterSnippet,
                  Platform.OS === "web" && ({ whiteSpace: "pre-wrap" } as any),
                ]}
                numberOfLines={2}
              >
                {summary.letterSnippet}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.label}>상품 금액</Text><Text style={styles.value}>{summary.price.toLocaleString()}원</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.label}>배송비</Text><Text style={styles.value}>{summary.deliveryFee.toLocaleString()}원</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.label}>할인</Text>
            <Text style={[styles.value, { color: summary.discount ? "#16a34a" : MUTED }]}>
              {summary.discount ? `- ${summary.discount.toLocaleString()}원` : "없음"}
            </Text>
          </View>
          <View style={[styles.priceRow, { marginTop: 6 }]}>
            <Text style={styles.totalLabel}>총 결제 금액</Text>
            <Text style={styles.totalValue}>{total.toLocaleString()}원</Text>
          </View>
        </View>

        {/* 배송 정보 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>배송 정보</Text>
          </View>

          <LabeledInput label="받는 분" placeholder="이름" value={recipient} onChangeText={setRecipient} />
          <LabeledInput label="연락처" placeholder="010-0000-0000" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <LabeledInput label="주소" placeholder="도로명 주소" value={addr1} onChangeText={setAddr1} />
          <LabeledInput label="상세 주소" placeholder="동/호수, 추가 정보" value={addr2} onChangeText={setAddr2} />

          <Text style={styles.sectionLabel}>배송 일정</Text>
          <View style={styles.slotWrap}>
            {timeSlots.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={[styles.slotBtn, slot === s && styles.slotBtnActive]}
                accessibilityLabel={`${s} 선택`}
              >
                <Text style={[styles.slotText, slot === s && styles.slotTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>요청사항 (선택)</Text>
          <View style={styles.textarea}>
            <TextInput
              value={requestNote}
              onChangeText={setRequestNote}
              placeholder="문 앞에 두고 벨 눌러주세요, 부재 시 연락 부탁드립니다 등"
              multiline
              style={{ minHeight: 72, color: "#111827" }}
              textAlignVertical="top"
              accessibilityLabel="배송 요청사항"
            />
          </View>
        </View>

        {/* 메시지 카드 미리보기 */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>메시지 카드</Text>
            <Pressable onPress={() => router.push({ pathname: "/letter", params: { id } })}>
              <Text style={styles.linkText}>편집하기</Text>
            </Pressable>
          </View>
          <View style={styles.msgPreview}>
            <Ionicons name="mail-outline" size={16} color={BRAND} />
            <Text style={styles.msgPreviewText} numberOfLines={3}>
              {summary.letterSnippet}
            </Text>
          </View>
        </View>

        {/* 결제 수단 – 토스 중심 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>결제 수단</Text>
          </View>

          <Pressable
            style={[styles.payMethod, method === "toss" && styles.payMethodActive]}
            onPress={() => setMethod("toss")}
            accessibilityLabel="토스 간편결제 선택"
          >
            <View style={styles.pmLeft}>
              <View style={styles.pmLogo}><Text style={styles.pmLogoText}>t</Text></View>
              <View>
                <Text style={styles.pmTitle}>토스 간편결제</Text>
                <Text style={styles.pmSub}>토스에서 카드·계좌 한 번에</Text>
              </View>
            </View>
            <Ionicons name={method === "toss" ? "radio-button-on" : "radio-button-off"} size={20} color={method === "toss" ? ACCENT : "#cbd5e1"} />
          </Pressable>

          {/* 확장용 – 일반 카드, 가상계좌 등
          <Pressable style={[styles.payMethod, method === "card" && styles.payMethodActive]} onPress={() => setMethod("card")}>
            ...
          </Pressable> */}
        </View>

        {/* 약관 동의 */}
        <View style={styles.card}>
          <CheckRow
            checked={agreeTerms}
            onToggle={() => setAgreeTerms((v) => !v)}
            text="구매조건 확인 및 결제진행에 동의합니다 (필수)"
          />
          <CheckRow
            checked={agreePrivacy}
            onToggle={() => setAgreePrivacy((v) => !v)}
            text="개인정보 제3자 제공에 동의합니다 (필수)"
          />
          <Text style={styles.smallNote}>전자상거래법에 따른 청약철회 및 환불 규정이 적용됩니다.</Text>
        </View>
      </ScrollView>

      {/* 하단 고정 결제 바 */}
      <View style={[styles.payBar, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.payBarLabel}>결제 금액</Text>
          <Text style={styles.payBarTotal}>{total.toLocaleString()}원</Text>
        </View>
        <Pressable style={styles.payBtn} onPress={onPay} accessibilityLabel="결제 진행">
          <Text style={styles.payBtnText}>토스로 결제</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** ----- 작은 컴포넌트들 ----- */

function LabeledInput({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          {...rest}
          style={[styles.input, ("style" in rest && rest.style) || null]}
          placeholderTextColor="#9CA3AF"
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

function CheckRow({
  checked,
  onToggle,
  text,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.checkRow} accessibilityLabel={text}>
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={20}
        color={checked ? "#10b981" : "#9CA3AF"}
      />
      <Text style={styles.checkText}>{text}</Text>
    </Pressable>
  );
}

/** ----- 스타일 ----- */

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F5F6F8" },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { marginBottom: 10 },
  cardHeaderRow: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },

  summaryRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#e5e7eb" },
  productTitle: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  letterSnippet: { fontSize: 12, color: MUTED, marginTop: 4 },

  divider: { height: 1, backgroundColor: "#F1F3F5", marginVertical: 12 },

  priceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  label: { color: MUTED },
  value: { color: "#111827", fontWeight: "700" },
  totalLabel: { fontSize: 14, fontWeight: "800", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#111827" },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#111827", marginTop: 8, marginBottom: 8 },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  slotBtnActive: { borderColor: ACCENT, backgroundColor: "#EEF4FF" },
  slotText: { fontSize: 12, color: "#374151" },
  slotTextActive: { color: ACCENT, fontWeight: "800" },

  textarea: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#FAFAFA",
  },

  inputLabel: { fontSize: 12, color: MUTED, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    backgroundColor: "#FAFAFA",
  },
  input: {
    paddingHorizontal: 12, paddingVertical: 12, color: "#111827",
  },

  msgPreview: {
    flexDirection: "row", gap: 8, padding: 12,
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },
  msgPreviewText: { color: "#374151", fontSize: 13, flex: 1 },
  linkText: { color: ACCENT, fontWeight: "800", fontSize: 13 },

  payMethod: {
    padding: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 6,
  },
  payMethodActive: { borderColor: ACCENT, backgroundColor: "#EEF4FF" },
  pmLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  pmLogo: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#0a84ff", alignItems: "center", justifyContent: "center" },
  pmLogoText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  pmTitle: { fontWeight: "800", color: "#111827" },
  pmSub: { fontSize: 12, color: MUTED },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkText: { color: "#374151", fontSize: 13 },
  smallNote: { color: MUTED, fontSize: 11, marginTop: 8 },

  payBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16, paddingTop: 10,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  payBarLabel: { color: MUTED, fontSize: 11 },
  payBarTotal: { color: "#111827", fontSize: 20, fontWeight: "900" },
  payBtn: {
    backgroundColor: ACCENT, paddingVertical: 14, paddingHorizontal: 22,
    borderRadius: 999, alignItems: "center", justifyContent: "center",
  },
  payBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
