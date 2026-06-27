import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const stationCoords = [18.520871195563682, 73.82917654250221];

const stationIcon = L.icon({
  iconUrl: 'https://img.icons8.com/color/48/warehouse.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const truckIcon = L.icon({
  iconUrl: 'https://img.icons8.com/color/48/garbage-truck.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const binIconNormal = L.icon({
  iconUrl: 'https://img.icons8.com/color/48/recycle-bin.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const binIconFull = L.icon({
  iconUrl: 'https://img.icons8.com/color/48/recycle-bin.png',
  iconSize: [46, 46],
  iconAnchor: [23, 46],
  popupAnchor: [0, -46]
});

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const RouteMap = () => {
  const [pendingBin1Level, setPendingBin1Level] = useState(50);
  const [pendingBin2Level, setPendingBin2Level] = useState(30);
  
  const pendingBin1CoordsRef = useRef([18.520306274275153, 73.83052283410248]);
  const pendingBin2CoordsRef = useRef([18.520677799296582, 73.82917117879065]);

  const [pendingBin1Coords, setPendingBin1Coords] = useState([18.520306274275153, 73.83052283410248]);
  const [pendingBin2Coords, setPendingBin2Coords] = useState([18.520677799296582, 73.82917117879065]);

  const [pendingRoutingMode, setPendingRoutingMode] = useState('walking');

  const [activeBin1Level, setActiveBin1Level] = useState(50);
  const [activeBin2Level, setActiveBin2Level] = useState(30);
  
  const [activeBin1Coords, setActiveBin1Coords] = useState([18.520306274275153, 73.83052283410248]);
  const [activeBin2Coords, setActiveBin2Coords] = useState([18.520677799296582, 73.82917117879065]);

  const [activeRoutingMode, setActiveRoutingMode] = useState('walking');

  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [routeSequence, setRouteSequence] = useState([]);

  const fetchRoute = useCallback(async (start, b1, b2, level1, level2, mode) => {
    let points = [];
    let sequence = [];

    if (level1 >= level2) {
      points = [start, b1, b2, start];
      sequence = [
        { id: 1, name: 'MG Road Bin #102', level: level1, coords: b1 },
        { id: 2, name: 'Model Colony Bin #44', level: level2, coords: b2 }
      ];
    } else {
      points = [start, b2, b1, start];
      sequence = [
        { id: 2, name: 'Model Colony Bin #44', level: level2, coords: b2 },
        { id: 1, name: 'MG Road Bin #102', level: level1, coords: b1 }
      ];
    }

    setRouteSequence(sequence);

    if (mode === 'direct') {
      setPathCoordinates(points);
      return;
    }

    const coordsString = points.map(p => `${p[1]},${p[0]}`).join(';');
    const profile = mode === 'driving' ? 'driving' : 'foot';
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsString}?overview=full&geometries=geojson`;

    try {
      const response = await axios.get(url);
      if (response.data && response.data.routes && response.data.routes[0]) {
        const routeCoords = response.data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setPathCoordinates(routeCoords);
      } else {
        setPathCoordinates(points);
      }
    } catch (error) {
      console.error(error);
      setPathCoordinates(points);
    }
  }, []);

  const handleBinDragEnd = useCallback((binNum, e) => {
    const marker = e.target;
    if (marker != null) {
      const { lat, lng } = marker.getLatLng();
      const distance = getDistance(stationCoords[0], stationCoords[1], lat, lng);
      
      if (distance <= 5) {
        if (binNum === 1) {
          pendingBin1CoordsRef.current = [lat, lng];
          setPendingBin1Coords([lat, lng]);
        } else {
          pendingBin2CoordsRef.current = [lat, lng];
          setPendingBin2Coords([lat, lng]);
        }
      } else {
        alert("Cannot place dustbin further than 5 km from the central station!");
        const prev = binNum === 1 ? pendingBin1CoordsRef.current : pendingBin2CoordsRef.current;
        marker.setLatLng(prev);
      }
    }
  }, []);

  const eventHandlersBin1 = useMemo(() => ({
    dragend(e) {
      handleBinDragEnd(1, e);
    }
  }), [handleBinDragEnd]);

  const eventHandlersBin2 = useMemo(() => ({
    dragend(e) {
      handleBinDragEnd(2, e);
    }
  }), [handleBinDragEnd]);

  const handleRecalculate = () => {
    setActiveBin1Level(pendingBin1Level);
    setActiveBin2Level(pendingBin2Level);
    setActiveBin1Coords(pendingBin1CoordsRef.current);
    setActiveBin2Coords(pendingBin2CoordsRef.current);
    setActiveRoutingMode(pendingRoutingMode);
  };

  useEffect(() => {
    fetchRoute(stationCoords, activeBin1Coords, activeBin2Coords, activeBin1Level, activeBin2Level, activeRoutingMode);
  }, [activeBin1Coords, activeBin2Coords, activeBin1Level, activeBin2Level, activeRoutingMode, fetchRoute]);

  return (
    <div className="flex-grow flex h-full w-full overflow-hidden">
      <aside className="hidden lg:flex flex-col h-full py-stack-md bg-surface-container-low border-r border-outline-variant shadow-md w-72 z-50 transition-all duration-150 ease-in-out shrink-0">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            </div>
            <div>
              <h1 className="text-label-md font-label-md font-bold text-primary">Waste Management</h1>
              <p className="text-body-sm opacity-70">Govt. of Maharashtra</p>
            </div>
          </div>
        </div>
        <nav className="flex-grow space-y-1">
          <a className="flex items-center gap-4 px-6 py-3 bg-primary-container text-on-primary-container rounded-lg mx-2 transition-colors" href="#">
            <span className="material-symbols-outlined">route</span>
            <span className="text-label-md font-label-md">Route Planner</span>
          </a>
          <a className="flex items-center gap-4 px-6 py-3 text-on-surface-variant hover:bg-surface-container-high mx-2 rounded-lg transition-colors" href="#">
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="text-label-md font-label-md">Fleet Tracking</span>
          </a>
          <a className="flex items-center gap-4 px-6 py-3 text-on-surface-variant hover:bg-surface-container-high mx-2 rounded-lg transition-colors" href="#">
            <span className="material-symbols-outlined">delete</span>
            <span className="text-label-md font-label-md">Bin Status</span>
          </a>
          <a className="flex items-center gap-4 px-6 py-3 text-on-surface-variant hover:bg-surface-container-high mx-2 rounded-lg transition-colors" href="#">
            <span className="material-symbols-outlined">eco</span>
            <span className="text-label-md font-label-md">Sustainability</span>
          </a>
          <a className="flex items-center gap-4 px-6 py-3 text-on-surface-variant hover:bg-surface-container-high mx-2 rounded-lg transition-colors" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-label-md font-label-md">Analytics</span>
          </a>
        </nav>
        <div className="px-4 mt-auto">
          <button className="w-full py-3 bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">report_problem</span>
            Report Issue
          </button>
          <div className="mt-6 pt-6 border-t border-outline-variant space-y-1">
            <a className="flex items-center gap-4 px-6 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors" href="#">
              <span className="material-symbols-outlined">settings</span>
              <span className="text-label-md font-label-md">Settings</span>
            </a>
            <a className="flex items-center gap-4 px-6 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors" href="#">
              <span className="material-symbols-outlined">help</span>
              <span className="text-label-md font-label-md">Support</span>
            </a>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative h-full overflow-hidden">
        <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant shadow-sm h-20 flex items-center px-6 shrink-0">
          <div className="flex justify-between items-center w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-on-surface">
                <span class="material-symbols-outlined">menu</span>
              </button>
              <h2 className="text-headline-sm font-headline-sm font-bold text-primary">MahaSmart Waste</h2>
            </div>
            <div className="flex items-center gap-gutter">
              <nav className="hidden md:flex gap-6 items-center">
                <a className="text-primary border-b-2 border-primary pb-1 font-label-md" href="#">Home</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md" href="#">Services</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md" href="#">Dashboard</a>
                <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md" href="#">Grievances</a>
              </nav>
              <div className="flex items-center gap-4 pl-6 border-l border-outline-variant">
                <button className="text-primary font-label-md hover:bg-surface-container-low px-3 py-1 rounded transition-colors">Marathi</button>
                <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">accessibility_new</span>
                <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">contrast</span>
                <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border border-outline">
                  <img className="w-full h-full object-cover" alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi8enYB4zMN538jobNN5nmrm_RCntK3qpf3St7SrTrQNMzjsepsygoaCx0Bhqu7BHtAHKTyHEIeqscqJYGG-Mbr19LxfWRes_Q3RCSm3xm_2jrs-Gs3MRa7XE5cZuZeaunfK_eX0iShoT5-Kazj2A6MRYSXtZcf32ZGCssqouZR4jDH6zAjnjDxUCmElC6nIKLz66PwDLQvnfRV2sHoxhtznbY5P5iU2q4RXySOyoH2E_KMQvpShZFM-Id2zw8FVaqF5s7ygEPD4Y" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
          <div className="flex-grow relative bg-[#111827] h-full w-full z-0">
            <MapContainer center={stationCoords} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <MapInvalidator />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              <Circle
                center={stationCoords}
                radius={5000}
                pathOptions={{
                  color: '#002869',
                  fillColor: '#002869',
                  fillOpacity: 0.05,
                  dashArray: '5, 10'
                }}
              />

              <Marker position={stationCoords} icon={stationIcon}>
                <Popup>
                  <strong>Central Depot Station</strong>
                  <br />
                  Truck Origin & Dispatch Hub
                </Popup>
              </Marker>

              <Marker position={stationCoords} icon={truckIcon}>
                <Popup>
                  <strong>Waste Collection Truck</strong>
                  <br />
                  Status: At Depot
                </Popup>
              </Marker>

              <Marker
                position={pendingBin1Coords}
                icon={pendingBin1Level > 70 ? binIconFull : binIconNormal}
                draggable={true}
                eventHandlers={eventHandlersBin1}
              >
                <Popup>
                  <strong>MG Road Bin #102 (Draggable)</strong>
                  <br />
                  Pending Fill Level: {pendingBin1Level}%
                </Popup>
              </Marker>

              <Marker
                position={pendingBin2Coords}
                icon={pendingBin2Level > 70 ? binIconFull : binIconNormal}
                draggable={true}
                eventHandlers={eventHandlersBin2}
              >
                <Popup>
                  <strong>Model Colony Bin #44 (Draggable)</strong>
                  <br />
                  Pending Fill Level: {pendingBin2Level}%
                </Popup>
              </Marker>

              {pathCoordinates.length > 0 && (
                <Polyline positions={pathCoordinates} color="#345baf" weight={6} opacity={0.8} dashArray="10 5" className="map-glow-path" />
              )}
            </MapContainer>
          </div>

          <aside className="w-full md:w-96 bg-surface p-6 border-l border-outline-variant overflow-y-auto z-20 h-full flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="text-headline-sm font-headline-sm text-primary">Waste Route Planner</h3>
                <p className="text-body-sm font-bold text-secondary">कचरा मार्ग नियोजन</p>
              </div>
              <span className="material-symbols-outlined text-outline">tune</span>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm mb-6 shrink-0">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant text-[12px] font-bold px-3 py-1 rounded-full">OPERATIONAL</span>
                <span className="text-[12px] text-outline">ID: MH-DP-09</span>
              </div>
              <p className="text-body-md font-bold mb-1">Central Depot Station</p>
              <div className="flex gap-2 text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span>{stationCoords[0].toFixed(5)}, {stationCoords[1].toFixed(5)}</span>
              </div>
            </div>

            <div className="space-y-6 mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
                <h4 className="text-label-md font-bold">Simulated IoT Sensors</h4>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-body-sm">Bin 1 Fill Level</span>
                  <span className={`text-[12px] px-2 py-0.5 rounded ${pendingBin1Level > 70 ? 'bg-error-container text-on-error-container font-bold' : pendingBin1Level > 40 ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>
                    {pendingBin1Level.toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pendingBin1Level}
                  onChange={(e) => setPendingBin1Level(parseFloat(e.target.value))}
                  className="w-full h-2 bg-outline-variant rounded-lg appearance-none cursor-pointer custom-slider"
                />
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-body-sm">Bin 2 Fill Level</span>
                  <span className={`text-[12px] px-2 py-0.5 rounded ${pendingBin2Level > 70 ? 'bg-error-container text-on-error-container font-bold' : pendingBin2Level > 40 ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>
                    {pendingBin2Level.toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pendingBin2Level}
                  onChange={(e) => setPendingBin2Level(parseFloat(e.target.value))}
                  className="w-full h-2 bg-outline-variant rounded-lg appearance-none cursor-pointer custom-slider"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-label-md font-bold mb-3">Routing Mode</label>
              <div className="relative">
                <select
                  value={pendingRoutingMode}
                  onChange={(e) => setPendingRoutingMode(e.target.value)}
                  className="w-full p-3 bg-surface border border-outline rounded-lg text-body-md focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="walking">Walking (Bypass One-Ways)</option>
                  <option value="direct">Direct (Straight Lines)</option>
                  <option value="driving">Driving (Optimize Fleet)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none">expand_more</span>
              </div>
            </div>

            <button onClick={handleRecalculate} className="w-full py-4 bg-primary text-on-primary font-label-md rounded-xl shadow-lg hover:bg-opacity-90 active:scale-95 transition-all mb-6 shrink-0">
              Update Dispatch Route
            </button>

            <div className="flex-grow overflow-y-auto">
              <h4 className="text-label-md font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">alt_route</span>
                Optimized Dispatch Route
              </h4>
              <div className="space-y-3 relative before:content-[''] before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-0.5 before:bg-outline-variant">
                <div className="flex items-center gap-4 pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 bg-primary rounded-full border-4 border-surface z-10"></div>
                  <div className="flex-grow">
                    <p className="text-body-sm font-bold">Start: Central Depot</p>
                    <p className="text-[12px] text-outline">ETD: 09:00 AM</p>
                  </div>
                </div>
                {routeSequence.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4 pl-8 relative">
                    <div className={`absolute left-0 w-6 h-6 rounded-full border-4 border-surface z-10 ${step.level > 70 ? 'bg-error animate-pulse' : 'bg-outline-variant'}`}></div>
                    <div className="flex-grow">
                      <p className="text-body-sm font-bold">Checkpoint {index + 1}: {step.name}</p>
                      <p className={`text-[12px] ${step.level > 70 ? 'text-error font-bold' : 'text-outline'}`}>
                        Priority: {step.level > 70 ? 'High' : step.level > 40 ? 'Medium' : 'Low'} ({step.level.toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pl-8 relative">
                  <div className="absolute left-0 w-6 h-6 bg-secondary-fixed-dim rounded-full border-4 border-surface z-10"></div>
                  <div className="flex-grow">
                    <p className="text-body-sm font-bold">End: Return to Depot</p>
                    <p className="text-[12px] text-outline">ETA: 11:45 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="w-full py-4 px-6 bg-primary border-t-4 border-secondary flex flex-col md:flex-row justify-between items-center gap-4 z-40 shrink-0">
          <p className="text-body-sm text-on-primary font-body-sm">© 2026 Government of Maharashtra. All Rights Reserved.</p>
          <div className="flex gap-4">
            <a className="text-on-primary text-label-md hover:text-secondary-fixed-dim transition-colors" href="#">Privacy Policy</a>
            <a className="text-on-primary text-label-md hover:text-secondary-fixed-dim transition-colors" href="#">Terms</a>
            <a className="text-on-primary text-label-md hover:text-secondary-fixed-dim transition-colors" href="#">Help Desk</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default RouteMap;
