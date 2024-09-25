import React, { useState, useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { useGlobalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_APIKEY = "AIzaSyDbrZgv56l76sSmJPzO8wTweIMXRuEPszQ"; // Replace with your API key

export default function App() {
  const { from_location, to_location } = useGlobalSearchParams(); // Extract parameters

  // Parse the coordinates
  const parsedFromLocation =
    typeof from_location === "string"
      ? from_location.split(",").map(Number)
      : [0, 0];

  const parsedToLocation =
    typeof to_location === "string"
      ? to_location.split(",").map(Number)
      : [0, 0];

  const destination = {
    latitude: parsedToLocation[0],
    longitude: parsedToLocation[1],
  };

  const origin = {
    latitude: parsedFromLocation[0],
    longitude: parsedFromLocation[1],
  };

  if (!origin) {
    return null; // You can show a loading spinner here
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
      >
        <Marker coordinate={origin} title="Current Location" />
        <Marker
          coordinate={{
            latitude: parsedFromLocation[0],
            longitude: parsedFromLocation[1],
          }}
          title="From Location"
        />
        <Marker coordinate={destination} title="Destination" />
        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={GOOGLE_MAPS_APIKEY}
          strokeWidth={3}
          strokeColor="hotpink"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
