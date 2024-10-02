import React, { useReducer, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { router } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type State = {
  fullName: string;
  id: string;
  password: string;
  confirmPassword: string;
};

type Action =
  | { type: "SET_FULL_NAME"; payload: string }
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_CONFIRM_PASSWORD"; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_FULL_NAME":
      return { ...state, fullName: action.payload };
    case "SET_EMAIL":
      return { ...state, id: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_CONFIRM_PASSWORD":
      return { ...state, confirmPassword: action.payload };
    default:
      return state;
  }
};

const SignUpScreen = () => {
  const [state, dispatch] = useReducer(reducer, {
    fullName: "",
    id: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const validateInputs = () => {
    const { fullName, id, password, confirmPassword } = state;
    if (!id || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return false;
    }
    // Add more validation logic if needed (e.g., email format, password strength)
    return true;
  };

  const CreateNewUser = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const response = await axios.post(
        "https://spd-backend-jdg9.onrender.com/register",
        {
          username: state.id,
          password: state.password,
        }
      );
      if (response.status === 201) {
        Alert.alert(
          "Success",
          "Please Check your email for verification and login"
        );
        router.back(); // Navigate back to the previous screen
      } else {
        Alert.alert("Error", "Failed to create user.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
      console.error("Error creating user:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollView}
      enableOnAndroid={true}
      extraHeight={100}
    >
      <View style={styles.container}>
        <View
          style={{
            padding: 5,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={styles.title}>Create Account</Text>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: "#999",
            textAlign: "left",
            width: "100%",
          }}
        >
          Enter Your username
        </Text>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Register Number"
            placeholderTextColor="#999"
            value={state.id}
            onChangeText={(text) =>
              dispatch({ type: "SET_EMAIL", payload: text })
            }
          />
        </View>
        <Text
          style={{
            fontSize: 12,
            color: "#999",
            textAlign: "left",
            width: "100%",
          }}
        >
          Enter a Strong Password you will always remember, it is suggested to
          be a combination of capital letters,small letters ,numbers
        </Text>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={state.password}
            onChangeText={(text) =>
              dispatch({ type: "SET_PASSWORD", payload: text })
            }
          />
        </View>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lock-outline" size={20} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={state.confirmPassword}
            onChangeText={(text) =>
              dispatch({ type: "SET_CONFIRM_PASSWORD", payload: text })
            }
          />
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={CreateNewUser}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "SIGNING UP..." : "SIGN UP"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: "absolute",
            bottom: 0,
            marginBottom: "4%",
          }}
        >
          <Text style={styles.signUpText}>
            Already have an account?
            <Text style={styles.signUpLink}> Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
    padding: "3%",
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 5,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["small-caps"],
    marginLeft: "-30%",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderColor: "#ddd",
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    color: "#333",
  },
  button: {
    backgroundColor: "#8283e9",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: "40%",
    marginRight: "-45%",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  signUpText: {
    fontSize: 14,
    color: "#999",
  },
  signUpLink: {
    color: "#8283e9",
  },
  logo: {
    width: 200, // Adjust the width as needed
    height: 200, // Adjust the height as needed
    marginBottom: "-20%",
    marginTop: "-50%", // Add some margin if needed
  },
});

export default SignUpScreen;
