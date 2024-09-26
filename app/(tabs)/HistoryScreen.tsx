import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import HTMLView from "react-native-htmlview";
import { Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

const ChatHistoryScreen = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Check if the current item is empty or if it is the last item in the list
    if (!item.text || (index === messages.length - 1 && !item.text)) {
      return null; // Don't render anything for empty items
    }

    // Only render the first query and its response if it exists
    if (index % 2 === 0) { // Assuming that queries are at even indices and responses at odd indices
      return (
        <View style={styles.messageContainer}>
          <Text style={styles.queryText}>{item.text}</Text>
          {index + 1 < messages.length && (
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => toggleExpand(index)}
            >
              <Ionicons
                name={expandedIndex === index ? "chevron-up" : "chevron-down"}
                size={24}
                color="#1E90FF"
              />
            </TouchableOpacity>
          )}
          {expandedIndex === index && index + 1 < messages.length && (
            <View style={styles.messageDetails}>
              <Text style={styles.resultText}>{messages[index + 1].text}</Text>
              {messages[index + 1].sender === "bot" && (
                <View style={styles.locationDetails}>
                  <Text style={styles.infoText}>
                    From: {messages[index + 1].from?.latitude},{" "}
                    {messages[index + 1].from?.longitude}
                  </Text>
                  <Text style={styles.infoText}>
                    To: {JSON.stringify(messages[index + 1].to)}
                  </Text>

                  {messages[index + 1].locationData && (
                    <View style={styles.locationData}>
                      <Text style={styles.locationHeader}>Location Info:</Text>
                      <Text style={styles.infoText}>
                        Block: {messages[index + 1].locationData?.location.block_name}
                      </Text>
                      <Text style={styles.infoText}>
                        Department:{" "}
                        {messages[index + 1].locationData?.location.department_name}
                      </Text>
                      <Text style={styles.infoText}>
                        Floor: {messages[index + 1].locationData?.location.floor}
                      </Text>
                      <Text style={styles.infoText}>
                        Landmark: {messages[index + 1].locationData?.location.landmark}
                      </Text>
                      <Text style={styles.infoText}>
                        Room No: {messages[index + 1].locationData?.location.room_no}
                      </Text>
                    </View>
                  )}

                  {messages[index + 1].directions &&
                    messages[index + 1].directions.length > 0 && (
                      <View>
                        <Text style={styles.directionsHeader}>Directions:</Text>
                        {messages[index + 1].directions.map(
                          (direction: any, dirIndex: number) => (
                            <HTMLView
                              key={dirIndex}
                              value={`<p>• ${direction.instructions} (${direction.distance}, ${direction.duration})</p>`}
                              stylesheet={styles}
                            />
                          )
                        )}
                      </View>
                    )}

                  <Button
                    mode="contained"
                    onPress={() => {
                      router.push({
                        pathname: "/Maps",
                        params: {
                          from_location: [
                            messages[index + 1].from?.latitude,
                            messages[index + 1].from?.longitude,
                          ],
                          to_location: [
                            messages[index + 1].locationData?.coordinates.latitude,
                            messages[index + 1].locationData?.coordinates.longitude,
                          ],
                        },
                      });
                    }}
                    style={styles.mapButton}
                    labelStyle={styles.mapButtonText}
                  >
                    View on Maps
                  </Button>
                </View>
              )}
            </View>
          )}
        </View>
      );
    }

    // Return null for responses to ensure they are not rendered as separate items
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

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
      <Button
        onPress={clearChatHistory}
        mode="elevated"
        style={styles.clearButton}
        labelStyle={styles.clearButtonText}
      >
        Clear Chat History
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D3D3D3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  listContainer: {
    paddingBottom: 20,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 5,
  },
  queryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  messageDetails: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 10,
  },
  resultText: {
    fontSize: 16,
    color: "#1E90FF",
    fontWeight: "500",
  },
  locationDetails: {
    marginTop: 10,
  },
  locationHeader: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1E90FF",
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 3,
  },
  directionsHeader: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#1E90FF",
  },
  mapButton: {
    marginTop: 10,
    backgroundColor: "#1E90FF",
  },
  mapButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },
  clearButtonText: {
    color: "#1E90FF",
    fontWeight: "bold",
  },
  locationData: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
  },
});

export default ChatHistoryScreen;
