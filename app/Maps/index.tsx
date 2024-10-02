import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useGlobalSearchParams } from "expo-router";
import { useNavigation } from "expo-router";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.00922; // Closer zoom level
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_APIKEY = "AIzaSyDtIV_60HVteiogrQRSPDgVlWIRFFaiK3o";

export default function MapScreen() {
  interface Location {
    latitude: number;
    longitude: number;
  }

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [heading, setHeading] = useState<number>(0);

  const { from_location, to_location } = useGlobalSearchParams();
  const navigation = useNavigation();

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

  let mapRef: MapView | null = null;

  // Use effect for fetching location and handling heading
  useEffect(() => {
    (async () => {
      try {
        // Request location permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Permission to access location was denied"
          );
          setLoading(false);
          return;
        }

        // Get current location with a timeout
        let location = (await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Location request timed out")),
              10000
            )
          ),
        ])) as Location.LocationObject;

        if (location) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        // Watch heading changes to update camera angle
        const headingWatcher = await Location.watchHeadingAsync(
          (headingData) => {
            setHeading(headingData.trueHeading); // Set heading to true heading
          }
        );

        return () => {
          if (headingWatcher) headingWatcher.remove();
        };
      } catch (error) {
        Alert.alert(
          "Error",
          `Error fetching location: ${(error as Error).message}`
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch directions whenever currentLocation and destination are set
  useEffect(() => {
    if (currentLocation && destination.latitude && destination.longitude) {
      getDirections(
        `${currentLocation.latitude},${currentLocation.longitude}`,
        `${destination.latitude},${destination.longitude}`
      );
    }
  }, [currentLocation, destination]);
  useEffect(() => {
    navigation.setOptions({
      headerTitle: "",
    });
  }, []);

  // Function to fetch directions from Google Directions API
  const getDirections = async (startLoc: any, destinationLoc: any) => {
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc}&destination=${destinationLoc}&key=${GOOGLE_MAPS_APIKEY}`
      );
      const respJson = await resp.json();

      if (respJson.routes.length) {
        const steps = respJson.routes[0].legs[0].steps;
        setRouteSteps(steps);

        // Decode the route polyline
        const points = decodePolyline(
          respJson.routes[0].overview_polyline.points
        );
        const coords = points.map((point) => ({
          latitude: point[0],
          longitude: point[1],
        }));
        setRouteCoordinates(coords);
      } else {
        Alert.alert("No Routes Found", "Could not find any routes.");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        `Error fetching directions: ${(error as Error).message}`
      );
    }
  };

  // Update map camera when heading changes
  useEffect(() => {
    if (currentLocation && mapRef) {
      mapRef.animateCamera({
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        // Update heading with the new direction
        pitch: 90, // Adjust pitch for better 3D view
        altitude: 300,
        zoom: 20,
      });
    }
  }, [currentLocation]);

  // Utility: Decode polyline from Google API
  const decodePolyline = (encoded: string) => {
    let points: [number, number][] = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  };

  // Show loading screen if still loading
  if (loading || !currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={(ref) => (mapRef = ref)}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
        showsBuildings={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        <Marker coordinate={currentLocation} title="Current Location" />
        {destination && <Marker coordinate={destination} title="Destination" />}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor="blue"
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
