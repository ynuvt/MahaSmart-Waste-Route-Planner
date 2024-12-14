import React, { useEffect, useState } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { StyleSheet, View, Alert, Image, Text } from 'react-native';
import trashIcon from './assets/trash-icon.png';
import userIcon from './assets/truck-icon.png'; // Add a user icon image

const RouteMap = () => {
  const [binData, setBinData] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [shortestRoute, setShortestRoute] = useState([]);
  const [error, setError] = useState(null);

  const locations = {
    bin1: {
      channelId: '2716511', 
      apiKey: '5D4NZPEBA6X6DNJE',
      coords: { latitude: 18.520306274275153, longitude: 73.83052283410248 },
      defaultFillPercentage: 0,
    },
    bin2: {
      channelId: '2716512',
      apiKey: 'VXKFSDTZEJWQP3ML',
      coords: { latitude: 18.520677799296582, longitude: 73.82917117879065 },
      defaultFillPercentage: 0,
    },
    bin3: {
      channelId: '2716513',
      apiKey: 'ABC123XYZ456', // Replace with the correct API key
      coords: { latitude: 18.521010, longitude: 73.828900 }, // Example coordinates
      defaultFillPercentage: 0,
    },
    bin4: {
      channelId: '2716514',
      apiKey: 'DEF789GHI012', // Replace with the correct API key
      coords: { latitude: 18.520400, longitude: 73.829800 }, // Example coordinates
      defaultFillPercentage: 0,
    },
    bin5: {
      channelId: '2716515',
      apiKey: 'JKL345MNO678', // Replace with the correct API key
      coords: { latitude: 18.519800, longitude: 73.829400 }, // Example coordinates
      defaultFillPercentage: 0,
    },
    bin6: {
      channelId: '2716516',
      apiKey: 'PQR901STU234', // Replace with the correct API key
      coords: { latitude: 18.520600, longitude: 73.831000 }, // Example coordinates
      defaultFillPercentage: 0,
    },
  };
  
  

  // Fetch fill levels from ThingSpeak API
  //corrected version
  const fetchBinData = async () => {
    try {
      const binDataPromises = Object.entries(locations).map(async ([key, binLocation]) => {
        try {
          const response = await axios.get(
            `https://api.thingspeak.com/channels/${binLocation.channelId}/fields/1.json?api_key=${binLocation.apiKey}&results=1`
          );
          
          const fillLevel = response.data.feeds.length > 0 
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
//above ends the corrected version

  // {binData.map((bin, index) => (
  //   <Marker
  //     key={index}
  //     coordinate={bin.coords}
  //     title={bin.id}
  //     description={`Fill: ${bin.fillLevel}%`}
  //   >
  //     <Image source={trashIcon} style={{ height: 40, width: 40 }} />
  //   </Marker>
  // ))}

  {Object.keys(locations).map((key, index) => {
    const bin = locations[key];
    const fillLevel = binData.find((data) => data.id === `Bin ${index + 1}`)?.fillLevel || bin.defaultFillPercentage;
    return (
      <Marker
        key={key}
        coordinate={bin.coords}
        title={`Bin ${index + 1}`}
        description={`Fill: ${fillLevel}%`}
      >
        <Image source={trashIcon} style={{ height: 40, width: 40 }} />
      </Marker>
    );
  })}
  
  // Fetch user location
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

  // Calculate the shortest route
  const calculateShortestRoute = () => {
    if (!userLocation || !binData.length) return;

    const sortedBins = [...binData].sort((a, b) => b.fillLevel - a.fillLevel); // Sort by fill level
    const route = [userLocation, ...sortedBins.map((bin) => bin.coords)];
    setShortestRoute(route);
  };

  // Fetch data and calculate route on mount
  useEffect(() => {
    fetchUserLocation();
    fetchBinData();
  }, []);

  useEffect(() => {
    calculateShortestRoute();
  }, [binData, userLocation]);

  // Loading or error UI
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
        {/* User's location marker */}
        <Marker
          coordinate={userLocation}
          title="Your Location"
        >
          <Image source={userIcon} style={{ height: 40, width: 40 }} />
        </Marker>

        {/* Bin markers */}
        {Object.keys(locations).map((key, index) => {
          const bin = locations[key];
          const fillLevel = binData.find((data) => data.id === `Bin ${index + 1}`)?.fillLevel || 0;
          return (
            <Marker
              key={key}
              coordinate={bin.coords}
              title={bin.name}
              description={`Fill: ${fillLevel}%`}
            >
              <Image source={trashIcon} style={{ height: 40, width: 40 }} />
            </Marker>
          );
        })}

        {/* Shortest route polyline */}
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
