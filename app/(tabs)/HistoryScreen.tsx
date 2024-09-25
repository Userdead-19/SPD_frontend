import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import { useGlobalSearchParams } from "expo-router";
import HTMLView from "react-native-htmlview";
import { Button } from "react-native-paper";

const ChatHistoryScreen = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const storedMessages = await AsyncStorage.getItem("chatHistory");
        if (storedMessages) {
          setMessages(JSON.parse(storedMessages));
        }
      } catch (error) {
        console.error("Error loading messages from storage:", error);
      } finally {
        setLoading(false);
      }
    };
    navigation.setOptions({
      headerTitle: "Chat History",
    });
    fetchMessages();
  }, []);

  const clearChatHistory = async () => {
    await AsyncStorage.removeItem("chatHistory");
    setMessages([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.messageContainer]}>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
      />
      <Button onPress={clearChatHistory} mode="elevated">
        Clear Chat History
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: "#EAEAEA",
  },
  listContainer: {
    paddingBottom: 20,
  },
  directionsHeader: {
    fontWeight: "bold",
    marginTop: 10,
  },
});

export default ChatHistoryScreen;
