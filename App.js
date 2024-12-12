import React, { useEffect, useState, useCallback } from 'react';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { StyleSheet, View, Alert, Image } from 'react-native';
import trashIcon from './assets/trash-icon.png';
import markerIcon from './assets/marker-icon.png';

const RouteMap = () => {
  const [binData, setBinData] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const dustbinHeight = 27.5;

  // Define default locations
  const locations = {
    A: { name: 'Bin 1', coords: { latitude: 18.520306274275153, longitude: 73.83052283410248 } },
    B: { name: 'Bin 2', coords: { latitude: 18.520677799296582, longitude: 73.82917117879065 } },
  };

  // Fetch bin fullness data from ThingSpeak
  const fetchBinData = useCallback(async () => {
    try {
      const channelA = await axios.get('https://api.thingspeak.com/channels/2716511/fields/1.json?api_key=XWOISLYJCFKKKHSB');
      const channelB = await axios.get('https://api.thingspeak.com/channels/2716512/fields/1.json?api_key=VXKFSDTZEJWQP3ML');

      const sensorA = parseFloat(channelA.data.feeds.slice(-1)[0].field1);
      const sensorB = parseFloat(channelB.data.feeds.slice(-1)[0].field1);

      const fillPercentageA = ((dustbinHeight - sensorA) / dustbinHeight) * 100;
      const fillPercentageB = ((dustbinHeight - sensorB) / dustbinHeight) * 100;

      setBinData({ A: fillPercentageA, B: fillPercentageB });
    } catch (error) {
      console.error('Error fetching data from ThingSpeak:', error);
    }
  }, []);

  // Get user's current location
  const fetchUserLocation = () => {
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location access is required to show the map.');
          return;
        }
        return Location.getCurrentPositionAsync({ enableHighAccuracy: true });
      })
      .then((location) => {
        if (location) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      })
      .catch((error) => {
        console.error('Error fetching user location:', error);
      });
  };

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    fetchBinData();
  }, []);

  return (
    <View style={styles.container}>
      {userLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* User Marker */}
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="This is where you are currently located."
            image={markerIcon}
          />

          {/* Bin Markers */}
          {Object.keys(locations).map((key) => (
            <Marker
              key={key}
              coordinate={locations[key].coords}
              title={locations[key].name}
              description={`Fill Level: ${binData[key]?.toFixed(2) || 0}%`}
            >
              <Image source={trashIcon} style={styles.binIcon} />
            </Marker>
          ))}
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
    flex: 1,
  },
  binIcon: {
    width: 48, // Adjust icon size
    height: 48,
  },
});

export default RouteMap;
