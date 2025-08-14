import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Animated, Image } from "react-native";

export default function ListeningMission() {
  const initialQuestions = [
    "누구에게 줄 선물인가요?",
    "께서는 누구에게 꽃다발을 선물할까요?",
    "000 님과 *** 님과의 관계는 어떻게 되나요?",
    "좋아요! *** 님의 사진과 목소리를 업로드 해주시겠어요?",
    "거의다 왔어요! \n이 꽃다발을 전하려는 상황이 어떤 것인지 여쭤봐도 될까요?", 
    "이제 마지막이에요! \n두 분 사이에 있었던 기억에 남는 일이 있을까요?",  
  ];

  // 현재 질문 하나만 상태로 관리
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestions[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(initialQuestions.length).fill(""));
  const [answer, setAnswer] = useState("");
  const [placeHolder, setPlaceHolder] = useState("예) 여자친구, 엄마, 친구");
  const [isTyping, setIsTyping] = useState(false);
  const [inGiver, setInGiver] = useState("");
  const [inReciver, setInReciver] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  
  const BACK_SWAGGER_URL = "http://4.240.103.29:8080"


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

  //질문 표출
  const handleNext = () => {

    //[DEBUG]용
    setShowUpload(false)

    console.log(`currentIndex = ${currentIndex}`)
    if (answer.trim().length === 0) return;

    // 현재 답변 저장
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = answer;
      return newAnswers;
    });

    // 다음 질문이 있으면 이전 답변 일부 반영
    if (currentIndex == initialQuestions.length - 1) {

      const nextIndex = currentIndex + 1;
      const question = initialQuestions[nextIndex]
      const reQuestion = `이제 마지막이에요. \n"${inGiver}" 님과 "${inReciver}"님 사이에 있었던 기억에 남는 일이 있을까요??`
     
      setInReciver(answer)
      setCurrentQuestion(reQuestion);
      setCurrentIndex(nextIndex);
      setAnswer("");
      setIsTyping(false);
      
      postText(answers)
      alert("모든 질문이 완료되었습니다!");

      

    } else if (currentIndex == 0) {
      const nextIndex = currentIndex + 1;
      const question = initialQuestions[nextIndex]
      const reQuestion = ` "${answer}" ${question}`
      
      setInGiver(answer)

      setCurrentQuestion(reQuestion);
      setCurrentIndex(nextIndex);
      setAnswer("");
      setIsTyping(false);

      //누구에게 선물하나요 다음 placeHolder
      setPlaceHolder("예) 여자친구, 엄마, 친구")
    
    } else if (currentIndex == 1) {
    
      const nextIndex = currentIndex + 1;
      const question = initialQuestions[nextIndex]
      const reQuestion = ` "${inGiver}"  님과 "${answer}" 님과의 관계는 어떻게 되나요?`
      
      setInReciver(answer)
      setCurrentQuestion(reQuestion);
      setCurrentIndex(nextIndex);
      setAnswer("");
      setIsTyping(false);

      setPlaceHolder("예) 여자친구, 엄마, 친구")
    
    } else if (currentIndex == 2) {
    
      const nextIndex = currentIndex + 1;
      const question = initialQuestions[nextIndex]
      const reQuestion = ` "좋아요! ${inReciver} 님의 사진과 목소리를 업로드 해주시겠어요?`
      
      setInReciver(answer)
      setCurrentQuestion(reQuestion);
      setCurrentIndex(nextIndex);
      setAnswer("");
      setIsTyping(false);

      //파일 업로드
      setShowUpload(true);

      setPlaceHolder("예) 여자친구, 엄마, 친구")


    } else {
      const firstWord = answer.trim().split(" ")[0] || "";
      const nextIndex = currentIndex + 1;
      setCurrentQuestion(`${initialQuestions[nextIndex]}`);
      setCurrentIndex(nextIndex);
      setAnswer("");
      setIsTyping(false);
    }

    for (var i = 0; i < 5; i++ )
    {
      console.log(`Appended Answers : [${i}] ${answers[i]}`)
    }
    

  };

  const handleUpload = () => {
    /* 
    1) upload api 구현 => picker
    2) upload 응답 비동기 / 동기 처리
    3) 버튼 false
    */
  };

  async function postText(lstAnswer : any){

    console.log("[DEBUG] START postText")
    console.log(`[DEBUG] input lstAnswer : ${lstAnswer}`)
    var postFormat = {
      flowerFrom: lstAnswer[0],
      flowerTo: lstAnswer[1],
      relation: lstAnswer[2],
      anniversary: lstAnswer[3],
      anvDate: lstAnswer[4],
      history: lstAnswer[5]
    }
    
    var postUrl = `${BACK_SWAGGER_URL}/flowers/text`
    try {
    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postFormat),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
    } 
    catch (error) 
    {
      console.error('POST 요청 실패:', error);
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
      <Animated.View style={[styles.circle, { transform: [{ translateY: bounceAnim }] }]}>
        <Image
          source={require("./../assets/flowers/1.png")}
          style={styles.characterImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 입력란 */}
      <View style={styles.inputWrapper}>
        {showUpload && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
            <Text style={styles.buttonText}>사진과 음성을 올려주세요.</Text>
          </TouchableOpacity>
        )}
        {!showUpload && (
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

      {/* 버튼 */}
      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    padding: 20,
    justifyContent: "center",
  },
  speechBubble: {
    backgroundColor: "#F8F8F8",
    padding: 15,
    borderRadius: 15,
    maxWidth: "90%",
    position: "relative",
    marginBottom: 15,
  },
  speechTail: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#F8F8F8",
  },
  questionText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    color: "#333",
  },
  circle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#F0F0F0",
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  characterImage: {
    width: "100%",
    height: "100%",
  },
  inputWrapper: {
    width: "100%",
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    minHeight: 40,
  },
  button: {
    backgroundColor: "#CFFFE0",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  uploadButton: {
  backgroundColor: "#CFFFE0",
  paddingVertical: 12,
  paddingHorizontal: 40,
  borderRadius: 25,
  marginBottom: 20,  // 버튼 아래 여백
  justifyContent: "center",
  alignItems: "center",
},
});
