import React, { useEffect, useState } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { StyleSheet, View, Alert, Image, Text } from 'react-native';
import MapViewDirections from 'react-native-maps-directions';
import trashIcon from './assets/trash-icon.png';
import userIcon from './assets/truck-icon.png';

const RouteMap = () => {
  const [binData, setBinData] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [shortestRoute, setShortestRoute] = useState([]);
  const [error, setError] = useState(null);

  const locations = {
    bin1: {
      channelId: '2785100',
      apiKey: '5D4NZPEBA6X6DNJE',
      coords: { latitude: 19.277817, longitude: 72.872763 },
      defaultFillPercentage: 0,
    },
  };

  const fetchBinData = async () => {
    try {
      const binDataPromises = Object.entries(locations).map(async ([key, binLocation]) => {
        try {
          const response = await axios.get(
            `https://api.thingspeak.com/channels/${binLocation.channelId}/fields/1.json?api_key=${binLocation.apiKey}&results=1`
          );

          const fillLevel =
            response.data.feeds.length > 0
              ? parseFloat(response.data.feeds[0].field1)
              : binLocation.defaultFillPercentage;

          return {
            id: `Bin ${Object.keys(locations).indexOf(key) + 1}`,
            fillLevel: fillLevel,
            coords: binLocation.coords,
          };
        } catch (err) {
          console.error(`Error fetching data for ${key}:`, err);
          return {
            id: `Bin ${Object.keys(locations).indexOf(key) + 1}`,
            fillLevel: binLocation.defaultFillPercentage,
            coords: binLocation.coords,
          };
        }
      });

      const data = await Promise.all(binDataPromises);
      setBinData(data);
    } catch (err) {
      console.error('Error in fetchBinData:', err);
      setError('Failed to fetch bin data');
    }
  };

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission not granted');
        return;
      }

      const location = await Location.getCurrentPositionAsync();
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error fetching user location:', error);
      setError('Failed to fetch user location');
    }
  };

  const calculateShortestRoute = async () => {
    if (!userLocation || !binData.length) return;
  
    let currentLocation = userLocation;
    const visitedBins = [];
    const routeCoordinates = [currentLocation];
  
    try {
      while (visitedBins.length < binData.length) {
        // Find the closest unvisited bin
        const closestBin = binData
          .filter((bin) => !visitedBins.includes(bin))
          .reduce((prev, curr) => {
            const prevDistance = getDistance(currentLocation, prev.coords);
            const currDistance = getDistance(currentLocation, curr.coords);
            return currDistance < prevDistance ? curr : prev;
          });
  
        // Fetch route from current location to the closest bin
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${closestBin.coords.latitude},${closestBin.coords.longitude}&key=AIzaSyCNwnhKXPz1ZGcueIWoscgdZAEdBxfdjtY`
        );
  
        const route = response.data.routes[0].legs[0].steps.map((step) => ({
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        }));
  
        routeCoordinates.push(...route);
        visitedBins.push(closestBin);
        currentLocation = closestBin.coords; // Update the current location
      }
  
      setShortestRoute(routeCoordinates);
    } catch (error) {
      console.error('Error calculating shortest route:', error);
    }
  };
  

  useEffect(() => {
    fetchUserLocation();
    fetchBinData();
  }, []);

  useEffect(() => {
    calculateShortestRoute();
  }, [binData, userLocation]);

  if (!userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading map...</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={userLocation}
          title="Your Location"
        >
          <Image source={userIcon} style={{ height: 40, width: 40 }} />
        </Marker>

        {binData.map((bin, index) => (
          <Marker
            key={index}
            coordinate={bin.coords}
            title={bin.id}
            description={`Fill Level: ${bin.fillLevel}%`}
          >
            <Image source={trashIcon} style={{ height: 40, width: 40 }} />
          </Marker>
        ))}

        {shortestRoute.length > 1 && (
          <MapViewDirections
          origin={shortestRoute[0]} // Starting point (user location)
          destination={shortestRoute[shortestRoute.length - 1]} // Final destination (last bin)
          waypoints={shortestRoute.slice(1, -1)} // Intermediate bins
          apikey="AIzaSyCNwnhKXPz1ZGcueIWoscgdZAEdBxfdjtY" // Replace with your Google Maps API Key
          strokeWidth={4}
          strokeColor="blue"
          optimizeWaypoints={true} // Optimize the waypoints for the shortest route
          onError={(errorMessage) => {
            console.error('Error with MapViewDirections:', errorMessage);
          }}
        />
      )}
      </MapView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
});

export default RouteMap;
