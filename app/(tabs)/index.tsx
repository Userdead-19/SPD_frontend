import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Button } from "react-native-paper";
import axios from "axios";
import { router } from "expo-router";
import HTMLView from "react-native-htmlview";
import * as Location from "expo-location";

const SmartAssistantScreen = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setOrigin({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const handleSend = async () => {
    if (input.trim() === "" || !origin) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        `https://spd-backend-jdg9.onrender.com/maps`,
        {
          command: input,
          currentLocation: origin, // Use the origin state for current location
        }
      );

      const botMessage = {
        sender: "bot",
        text: response?.data.answer,
        from: response?.data.from,
        to: response?.data.coordinates,
        directions: response?.data.directions,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      const botMessage = {
        sender: "bot",
        text: "Sorry, something went wrong.",
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } finally {
      setLoading(false);
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
      {item.sender === "bot" && (
        <View>
          <Text>
            From: {item.from?.latitude}, {item.from?.longitude}
          </Text>
          <Text>To: {JSON.stringify(item.to)}</Text>

          {item.directions && item.directions.length > 0 && (
            <View>
              <Text style={styles.directionsHeader}>Directions:</Text>
              {item.directions.map((direction: any, index: number) => (
                <HTMLView
                  key={index}
                  value={`<p>• ${direction.instructions} (${direction.distance}, ${direction.duration})</p>`}
                  stylesheet={styles}
                />
              ))}
            </View>
          )}

          <Button
            mode="contained"
            onPress={() => {
              router.push({
                pathname: "/Maps",
                params: {
                  from_location: [item.from?.latitude, item.from?.longitude],
                  to_location: [item.to?.latitude, item.to?.longitude],
                },
              });
            }}
          >
            View on Maps
          </Button>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatContainer}
        style={styles.chatList}
      />
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
  directionsHeader: {
    fontWeight: "bold",
    marginTop: 10,
  },
  p: {
    marginVertical: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
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
