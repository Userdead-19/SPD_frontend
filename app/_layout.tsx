import React from "react";
import { ThemeProvider } from "@/util/ThemeContext";
import SmartAssistantScreen from "@/app/(tabs)/index"; // Adjust the import based on your structure
import { Stack } from "expo-router";

const App = () => {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
};

export default App;
