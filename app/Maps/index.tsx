import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

const MapScreen = () => {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [routeSteps, setRouteSteps] = useState([]);  // To store the directions
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number; }[]>([]);  // To store route coordinates

  // Fetch user's location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
    })();
  }, []);

  // Fetch directions from Google Routes API
  const getDirections = async (startLoc: string, destinationLoc: string) => {
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc}&destination=${destinationLoc}&key=YOUR_GOOGLE_MAPS_API_KEY`
      );
      const respJson = await resp.json();
      
      const steps = respJson.routes[0].legs[0].steps;
      setRouteSteps(steps);  // Store steps for voice instructions

      // Decode the route polyline
      const points = decodePolyline(respJson.routes[0].overview_polyline.points);
      const coords = points.map(point => ({
        latitude: point[0],
        longitude: point[1],
      }));
      setRouteCoordinates(coords);
    } catch (error) {
      console.log('Error fetching directions:', error);
    }
  };

  // Decode polyline from Google API
  const decodePolyline = (encoded: string) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  };

  // Function to speak directions
  const speakDirections = (instruction: string) => {
    Speech.speak(instruction);
  };

  // Watch for location changes and trigger voice directions
  useEffect(() => {
    if (!routeSteps.length || !location) return;

    const watchIdPromise = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,  // Check location every 10 meters
      },
      (newLocation) => {
        const { latitude, longitude } = newLocation.coords;

        // Loop through each step in the route
        routeSteps.forEach((step: { end_location: { lat: number; lng: number }; html_instructions: string }, index) => {
          const { end_location, html_instructions } = step;

          // Calculate distance from current location to step's end location
          const distance = getDistanceFromLatLonInMeters(
            latitude, longitude, end_location.lat, end_location.lng
          );

          // Trigger voice instructions when close to the turn (e.g., 50 meters)
          if (distance < 50) {
            speakDirections(stripHtml(html_instructions));  // Strip HTML tags
            routeSteps.splice(index, 1);  // Remove spoken step to avoid repeat
          }
        });
      }
    );

    watchIdPromise.then(watchId => {
      return () => watchId && watchId.remove();  // Cleanup watcher on component unmount
    });
  }, [routeSteps, location]);

  // Utility: Calculate distance between two coordinates (in meters)
  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;  // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;  // Distance in meters
  };

  // Utility: Strip HTML tags from Google instructions
  const stripHtml = (html: string) => {
    return html.replace(/<\/?[^>]+(>|$)/g, "");
  };

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="Your Location"
          />
          <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="blue" />
        </MapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default MapScreen;
