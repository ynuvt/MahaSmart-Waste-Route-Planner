import React, { useEffect, useState } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { StyleSheet, View, Alert, Image, Text } from 'react-native';
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
        coords: { latitude: 18.521548241377797, longitude: 73.83056191192142 },
        defaultFillPercentage: 0,
      },
      bin2: {
        channelId: '2785994',
        apiKey: 'PNCD7WP8JE9C24U5',
        coords: { latitude: 18.52135837966849, longitude: 73.83057286168507 },
        defaultFillPercentage: 0,
      },
      bin3: {
        channelId: '2786000',
        apiKey: 'XYZAPIKEY3',
        coords: { latitude: 18.52087841093805, longitude:73.83053936150888 },
        defaultFillPercentage: 0,
      },
      bin4: {
        channelId: '2786001',
        apiKey: 'XYZAPIKEY4',
        coords: { latitude: 18.520343805278102, longitude: 73.83052384465336 },
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

  const calculateShortestRoute = () => {
    if (!userLocation || !binData.length) return;

    const sortedBins = [...binData].sort((a, b) => b.fillLevel - a.fillLevel);
    const route = [userLocation, ...sortedBins.map((bin) => bin.coords)];
    setShortestRoute(route);
  };

  useEffect(() => {
    // Initial fetch
    fetchUserLocation();
    fetchBinData();

    // Set up interval to fetch bin data every 5 seconds
    const intervalId = setInterval(() => {
      fetchBinData();
    }, 5000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
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
          <Polyline
            coordinates={shortestRoute}
            strokeColor="blue"
            strokeWidth={4}
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
