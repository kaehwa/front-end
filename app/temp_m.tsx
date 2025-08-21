import { View, TextInput, Text, StyleSheet } from "react-native";

export default function QuestionUI({ question, placeholder, answer, setAnswer }) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={answer}
        onChangeText={setAnswer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  question: { fontSize: 16, fontWeight: "500", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
});
