import React, { useState, useEffect } from "react";
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
import { Button, IconButton } from "react-native-paper";
import axios from "axios";
import { router } from "expo-router";
import HTMLView from "react-native-htmlview";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

const SmartAssistantScreen = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // For general loading
  const [transcribing, setTranscribing] = useState(false); // For transcription-specific loading
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

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

  // Function to start recording
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

  const handleSend = async () => {
    if (input.trim() === "" || !origin) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true); // Start general loading

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
      setLoading(false); // Stop general loading
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
      {(loading || transcribing) && ( // Show ActivityIndicator during loading or transcribing
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
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
        <IconButton
          icon="microphone"
          size={24}
          onPress={() => setModalVisible(true)}
        />
        <Button onPress={handleSend}>Send</Button>
      </View>

      {/* Modal for recording audio */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text>{isRecording ? "Recording..." : "Tap to start recording"}</Text>
          <Button
            onPress={isRecording ? stopRecordingAndTranscribe : startRecording}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
          <Button onPress={() => setModalVisible(false)}>Cancel</Button>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    zIndex: 10,
    transform: [{ translateX: -25 }, { translateY: -25 }],
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
  modalView: {
    marginTop: "auto",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default SmartAssistantScreen;
