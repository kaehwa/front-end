import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable } from "react-native";
import { router } from "expo-router";
import { uploadImage, uploadAudio } from "./uploads";

export default function ListeningMission() {
  const initialQuestions = [
    "누가 주고자 하는 꽃다발 인가요?",
    "께서는 누구에게 꽃다발을 선물할까요?",
    "000 님과 *** 님과의 관계는 어떻게 되나요?",
    "무슨 기념일 인가요?",
    "좋아요! *** 님의 사진과 목소리를 업로드 해주시겠어요?",
    "거의다 왔어요! \n이 꽃다발을 전하려는 상황이 어떤 것인지 여쭤봐도 될까요?", 
    "이제 마지막이에요! \n두 분 사이에 있었던 기억에 남는 일이 있을까요?",  
  ];

  const initialPlaceHolder = [
    "예) 남자친구, 아빠, 본인, 나",
    "예) 여자친구, 엄마, 친구",
    "예) 부부, 고향친구, 부모 자식",
    "예) 결혼기념일, 생일, 기일",
    "",
    "예) 기념일을 맞아 선물해주고 싶어", 
    "예) 우리는 30년을 같이 살았고, 고맙다는 마음을 전함",  
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestions[0]);
  const [answers, setAnswers] = useState<string[]>(Array(initialQuestions.length).fill(""));
  const [answer, setAnswer] = useState("");
  const [placeHolder, setPlaceHolder] = useState("예) 여자친구, 엄마, 친구");
  const [isTyping, setIsTyping] = useState(false);
  const [inGiver, setInGiver] = useState("");
  const [inReciver, setInReciver] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const BACK_SWAGGER_URL = "http://4.240.103.29:8080";
  const ID = "1"

  const expressions = [
    
    require("./../assets/faceicon/icon1.jpg"),
    require("./../assets/faceicon/icon2.jpg"),
    require("./../assets/faceicon/icon3.jpg"),
    require("./../assets/faceicon/icon4.jpg"),
  ];
  
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current; // fade in/out

  const changeExpression = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    
    setCurrentExpressionIndex((prev) => (prev + 1) % expressions.length);
  };


  // 캐릭터 애니메이션
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -5, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 5, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleNext = () => {
    console.log(`Handling ${currentIndex}st question`)

    // 현재 답변 저장 (빈 문자열도 포함)
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = answer.trim(); // "" 가능
      return newAnswers;
    });

    // 마지막 질문일 경우 → 업로드
    if (currentIndex === initialQuestions.length - 1) {
      const finalAnswers = [...answers];
      finalAnswers[currentIndex] = answer.trim();
      // console.log("최종 업로드 배열:", finalAnswers);
      postText(finalAnswers);
      setShowNext(true)
      alert("모든 질문이 완료되었습니다!");
      return;
    }

    // 다음 질문 이동
    const nextIndex = currentIndex + 1;
    let reQuestion = initialQuestions[nextIndex];

    // 커스터마이징 로직
    if (currentIndex === 0) {
      setInGiver(answer);
      reQuestion = ` "${answer}" ${initialQuestions[nextIndex]}`;
    } else if (currentIndex === 1) {
      setInReciver(answer);
      reQuestion = ` "${inGiver}"  님과 "${answer}" 님과의 관계는 어떻게 되나요?`;
    } else if (currentIndex === 3) {
      reQuestion = `좋아요! ${inReciver} 님의 사진과 목소리를 업로드 해주시겠어요?`;
      setShowUpload(true);
    } else {
      reQuestion = initialQuestions[nextIndex]
      setShowUpload(false)
    }
    
    setPlaceHolder(initialPlaceHolder[currentIndex])
    setCurrentIndex(nextIndex);
    setCurrentQuestion(reQuestion);
    setAnswer("");
    setIsTyping(false);

    changeExpression();

  };

const handleImageUpload = async () => {
  // return;
  try {
    const result = await uploadImage(BACK_SWAGGER_URL, ID); // id와 baseUrl만 전달
    alert("이미지 업로드 성공!");
    console.log(result);
  } catch (err) {
    console.error(err);
    alert("이미지 업로드 실패");
  }
};

const handleAudioUpload = async () => {
  try {
    const result = await uploadAudio(BACK_SWAGGER_URL, ID); // id와 baseUrl만 전달
    alert("오디오 업로드 성공!");
    console.log(result);
  } catch (err) {
    console.error(err);
    alert("오디오 업로드 실패");
  }
};


  async function postText(lstAnswer: string[]) {
    console.log("[DEBUG] START postText");
    console.log(`[DEBUG] input lstAnswer : ${lstAnswer}`);
    const postFormat = {
      flowerFrom : lstAnswer[0],
      flowerTo : lstAnswer[1],
      relation : lstAnswer[2],
      anniversary : lstAnswer[3],
      lstFiles : lstAnswer[4],
      anvDate : lstAnswer[5],
      history : lstAnswer[6],
    };

    console.log(`POST DATA : ${JSON.stringify(postFormat)}`)
    try {
      const response = await fetch(`${BACK_SWAGGER_URL}/flowers/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postFormat),
      });
      //if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const responseData = await response.json();
      console.log(`POST 성공 : ${responseData}`);
      return responseData;

    } catch (error) {
      console.log("POST 요청 실패:", error);
      throw error;
    }
  }

  
  return (
    <SafeAreaView style={styles.container}>
      {/* 말풍선 질문 */}
      <View style={styles.speechBubble}>
        <Text style={styles.questionText}>{currentQuestion}</Text>
        <View style={styles.speechTail} />
      </View>

      {/* 캐릭터 원형 + 애니메이션 */}
      <Animated.View style={[styles.circle, { transform: [{ translateY: bounceAnim }], opacity: fadeAnim }]}>
        <Image
          source={expressions[currentExpressionIndex]}
          style={styles.characterImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 입력란 및 버튼 */}
      <View style={styles.inputWrapper}>
        {showUpload ? (
          <View>
            <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
              <Text style={styles.buttonText}>사진 업로드</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={handleAudioUpload}>
              <Text style={styles.buttonText}>음성 업로드</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            style={[styles.input, { color: isTyping ? "#333" : "#999" }]}
            placeholder={placeHolder}
            placeholderTextColor="#999"
            value={answer}
            onChangeText={(text) => {
              setAnswer(text);
              setIsTyping(text.length > 0);
            }}
            multiline
          />
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>
      {showNext && (
        <Pressable style={styles.button} onPress={() => router.push("/recommendations")}>
          <Text style={styles.buttonText}> 추천 페이지로 </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", padding: 20, justifyContent: "center" },
  speechBubble: { backgroundColor: "#D8F1CF", padding: 15, borderRadius: 15, maxWidth: "90%", position: "relative", marginBottom: 15 },
  speechTail: {
    position: "absolute", bottom: -10, left: "50%", marginLeft: -10, width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10,
    borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#D8F1CF",
  },
  questionText: { fontSize: 13, textAlign: "center", lineHeight: 22, color: "#333" },
  circle: { width: 150, height: 150, borderRadius: 75, backgroundColor: "#F0F0F0", marginBottom: 30, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  characterImage: { width: "100%", height: "100%" },
  inputWrapper: { width: "100%", backgroundColor: "#D8F1CF", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20 },
  input: { fontSize: 16, minHeight: 40 },
  button: { backgroundColor: "#D8F1CF", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#333" },
  uploadButton: { backgroundColor: "#D8F1CF", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25, marginBottom: 20, justifyContent: "center", alignItems: "center" },
});
