import React, { useEffect, useReducer, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import { router, useNavigation } from "expo-router";
import { Image } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as jwt from "jwt-decode";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type State = {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "LOGIN_REQUEST" }
  | { type: "LOGIN_SUCCESS"; payload: { name: string; id: string } }
  | { type: "LOGIN_FAILURE"; payload: string };

const initialState: State = {
  email: "",
  password: "",
  loading: false,
  error: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "LOGIN_REQUEST":
      return { ...state, loading: true, error: null };
    case "LOGIN_SUCCESS":
      return { ...state, loading: false, email: "", password: "" };
    case "LOGIN_FAILURE":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const LoginScreen = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isEmailFocused, setEmailFocused] = useState(false);
  const [isPasswordFocused, setPasswordFocused] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [loadingToken, setLoadingToken] = useState(true); // New loading state
  const navigation = useNavigation();

  const checkForToken = async () => {
    setLoadingToken(true); // Start loading
    try {
      let token = await AsyncStorage.getItem("admin-token");
      if (token) {
        const decode = jwt.jwtDecode(token);
        const validity = (decode?.exp ?? 0) * 1000 - Date.now();

        if (validity > 0) {
          router.replace("/Home");
        } else {
          await AsyncStorage.removeItem("admin-token");
          Alert.alert("Session expired", "Please login again");
        }
      } else {
        // No token found
        console.log("No token found");
      }
    } catch (error) {
      console.log("Error during token check");
      console.log(error);
    } finally {
      setLoadingToken(false); // Stop loading
    }
  };

  const checkServerStatus = async () => {
    try {
      const response = await axios.get("https://api.gms.intellx.in");
      if (response.status === 200) {
        console.log("Server is up and running");
        return true;
      }
    } catch (error) {
      console.log("Server is down");
      return false;
    }
  };

  const loadApplication = async () => {
    const serverStatus = await checkServerStatus();
    if (serverStatus) {
      await checkForToken();
    } else {
      Alert.alert("Server is down", "Please try again later", [
        {
          text: "Retry",
          onPress: () => loadApplication(),
        },
        {
          text: "Exit",
          onPress: () => BackHandler.exitApp(),
        },
      ]);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [navigation]);

  const handleLogin = async () => {
    dispatch({ type: "LOGIN_REQUEST" });
    try {
      let response = await axios.post(
        "https://spd-backend-jdg9.onrender.com/login",
        {
          username: state.email,
          password: state.password,
        }
      );
      console.log("Response:", response.data);
      await AsyncStorage.setItem("admin-token", response.data.token);
      dispatch({ type: "LOGIN_SUCCESS", payload: response.data });
      const token = await AsyncStorage.getItem("admin-token");
      console.log(token);
      router.replace("/(tabs)/Home");
    } catch (error: any) {
      let errorMessage = "Login failed. Please try again.";
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }
      dispatch({
        type: "LOGIN_FAILURE",
        payload: errorMessage,
      });
      console.log(error.response);
    }
  };

  return (
    <View style={styles.container}>
      {loadingToken ? (
        <ActivityIndicator size="large" color="#8283e9" />
      ) : (
        <>
          <View style={{ padding: 20 }}>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Please sign in to continue.</Text>
          </View>
          <Text
            style={{
              margin: 10, // Change the margin value to a valid dimension value, e.g. 10
              fontSize: 12,
              color: "#999",
              textAlign: "left",
              width: "100%",
            }}
          >
            Enter your College id,"99x901",or for staff , it is the e-mail
            prefix nmae - like "xyyz.eee"
          </Text>
          <View
            style={[
              styles.inputContainer,
              isEmailFocused && styles.inputContainerFocused,
            ]}
          >
            <MaterialCommunityIcons
              name="account-outline"
              size={20}
              color="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Register Number"
              placeholderTextColor="#999"
              value={state.email}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onChangeText={(text) =>
                dispatch({ type: "SET_EMAIL", payload: text })
              }
            />
          </View>
          <Text
            style={{
              margin: 10, // Change the margin value to a valid dimension value, e.g. 10
              fontSize: 12,
              color: "#999",
              textAlign: "left",
              width: "100%",
            }}
          >
            Enter your password. If you forgot your password,click "Forgot
            Password"
          </Text>
          <View
            style={[
              styles.inputContainer,
              isPasswordFocused && styles.inputContainerFocused,
            ]}
          >
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
              color="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={secureText}
              value={state.password}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onChangeText={(text) =>
                dispatch({ type: "SET_PASSWORD", payload: text })
              }
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <MaterialCommunityIcons
                name={secureText ? "eye" : "eye-off"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {state.loading ? (
            <ActivityIndicator size="large" color="#8283e9" />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>LOGIN</Text>
            </TouchableOpacity>
          )}
          {state.error && <Text style={styles.errorText}>{state.error}</Text>}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/Signup")}
            style={{ position: "absolute", bottom: "4%" }}
          >
            <Text style={styles.signUpText}>
              Don't have an account?
              <Text style={styles.signUpLink}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 5,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  logo: {
    width: 200, // Adjust the width as needed
    height: 200, // Adjust the height as needed
    marginBottom: "-20%",
    marginTop: "-50%", // Add some margin if needed
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    fontVariant: ["small-caps"],
    marginBottom: 5,
    marginLeft: "-40%",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    marginBottom: 20,
    marginLeft: "-40%",
  },
  scrollView: {
    flexGrow: 1,
    padding: "2%",
    backgroundColor: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "95%",
    borderColor: "#dddddd",
    borderBottomWidth: 2,
    borderRadius: 8,
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inputContainerFocused: {
    elevation: 5,
    shadowColor: "#dddddd",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    color: "#333",
    borderBlockColor: "#ddd",
  },
  forgotText: {
    color: "#ff9f00",
    fontSize: 14,
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
  errorText: {
    color: "red",
    marginTop: 10,
  },
});

export default LoginScreen;
