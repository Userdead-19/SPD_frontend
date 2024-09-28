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
import * as Speech from 'expo-speech';
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
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const FlatListref = useRef<FlatList<any>>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // New state for tracking speech
  const { colors } = useTheme();

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
      setTranscribing(true);
      try {
        const response = await FileSystem.uploadAsync(
          "https://spd-backend-jdg9.onrender.com/transcribe",
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
          setInput(responseData.text);
        } else {
          console.error("Transcription not found in response");
        }
      } catch (error) {
        console.error("Error uploading audio:", error);
      } finally {
        setTranscribing(false);
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
          <View style={styles.infoBox}>
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
          </View>
  
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
          <View style={styles.buttonContainer}>
  <Button
    mode="contained"
    style={styles.viewOnMapsButton}
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
    View on Map
  </Button>
  
  <Button
    mode="contained"
    style={styles.readOutButton}
    onPress={() => handleReadOut(item)}
  >
    {isSpeaking ? "Stop" : "Read Out"}
  </Button>
</View>

        </View>
      )}
    </View>
  );
  const handleReadOut = (item: any) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      let textToRead = item.text;
  
      if (item.locationData) {
        textToRead += `
          Location Info:
          Block: ${item.locationData.location.block_name},
          Department: ${item.locationData.location.department_name},
          Floor: ${item.locationData.location.floor},
          Landmark: ${item.locationData.location.landmark},
          Room No: ${item.locationData.location.room_no}.
        `;
      }
  
      if (item.directions && item.directions.length > 0) {
        const directionsText = item.directions
          .map(
            (direction: any) =>
              `• ${direction.instructions} (${direction.distance}, ${direction.duration})`
          )
          .join("\n");
        textToRead += `Directions:\n${directionsText}`;
      }
  
      Speech.speak(textToRead, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };
  
    

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
        style={[styles.container, { backgroundColor: isDarkTheme ? "#333" : "#fff" }]}
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
                padding:7,
                paddingLeft:14,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={isDarkTheme ? "#aaa" : "#888"}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
          />
          <Button mode="contained" onPress={handleSend} style={styles.sendButton}>
            Send
          </Button>
          <IconButton
            icon={isRecording ? "stop" : "microphone"}
            onPress={() => {
              isRecording ? stopRecordingAndTranscribe() : startRecording();
            }}
          />
        </View>

        {/* Modal for Audio Transcription */}
        <Modal visible={modalVisible} animationType="slide">
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Transcribing Audio...</Text>
            <ActivityIndicator size="large" color="#0000ff" />
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
    padding: 10,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff80",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding:7,
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    borderRadius: 20,

  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  readOutButton: {
    marginTop: 10,
    backgroundColor: "#51158c",
    flex:1,
  },  
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  messageList: {
    paddingBottom: 80, // Space for input area
  },
  messageContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d3d3d3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  
  userMessage: {
    backgroundColor: "#F7F4FF",
    marginLeft:20,
    marginRight:2,
    fontWeight: '900',
  },
  
  botMessage: {
    backgroundColor: "#FFFFFF",
    marginRight:16,
  },
  
  infoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
  },
  
  directionsHeader: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#51158c",
  },
  
  viewOnMapsButton: {
    flex:1,
    marginTop: 10,
    backgroundColor: "#51158c",
    marginRight: 5,
  },
  
  locationDetails: {
    marginTop: 10,
  },
  
  infoText: {
    fontSize: 14,
    color: "#555555",
    marginBottom: 3,
  },
  
  locationHeader: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#51158c",
  },
  
  mapButton: {
    marginTop: 10,
    backgroundColor: "#51158c",
  },
  sendButton:{
    backgroundColor: "#51158c",
  },
  mapButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  
  locationData: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: "row", // Align buttons side by side
    justifyContent: "space-between",
    marginTop: 10,
  },
  
});

export default SmartAssistantScreen;
