import React, { useState, useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
// import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { MapViewRoute } from "react-native-maps-routes";
const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_APIKEY = "AIzaSyDbrZgv56l76sSmJPzO8wTweIMXRuEPszQ"; // Replace with your API key

export default function App() {
  const origin = { latitude: 37.33228, longitude: -122.01098 };
  const destination = { latitude: 37.423199, longitude: -122.084068 };

  // useEffect(() => {
  //   (async () => {
  //     let { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== "granted") {
  //       console.error("Permission to access location was denied");
  //       return;
  //     }

  //     let location = await Location.getCurrentPositionAsync({});
  //     setOrigin({
  //       latitude: location.coords.latitude,
  //       longitude: location.coords.longitude,
  //     });
  //   })();
  // }, []);

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
      >
        <Marker coordinate={origin} title="Origin" />
        <Marker coordinate={destination} title="Destination" />
        <MapViewRoute
          origin={origin}
          destination={destination}
          apiKey={GOOGLE_MAPS_APIKEY}
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
