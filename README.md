# MahaSmart Waste Route Planner

A web dashboard for smart waste management, developed for the Government of Maharashtra. The application displays real-time trash bin levels, simulates IoT depth sensors, and dynamically computes optimized collection routes for waste dispatch trucks, prioritizing bins with higher fill levels.

## Key Features

* **Dynamic Prioritized Routing**: Analyzes the fill levels of target dustbins and computes the routing sequence. It guarantees that the bin with the highest fill percentage is visited first.
* **Interactive Map Replotting**: Drag-and-drop dustbin markers anywhere directly on the map to replot collection points.
* **5KM Geofencing Radius**: Visualizes a 5 km boundary around the central depot station. Markers dragged outside the 5 km limit are snapped back to prevent collection delays.
* **Flexible Routing Profiles**:
  * **Walking (Bypass One-Ways)**: Bypasses vehicular one-way restrictions, calculating direct street-level routes.
  * **Direct (Straight Lines)**: Renders direct paths between collection points instantly, bypassing the road network entirely.
  * **Driving (Optimize Fleet)**: Computes routes complying with strict vehicular driving rules.
* **IoT Sensor Simulation**: Sidebar sliders simulate real-time depth measurements. Checking fill levels dynamically changes priority categories (High, Medium, Low) and marker scales.
* **100% Free Resources**: Uses Leaflet (OpenStreetMap) and OSRM (Open Source Routing Machine) to offer mapping and routing features out-of-the-box without requiring API keys, registration, or credit cards.
* **Performance-Driven Bundle**: Migrated to Vite for hot module replacement (HMR) and optimized build times.

## Tech Stack

* **Frontend Framework**: React 18
* **Build Tooling**: Vite 8
* **Styling**: Tailwind CSS & Vanilla CSS
* **Mapping**: Leaflet & React Leaflet (OpenStreetMap)
* **Routing Services**: OSRM (Open Source Routing Machine)
* **HTTP Client**: Axios

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (version 18 or above recommended).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/smart-waste-management.git
   cd smart-waste-management/waste
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

### Running Locally

To start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Building for Production

To create an optimized production build:
```bash
npm run build
```
The compiled output will be generated in the `dist` directory.

## License

This project is licensed under the MIT License.
