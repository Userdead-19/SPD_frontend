import React from "react";
import { ThemeProvider } from "@/util/ThemeContext"; // Adjust the import based on your structure
import { Stack } from "expo-router";

const App = () => {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
};

export default App;
