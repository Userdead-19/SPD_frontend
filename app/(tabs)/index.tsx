import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button } from "react-native-paper";
import axios from "axios";
import { router } from "expo-router";

function extractPatientID(query: string) {
  // Define the regular expression to match "Patient ID:" followed by the ID
  const regex = /Patient ID:\s*(\d+)/i;

  // Execute the regex on the input query
  const match = regex.exec(query);

  // Check if a match was found and return the patient ID
  if (match && match[1]) {
    return match[1];
  } else {
    return null; // Return null if no match is found
  }
}

const SmartAssistantScreen = () => {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    []
  );
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (input.trim() === "") return;

    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);

    setInput("");

    try {
      if (!input.includes("Patient ID:")) {
        const response = await axios.post(
          "https://medisynth-backend.onrender.com/patients/ask_general",
          {
            query: input,
          }
        );
        const botMessage = { sender: "bot", text: response.data.answer };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } else {
        const extractingID = await extractPatientID(input);
        if (extractingID) {
          axios
            .post(
              `https://medisynth-backend.onrender.com/patients/ask_patient_specific/${extractingID}`,
              {
                query: input,
              }
            )
            .then((response) => {
              const botMessage = { sender: "bot", text: response.data.answer };
              setMessages((prevMessages) => [...prevMessages, botMessage]);
            })
            .catch((error) => {
              const botMessage = {
                sender: "bot",
                text: "Sorry, something went wrong.",
              };
              setMessages((prevMessages) => [...prevMessages, botMessage]);
            });
        }
      }
    } catch (error) {
      const botMessage = {
        sender: "bot",
        text: "Sorry, something went wrong.",
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === "user" ? styles.userMessage : styles.botMessage,
      ]}
    >
      <Text>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatContainer}
        style={styles.chatList}
      />
      <Button
        onPress={() => {
          router.push("/Maps");
        }}
        mode="outlined"
      >
        Maps
      </Button>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
        />
        <Button onPress={handleSend}>Send</Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    flexGrow: 1,
    justifyContent: "flex-end",
    padding: 10,
  },
  chatList: {
    flex: 1,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#EAEAEA",
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
});

export default SmartAssistantScreen;
