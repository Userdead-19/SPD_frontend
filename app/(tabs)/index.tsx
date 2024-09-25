import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Button, IconButton, useTheme, Appbar } from "react-native-paper";
import axios from "axios";
import { router } from "expo-router";
import HTMLView from "react-native-htmlview";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SmartAssistantScreen = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false); // State to manage theme
  const FlatListref = useRef<FlatList<any>>(null);

  const { colors } = useTheme(); // Hook for theme colors

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

      // Load stored messages from AsyncStorage
      const storedMessages = await AsyncStorage.getItem("chatHistory");
      console.log("Stored messages:", storedMessages);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
      FlatListref.current?.scrollToEnd({ animated: true });
    })();
  }, []);

  const saveMessagesToStorage = async (newMessages: any[]) => {
    try {
      await AsyncStorage.setItem("chatHistory", JSON.stringify(newMessages));
    } catch (error) {
      console.error("Error saving messages to storage:", error);
    }
  };

  const handleSend = async () => {
    if (input.trim() === "" || !origin) return;

    const userMessage = { sender: "user", text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Save user message to storage
    saveMessagesToStorage(newMessages);

    try {
      const response = await axios.post(
        `https://spd-backend-jdg9.onrender.com/maps`,
        {
          command: input,
          currentLocation: origin,
        }
      );

      const botMessage = {
        sender: "bot",
        text: response?.data.answer,
        from: response?.data.from,
        to: response?.data.to,
        locationData: response?.data.location_data,
        directions: response?.data.directions,
      };

      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      // Save bot response to storage
      saveMessagesToStorage(updatedMessages);
    } catch (error) {
      const botMessage = {
        sender: "bot",
        text: "Sorry, something went wrong.",
      };
      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      // Save error response to storage
      saveMessagesToStorage(updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HighQuality
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  // Function to stop recording and transcribe audio
  async function stopRecordingAndTranscribe() {
    setIsRecording(false);
    await recording?.stopAndUnloadAsync();

    const uri = recording?.getURI();
    setModalVisible(false);

    if (uri) {
      setTranscribing(true); // Set transcribing to true before starting the transcription process
      try {
        const response = await FileSystem.uploadAsync(
          "https://spd-backend-jdg9.onrender.com/transcribe", // Replace with your backend URL
          uri,
          {
            fieldName: "file",
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            headers: {
              Accept: "application/json",
            },
          }
        );

        const responseData = JSON.parse(response.body);
        if (responseData.text) {
          setInput(responseData.text); // Set transcription to input field for modification
        } else {
          console.error("Transcription not found in response");
        }
      } catch (error) {
        console.error("Error uploading audio:", error);
      } finally {
        setTranscribing(false); // Ensure transcribing is set to false after completion
      }
    } else {
      console.error("File URI is null or undefined");
      setTranscribing(false);
    }

    setRecording(null);
  }

  useEffect(() => {
    FlatListref.current?.scrollToEnd({ animated: true });
  }, [messages]);

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

          {/* Show location details if available */}
          {item.locationData && (
            <View>
              <Text>Location Info:</Text>
              <Text>Block: {item.locationData?.location.block_name}</Text>
              <Text>
                Department: {item.locationData?.location.department_name}
              </Text>
              <Text>Floor: {item.locationData?.location.floor}</Text>
              <Text>Landmark: {item.locationData?.location.landmark}</Text>
              <Text>Room No: {item.locationData?.location.room_no}</Text>
            </View>
          )}

          {/* Display directions if available */}
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
                  to_location: [
                    item.locationData?.coordinates.latitude,
                    item.locationData?.coordinates.longitude,
                  ],
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

  // Function to toggle theme
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  return (
    <>
      <Appbar.Header
        style={{ backgroundColor: isDarkTheme ? "#212121" : "#FFFFFF" }}
      >
        <Appbar.Content
          title="Smart Assistant"
          color={isDarkTheme ? "#ffffff" : "#212121"}
        />

        {/* Theme Toggle Button */}
        <Appbar.Action
          icon={isDarkTheme ? "brightness-7" : "brightness-2"}
          onPress={toggleTheme}
        />
        <Appbar.Action icon="map" onPress={() => router.push("/Maps")} />
        <Appbar.Action
          icon="history"
          onPress={() => router.push("/HistoryScreen")}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: isDarkTheme ? "#333" : "#fff" },
        ]} // Dynamic background based on theme
      >
        {(loading || transcribing) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        <FlatList
          data={messages}
          ref={FlatListref}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            FlatListref.current?.scrollToEnd({ animated: true })
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkTheme ? "#444" : "#f0f0f0",
                color: isDarkTheme ? "#fff" : "#000",
              },
            ]}
            placeholder="Type your message"
            placeholderTextColor={isDarkTheme ? "#aaa" : "#555"}
            value={input}
            onChangeText={(text) => setInput(text)}
          />
          <Button mode="contained" onPress={handleSend}>
            Send
          </Button>
          <IconButton
            icon="microphone"
            iconColor={isDarkTheme ? "white" : "black"}
            onPress={() => setModalVisible(true)}
          />
        </View>

        <Modal visible={modalVisible} animationType="slide">
          <View style={styles.modalContainer}>
            {isRecording ? (
              <IconButton
                icon="stop"
                onPress={stopRecordingAndTranscribe}
                size={60}
              />
            ) : (
              <IconButton
                icon="microphone"
                onPress={startRecording}
                size={60}
                iconColor={isDarkTheme ? "#ffffff" : "#000"}
              />
            )}
            <Button onPress={() => setModalVisible(false)}>Close</Button>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    zIndex: 1,
    top: "40%",
    left: "50%",
  },
  messageList: {
    paddingVertical: 20,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 10,
    margin: 5,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#cce5ff",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
  },
  directionsHeader: {
    fontWeight: "bold",
    paddingVertical: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 2,
  },
  input: {
    flex: 1,
    minWidth: "55%",
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SmartAssistantScreen;
