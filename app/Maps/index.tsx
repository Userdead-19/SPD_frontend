import React, { useState, useEffect } from "react";
import { StyleSheet, View, Dimensions, ActivityIndicator } from "react-native";
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
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true); // State for loading spinner

  // Parse the coordinates if provided
  const parsedFromLocation =
    typeof from_location === "string"
      ? from_location.split(",").map(Number)
      : null;

  const parsedToLocation =
    typeof to_location === "string" ? to_location.split(",").map(Number) : null;

  const destination = {
    latitude: parsedToLocation ? parsedToLocation[0] : 0,
    longitude: parsedToLocation ? parsedToLocation[1] : 0,
  };

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.error("Permission to access location was denied");
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error("Error fetching location:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Determine the origin (either from location or current location)
  const origin = parsedFromLocation
    ? {
        latitude: parsedFromLocation[0],
        longitude: parsedFromLocation[1],
      }
    : currentLocation;

  // Show loading spinner if the location is being fetched
  if (loading || !origin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
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
        {parsedFromLocation && (
          <Marker
            coordinate={{
              latitude: parsedFromLocation[0],
              longitude: parsedFromLocation[1],
            }}
            title="From Location"
          />
        )}
        {parsedToLocation && (
          <Marker coordinate={destination} title="Destination" />
        )}
        {parsedToLocation && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={3}
            strokeColor="hotpink"
          />
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
